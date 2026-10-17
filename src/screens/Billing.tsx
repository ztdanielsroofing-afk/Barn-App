import { useMemo, useState } from 'react';
import { C, serif, money } from '../theme';
import { Card, SectionLabel, Pill, Button, Avatar, Row, Empty } from '../ui';
import { Page } from './Header';
import { useTable } from '../db';
import { supabase } from '../supabase';
import { Family, Charge, Payment, Lesson } from '../types';
import { useApp } from '../AppContext';
import { notify } from '../notify';
import { Nav } from '../App';

function balanceOf(familyId: string, charges: Charge[], payments: Payment[]) {
  const c = charges.filter(x => x.family_id === familyId).reduce((s, x) => s + Number(x.amount || 0), 0);
  const p = payments.filter(x => x.family_id === familyId).reduce((s, x) => s + Number(x.amount || 0), 0);
  return c - p;
}

export default function Billing({ nav: _nav }: { nav: Nav }) {
  const { canEditBilling } = useApp();
  const { data: families, reload: reloadF } = useTable<Family>('families', q => q.order('family_name'));
  const { data: charges, reload: reloadC } = useTable<Charge>('charges');
  const { data: payments, reload: reloadP } = useTable<Payment>('payments');
  const { data: lessons } = useTable<Lesson>('lessons');
  const [open, setOpen] = useState<Family | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  function reloadAll() { reloadF(); reloadC(); reloadP(); }

  const totalOut = useMemo(
    () => families.reduce((s, f) => s + Math.max(0, balanceOf(f.id, charges, payments)), 0),
    [families, charges, payments]
  );

  if (open) return (
    <FamilyBill
      family={open}
      charges={charges.filter(c => c.family_id === open.id)}
      payments={payments.filter(p => p.family_id === open.id)}
      onBack={() => { setOpen(null); reloadAll(); }}
      canEdit={canEditBilling}
      onChange={reloadAll}
    />
  );

  async function runMonthlyBilling() {
    setBusy(true); setMsg('');
    const monthLabel = new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    let added = 0;
    for (const f of families) {
      const posts: { label: string; amount: number }[] = [];
      if (Number(f.monthly_fee) > 0) posts.push({ label: `Monthly fee — ${monthLabel}`, amount: Number(f.monthly_fee) });
      if (Number(f.board_fee) > 0) posts.push({ label: `Board — ${monthLabel}`, amount: Number(f.board_fee) });
      let any = false;
      for (const p of posts) {
        if (!charges.some(c => c.family_id === f.id && c.label === p.label)) {
          await supabase.from('charges').insert({ barn_id: f.barn_id, family_id: f.id, label: p.label, amount: p.amount });
          added++; any = true;
        }
      }
      if (any) await notify({ barn_id: f.barn_id, family_id: f.id, kind: 'billing', title: 'New charges posted', body: 'Open My Bill to see your balance and pay.' });
    }
    // per-lesson families: bill any priced lesson not yet charged
    for (const l of lessons) {
      if (!l.family_id || !l.fee || Number(l.fee) <= 0) continue;
      const fam = families.find(f => f.id === l.family_id);
      if (fam?.billing_mode !== 'per_lesson') continue;
      if (charges.some(c => c.lesson_id === l.id)) continue;
      await supabase.from('charges').insert({
        barn_id: fam.barn_id, family_id: fam.id, lesson_id: l.id, amount: Number(l.fee),
        label: `Lesson — ${new Date(l.starts_at).toLocaleDateString()}${l.rider_name ? ` (${l.rider_name})` : ''}`,
      });
      added++;
    }
    setBusy(false);
    setMsg(added ? `Posted ${added} new charge${added > 1 ? 's' : ''}.` : 'Everything was already up to date.');
    reloadAll();
  }

  return (
    <Page>
      <div style={{ fontFamily: serif, fontSize: 27, color: C.navy, marginBottom: 4 }}>Billing</div>
      <Card style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <div>
          <div style={{ fontFamily: serif, fontSize: 26, color: totalOut > 0 ? C.red : C.green }}>{money(totalOut)}</div>
          <div style={{ fontSize: 11.5, color: C.muted2 }}>Total outstanding across {families.length} families</div>
        </div>
      </Card>

      {canEditBilling && (
        <div style={{ marginTop: 12 }}>
          <Button kind="soft" disabled={busy} onClick={runMonthlyBilling}>{busy ? 'Posting…' : 'Run billing for this month'}</Button>
          <div style={{ fontSize: 11, color: C.muted2, marginTop: 6, lineHeight: 1.4 }}>
            Posts monthly fees to monthly-billed families and per-lesson charges to per-lesson families. Safe to tap again — it skips anything already charged.
          </div>
          {msg && <div style={{ fontSize: 12, color: C.green, marginTop: 6, fontWeight: 600 }}>{msg}</div>}
        </div>
      )}

      <SectionLabel>Families</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {families.map(f => {
          const bal = balanceOf(f.id, charges, payments);
          const bits: string[] = [];
          if (Number(f.monthly_fee) > 0) bits.push(`${money(f.monthly_fee)}/mo`);
          if (Number(f.board_fee) > 0) bits.push(`board ${money(f.board_fee)}`);
          if (f.billing_mode === 'per_lesson') bits.push('per-lesson');
          return (
            <Card key={f.id} onClick={() => setOpen(f)} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Avatar init={f.family_name.slice(0, 1)} tint={C.navy} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>{f.family_name}</div>
                <div style={{ fontSize: 11, color: C.muted2 }}>{bits.join(' · ') || 'manual billing'}</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: bal > 0 ? C.red : C.green }}>{money(bal)}</div>
            </Card>
          );
        })}
        {families.length === 0 && <Empty>No families yet.</Empty>}
      </div>
    </Page>
  );
}

export function FamilyBill({ family, charges, payments, onBack, canEdit, onChange }:
  {
    family: Family; charges: Charge[]; payments: Payment[];
    onBack: () => void; canEdit: boolean; onChange: () => void;
  }) {
  const { barn } = useApp();
  const chg = charges.reduce((s, x) => s + Number(x.amount || 0), 0);
  const paid = payments.reduce((s, x) => s + Number(x.amount || 0), 0);
  const due = chg - paid;

  const pays: { label: string; color: string; href: string }[] = [];
  if (barn?.venmo) pays.push({ label: 'Venmo', color: '#3d95ce', href: `https://venmo.com/u/${barn.venmo.replace(/^@/, '')}` });
  if (barn?.cashapp) pays.push({ label: 'Cash App', color: '#00c244', href: `https://cash.app/$${barn.cashapp.replace(/^\$/, '')}` });
  if (barn?.paypal) pays.push({ label: 'PayPal', color: '#003087', href: `https://paypal.me/${barn.paypal.replace(/^@/, '')}` });

  async function setField(patch: Record<string, any>) {
    await supabase.from('families').update(patch).eq('id', family.id);
    onChange();
  }
  async function addCharge() {
    const label = prompt('What is this charge for? (e.g. "Board — October")'); if (!label) return;
    const amt = Number(prompt('Amount? ($)', '') || ''); if (!amt) return;
    await supabase.from('charges').insert({ barn_id: family.barn_id, family_id: family.id, label, amount: amt });
    onChange();
  }
  async function delCharge(id: string) {
    if (!confirm('Remove this charge?')) return;
    await supabase.from('charges').delete().eq('id', id);
    onChange();
  }
  async function recordPayment() {
    const amt = Number(prompt('Payment amount received? ($)', '') || ''); if (!amt) return;
    const note = prompt('Note? (e.g. "Venmo", "cash")', '') || null;
    await supabase.from('payments').insert({ barn_id: family.barn_id, family_id: family.id, amount: amt, method: note });
    onChange();
  }

  const fInp: React.CSSProperties = { width: '100%', border: `1px solid ${C.page}`, borderRadius: 12, padding: '12px 13px', fontSize: 14, background: '#fff', outline: 'none', fontFamily: 'inherit' };

  const rows = [
    ...charges.map(c => ({ k: c.id, d: c.created_at, label: c.label || 'Charge', amt: Number(c.amount), kind: 'charge' as const })),
    ...payments.map(p => ({ k: p.id, d: p.created_at || '', label: 'Payment' + (p.method ? ` · ${p.method}` : ''), amt: -Number(p.amount), kind: 'payment' as const })),
  ].sort((a, b) => (a.d < b.d ? 1 : -1));

  return (
    <Page>
      <button onClick={onBack} style={{ background: '#fff', border: 'none', borderRadius: 11, padding: '8px 13px', fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 12 }}>‹ Back</button>
      <div style={{ fontFamily: serif, fontSize: 25, color: C.navy }}>{family.family_name}</div>
      <div style={{ fontSize: 12, color: C.muted2, marginBottom: 12 }}>{family.contact_name || ''}{family.phone ? ` · ${family.phone}` : ''}</div>

      <Card>
        <div style={{ textAlign: 'center', padding: '6px 0 12px' }}>
          <div style={{ fontFamily: serif, fontSize: 34, color: due > 0 ? C.red : C.green }}>{money(due)}</div>
          <div style={{ fontSize: 11.5, color: C.muted2 }}>{due > 0 ? 'Balance due' : 'Paid up'}</div>
        </div>
        <Row l="Charged" v={money(chg)} />
        <Row l="Paid" v={money(paid)} last />
      </Card>

      {canEdit && (
        <>
          <SectionLabel>Monthly charges</SectionLabel>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: C.muted, marginBottom: 5 }}>Monthly / training fee ($)</div>
              <input style={fInp} defaultValue={String(family.monthly_fee || '')} inputMode="decimal" placeholder="0" onBlur={e => setField({ monthly_fee: Number(e.target.value) || 0 })} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: C.muted, marginBottom: 5 }}>Monthly board ($)</div>
              <input style={fInp} defaultValue={String(family.board_fee || '')} inputMode="decimal" placeholder="0" onBlur={e => setField({ board_fee: Number(e.target.value) || 0 })} />
            </div>
          </div>
          <Card style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Auto-charge each lesson's fee</span>
            <input type="checkbox" defaultChecked={family.billing_mode === 'per_lesson'} onChange={e => setField({ billing_mode: e.target.checked ? 'per_lesson' : 'manual' })} style={{ width: 20, height: 20 }} />
          </Card>
          <div style={{ fontSize: 11, color: C.muted2, marginTop: 6, lineHeight: 1.4 }}>
            Monthly fee &amp; board post when you tap “Run billing for this month” on the Billing screen. Board is for families keeping a horse at the barn.
          </div>
        </>
      )}

      {due > 0 && pays.length > 0 && (
        <>
          <SectionLabel>Pay the barn</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pays.map(p => (
              <a key={p.label} href={p.href} target="_blank" rel="noreferrer" style={{
                display: 'block', textAlign: 'center', textDecoration: 'none', background: p.color, color: '#fff',
                borderRadius: 14, padding: '13px', fontSize: 14, fontWeight: 700,
              }}>Pay with {p.label}</a>
            ))}
          </div>
        </>
      )}

      <SectionLabel>Activity</SectionLabel>
      <Card>
        {rows.map((r, i) => (
          <div key={r.k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < rows.length - 1 ? `1px solid rgba(40,58,109,0.06)` : 'none' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: C.text }}>{r.label}</div>
              {r.d && <div style={{ fontSize: 10.5, color: C.muted2 }}>{new Date(r.d).toLocaleDateString()}</div>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: r.amt < 0 ? C.green : C.text }}>{r.amt < 0 ? '-' : ''}{money(Math.abs(r.amt))}</span>
              {canEdit && r.kind === 'charge' && <button onClick={() => delCharge(r.k)} style={{ background: C.redBg, color: C.red, border: 'none', borderRadius: 8, padding: '4px 8px', fontSize: 11, fontWeight: 700 }}>✕</button>}
            </div>
          </div>
        ))}
        {rows.length === 0 && <div style={{ fontSize: 12.5, color: C.muted2, textAlign: 'center', padding: 8 }}>No charges or payments yet.</div>}
      </Card>

      {canEdit && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 14 }}>
          <Button kind="soft" onClick={addCharge}>+ Add a charge</Button>
          <Button kind="ghost" onClick={recordPayment}>Record a payment received</Button>
        </div>
      )}
    </Page>
  );
}
