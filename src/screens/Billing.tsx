import { useState } from 'react';
import { C, serif, money } from '../theme';
import { Card, SectionLabel, Pill, Button, Avatar, Row, Empty } from '../ui';
import { Page } from './Header';
import { useTable } from '../db';
import { supabase } from '../supabase';
import { Family, Invoice } from '../types';
import { useApp } from '../AppContext';
import { Nav } from '../App';

export default function Billing({ nav: _nav }: { nav: Nav }) {
  const { canEditBilling } = useApp();
  const { data: families, reload } = useTable<Family>('families', q => q.order('family_name'));
  const { data: invoices } = useTable<Invoice>('invoices');
  const [open, setOpen] = useState<Family | null>(null);

  if (open) return <FamilyBill family={open} invoice={invoices.find(i => i.family_id === open.id)} onBack={() => { setOpen(null); reload(); }} canEdit={canEditBilling} />;

  const totalDue = invoices.reduce((s, i) => s + Number(i.due || 0), 0);
  const overdue = families.filter(f => f.status === 'overdue');

  return (
    <Page>
      <div style={{ fontFamily: serif, fontSize: 27, color: C.navy, marginBottom: 4 }}>Billing</div>
      <Card style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <div>
          <div style={{ fontFamily: serif, fontSize: 26, color: totalDue > 0 ? C.red : C.green }}>{money(totalDue)}</div>
          <div style={{ fontSize: 11.5, color: C.muted2 }}>Total outstanding · {overdue.length} overdue</div>
        </div>
      </Card>

      <SectionLabel>Families</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {families.map(f => {
          const inv = invoices.find(i => i.family_id === f.id);
          const due = Number(inv?.due || 0);
          return (
            <Card key={f.id} onClick={() => setOpen(f)} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Avatar init={f.family_name.slice(0, 1)} tint={C.navy} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>{f.family_name}</div>
                <div style={{ fontSize: 11, color: C.muted2 }}>{f.contact_name || '—'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: due > 0 ? C.red : C.green }}>{money(due)}</div>
                <Pill color={f.status === 'overdue' ? C.red : f.status === 'due' ? C.gold : C.green}>{f.status}</Pill>
              </div>
            </Card>
          );
        })}
        {families.length === 0 && <Empty>No families yet.</Empty>}
      </div>
    </Page>
  );
}

export function FamilyBill({ family, invoice, onBack, canEdit }:
  { family: Family; invoice?: Invoice; onBack: () => void; canEdit: boolean }) {
  const { barn } = useApp();
  const due = Number(invoice?.due || 0);
  const items = invoice?.line_items || [];
  const [busy, setBusy] = useState(false);

  const pays: { label: string; color: string; href: string }[] = [];
  if (barn?.venmo) pays.push({ label: 'Venmo', color: '#3d95ce', href: `https://venmo.com/u/${barn.venmo.replace(/^@/, '')}` });
  if (barn?.cashapp) pays.push({ label: 'Cash App', color: '#00c244', href: `https://cash.app/$${barn.cashapp.replace(/^\$/, '')}` });
  if (barn?.paypal) pays.push({ label: 'PayPal', color: '#003087', href: `https://paypal.me/${barn.paypal.replace(/^@/, '')}` });

  async function recordPayment() {
    const amt = prompt('Payment amount received?'); if (!amt) return;
    const n = Number(amt); if (!n) return;
    setBusy(true);
    await supabase.from('payments').insert({ barn_id: family.barn_id, family_id: family.id, amount: n, method: 'manual' });
    if (invoice) {
      const newDue = Math.max(0, due - n);
      await supabase.from('invoices').update({ due: newDue, status: newDue === 0 ? 'paid' : invoice.status }).eq('id', invoice.id);
      await supabase.from('families').update({ status: newDue === 0 ? 'current' : family.status, balance: newDue }).eq('id', family.id);
    }
    setBusy(false);
    onBack();
  }

  return (
    <Page>
      <button onClick={onBack} style={{ background: '#fff', border: 'none', borderRadius: 11, padding: '8px 13px', fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 12 }}>‹ Back</button>
      <div style={{ fontFamily: serif, fontSize: 25, color: C.navy }}>{family.family_name}</div>
      <div style={{ fontSize: 12, color: C.muted2, marginBottom: 12 }}>{family.contact_name || ''}{family.phone ? ` · ${family.phone}` : ''}</div>

      <Card>
        <div style={{ textAlign: 'center', padding: '6px 0 12px' }}>
          <div style={{ fontFamily: serif, fontSize: 34, color: due > 0 ? C.red : C.green }}>{money(due)}</div>
          <div style={{ fontSize: 11.5, color: C.muted2 }}>{due > 0 ? 'Amount due' : 'Paid in full'}</div>
        </div>
        {items.map((it, i) => <Row key={i} l={it.label} v={money(it.amount)} last={i === items.length - 1} />)}
      </Card>

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

      {canEdit && (
        <div style={{ marginTop: 14 }}>
          <Button kind="soft" disabled={busy} onClick={recordPayment}>Record a payment received</Button>
        </div>
      )}
    </Page>
  );
}
