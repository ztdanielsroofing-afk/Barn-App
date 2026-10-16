import { useState } from 'react';
import { C, serif } from '../theme';
import { Button } from '../ui';
import { supabase } from '../supabase';
import { useApp } from '../AppContext';

const RELATIONSHIPS = ['Mother', 'Father', 'Grandparent', 'Sibling', 'Guardian', 'Other'];

type RiderDraft = {
  name: string;
  age: string;
  isSelf: boolean;
  relationship: string;
  emName: string;
  emPhone: string;
};

const blankRider = (): RiderDraft => ({ name: '', age: '', isSelf: false, relationship: '', emName: '', emPhone: '' });

// Required registration for a newly-invited family. Cannot be skipped:
// the app stays gated until every required field is filled and saved.
export default function CompleteProfile({ onDone }:
  { familyId?: string | null; onDone: () => void }) {
  const { user, barn, signOut } = useApp();
  const [yourName, setYourName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [home, setHome] = useState('');
  const [riders, setRiders] = useState<RiderDraft[]>([blankRider()]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  function setRider(i: number, patch: Partial<RiderDraft>) {
    setRiders(rs => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  const emailOk = /\S+@\S+\.\S+/.test(email.trim());
  const riderOk = (r: RiderDraft) =>
    r.name.trim() && r.age.trim() && r.emName.trim() && r.emPhone.trim() &&
    (r.isSelf || r.relationship.trim());
  const ready = yourName.trim() && emailOk && home.trim() && riders.length > 0 && riders.every(riderOk);

  async function save() {
    if (!ready) { setErr('Please complete every required field before finishing.'); return; }
    setErr(''); setBusy(true);
    try {
      const first = riders[0];
      // One transaction server-side: creates/attaches the family, saves it, and
      // inserts every rider (with emergency contact). Robust even if the account
      // wasn't linked to a family yet.
      const { error } = await supabase.rpc('complete_family_onboarding', {
        p_contact: yourName.trim(),
        p_email: email.trim().toLowerCase(),
        p_home: home.trim(),
        p_emergency: `${first.emName.trim()} — ${first.emPhone.trim()}`,
        p_riders: riders.map(r => ({
          name: r.name.trim(),
          age: r.age || null,
          is_self: r.isSelf,
          relationship: r.isSelf ? 'Self' : r.relationship,
          em_name: r.emName.trim(),
          em_phone: r.emPhone.trim(),
        })),
      });
      if (error) throw error;
      onDone();
    } catch (e: any) {
      setErr(e.message || 'Could not save. Please try again.');
      setBusy(false);
    }
  }

  const inp: React.CSSProperties = { width: '100%', border: `1px solid ${C.page}`, borderRadius: 12, padding: '13px 14px', fontSize: 15, background: '#fff', outline: 'none', fontFamily: 'inherit' };
  const label: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, color: C.muted, margin: '11px 0 5px' };
  const sect: React.CSSProperties = { fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', color: C.faint, textTransform: 'uppercase', margin: '20px 0 4px' };

  return (
    <div className="phone">
      <div className="scroll" style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ background: C.navy, color: '#fff', padding: '54px 22px 24px', borderBottomLeftRadius: 26, borderBottomRightRadius: 26 }}>
          <div style={{ fontFamily: serif, fontSize: 27 }}>Welcome to {barn?.name || 'the barn'}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 6, lineHeight: 1.5 }}>
            Please complete your registration. All fields are required — you’ll enter the app once it’s saved.
          </div>
        </div>

        <div style={{ padding: '4px 20px 30px', background: C.page }}>
          <div style={sect}>Your details</div>
          <div style={label}>Your name *</div>
          <input style={inp} value={yourName} onChange={e => setYourName(e.target.value)} placeholder="Person completing this form" />
          <div style={label}>Email address *</div>
          <input style={inp} value={email} onChange={e => setEmail(e.target.value)} placeholder="name@email.com" inputMode="email" autoCapitalize="none" />
          <div style={label}>Home address *</div>
          <input style={inp} value={home} onChange={e => setHome(e.target.value)} placeholder="Street, town" />

          {riders.map((r, i) => (
            <div key={i}>
              <div style={{ ...sect, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Rider {i + 1}</span>
                {riders.length > 1 && <button onClick={() => setRiders(rs => rs.filter((_, j) => j !== i))} style={{ background: C.redBg, color: C.red, border: 'none', borderRadius: 8, padding: '3px 9px', fontSize: 10.5, fontWeight: 800 }}>Remove</button>}
              </div>
              <div style={label}>Rider name *</div>
              <input style={inp} value={r.name} onChange={e => setRider(i, { name: e.target.value })} placeholder="Rider's full name" />
              <div style={label}>Rider age *</div>
              <input style={inp} value={r.age} onChange={e => setRider(i, { age: e.target.value })} placeholder="Age" inputMode="numeric" />

              <div style={label}>Is the rider the person completing this form?</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[['Yes', true], ['No', false]].map(([lab, val]) => (
                  <button key={lab as string} onClick={() => setRider(i, { isSelf: val as boolean })} style={{
                    flex: 1, border: 'none', borderRadius: 12, padding: '12px 4px', fontSize: 13, fontWeight: 700,
                    background: r.isSelf === val ? C.navy : '#fff', color: r.isSelf === val ? '#fff' : C.muted,
                  }}>{lab as string}</button>
                ))}
              </div>

              {!r.isSelf && (
                <>
                  <div style={label}>Relationship to rider *</div>
                  <select style={inp} value={r.relationship} onChange={e => setRider(i, { relationship: e.target.value })}>
                    <option value="">Select…</option>
                    {RELATIONSHIPS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </>
              )}

              <div style={label}>Emergency contact name *</div>
              <input style={inp} value={r.emName} onChange={e => setRider(i, { emName: e.target.value })} placeholder="Name" />
              <div style={label}>Emergency contact phone *</div>
              <input style={inp} value={r.emPhone} onChange={e => setRider(i, { emPhone: e.target.value })} placeholder="(555) 555-5555" inputMode="tel" />
            </div>
          ))}

          <button onClick={() => setRiders(rs => [...rs, blankRider()])} style={{ marginTop: 14, background: C.goldTint, color: C.navy, border: 'none', borderRadius: 12, padding: 12, width: '100%', fontSize: 12.5, fontWeight: 700 }}>+ Add another rider</button>

          {err && <div style={{ color: C.red, fontSize: 12.5, margin: '14px 2px 0', fontWeight: 600 }}>{err}</div>}
          <Button disabled={!ready || busy} onClick={save} style={{ marginTop: 16 }}>{busy ? 'Saving…' : 'Finish & enter the app'}</Button>
          <Button kind="ghost" onClick={signOut} style={{ marginTop: 10, color: C.muted }}>Sign out</Button>
        </div>
      </div>
    </div>
  );
}
