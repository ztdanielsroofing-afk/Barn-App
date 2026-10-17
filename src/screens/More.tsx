import { useState } from 'react';
import { C, serif, money, BRAND_OPTIONS } from '../theme';
import { Card, SectionLabel, Pill, Button, Avatar, Row, Empty, Icon, ICONS, H } from '../ui';
import { supabase } from '../supabase';
import { useApp } from '../AppContext';
import { useTable } from '../db';
import { Nav } from '../App';
import { Family, Rider, AppUser, TaskRow, Show, Listing, BarnDocument, Signature, Charge, Payment, Lesson, AppNotification } from '../types';
import { FamilyBill } from './Billing';
import AdminOverview from './AdminOverview';
import { sendInvite } from '../invites';
import { notify } from '../notify';
import { Role } from '../types';

export default function More({ nav, section }: { nav: Nav; section: string | null; params?: any }) {
  const { role, isClient, canViewBilling, isStaff, actualRole, previewRole, setPreviewRole } = useApp();
  const { data: notifs } = useTable<AppNotification>('notifications');
  const unread = notifs.filter(n => !n.read).length;

  if (section) {
    const map: Record<string, JSX.Element> = {
      overview: <AdminOverview nav={nav} />,
      clients: <Clients nav={nav} />,
      riders: <Riders />,
      staff: <Staff />,
      requests: <Requests />,
      care: <Care nav={nav} />,
      shows: <Shows />,
      marketplace: <Marketplace />,
      reports: <Reports />,
      pay: <Pay />,
      documents: <Documents />,
      notifications: <Notifications />,
      settings: <Settings />,
      mybill: <MyBill />,
      profile: <Profile />,
    };
    if (map[section]) return <SubScreen back={() => nav.go('more')}>{map[section]}</SubScreen>;
  }

  const groups: { title: string; items: { l: string; s: string; ownerOnly?: boolean }[] }[] = isClient
    ? [
        { title: 'My account', items: [{ l: 'My Bill', s: 'mybill' }, { l: 'Documents & Contracts', s: 'documents' }] },
        { title: 'Scheduling', items: [{ l: 'Shows & Travel', s: 'shows' }, { l: 'Barn Marketplace', s: 'marketplace' }] },
        { title: 'Account', items: [{ l: 'Notifications', s: 'notifications' }, { l: 'My Profile', s: 'profile' }] },
      ]
    : [
        { title: 'Overview', items: [{ l: 'Admin Overview', s: 'overview' }] },
        { title: 'People', items: [{ l: 'Clients & Families', s: 'clients' }, { l: 'Riders', s: 'riders' }, { l: 'Staff & Tasks', s: 'staff' }] },
        { title: 'Scheduling', items: [{ l: 'Scheduling Requests', s: 'requests' }, { l: 'Care Schedule', s: 'care' }, { l: 'Shows & Travel', s: 'shows' }, { l: 'Barn Marketplace', s: 'marketplace' }] },
        { title: 'Money', items: [{ l: 'Financial Reports', s: 'reports' }, { l: canViewBilling ? 'Trainer Pay' : 'My Pay', s: 'pay' }, { l: 'Documents & Contracts', s: 'documents' }] },
        { title: 'Account', items: [{ l: 'Notifications', s: 'notifications' }, { l: 'Barn Settings', s: 'settings', ownerOnly: true }, { l: 'My Profile', s: 'profile' }] },
      ];

  const roleLabel = role === 'owner' ? 'Barn Owner' : role === 'head_trainer' ? 'Head Trainer' : role === 'trainer' ? 'Trainer' : 'Client';

  return (
    <div style={{ padding: '48px 20px 30px' }}>
      <div style={{ fontFamily: serif, fontSize: 30, color: C.navy }}>More</div>
      <div style={{ fontSize: 12, color: C.muted2, margin: '5px 0 8px' }}>{roleLabel}</div>

      {actualRole === 'owner' && (
        <Card style={{ background: C.navy, marginTop: 6, marginBottom: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.goldLight, letterSpacing: '0.06em', marginBottom: 3 }}>OWNER TOOLS · VIEW AS</div>
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.7)', marginBottom: 10, lineHeight: 1.4 }}>
            Preview what each role sees so you can check every screen. Only changes your view — your account stays Owner.
          </div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {(['owner', 'head_trainer', 'trainer', 'client'] as const).map(r => {
              const on = (previewRole || 'owner') === r;
              return (
                <button key={r} onClick={() => setPreviewRole(r === 'owner' ? null : r)} style={{
                  border: 'none', borderRadius: 20, padding: '8px 13px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  background: on ? C.gold : 'rgba(255,255,255,0.12)', color: on ? C.navyDeep : '#fff',
                }}>
                  {({ owner: 'Owner', head_trainer: 'Head Trainer', trainer: 'Trainer', client: 'Client' } as any)[r]}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {groups.map(g => (
        <div key={g.title}>
          <SectionLabel>{g.title}</SectionLabel>
          <Card style={{ padding: 4 }}>
            {g.items.filter(it => !(it.ownerOnly && role !== 'owner')).map((it, i, arr) => (
              <button key={it.s} onClick={() => nav.go('more', it.s)} style={{
                width: '100%', background: 'none', border: 'none', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', padding: '13px 12px', cursor: 'pointer',
                borderBottom: i < arr.length - 1 ? `1px solid rgba(40,58,109,0.06)` : 'none',
              }}>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: C.text }}>{it.l}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {it.s === 'notifications' && unread > 0 && (
                    <span style={{ background: C.red, color: '#fff', fontSize: 10.5, fontWeight: 800, borderRadius: 20, minWidth: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>{unread}</span>
                  )}
                  <Icon d={ICONS.chevron} size={17} stroke={C.faint} />
                </span>
              </button>
            ))}
          </Card>
        </div>
      ))}

      <div style={{ marginTop: 22 }}><SignOut /></div>
    </div>
  );
}

function SubScreen({ back, children }: { back: () => void; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ background: C.page, padding: '48px 20px 6px' }}>
        <button onClick={back} style={{ background: '#fff', border: 'none', borderRadius: 11, padding: '8px 13px', fontSize: 12, fontWeight: 700, color: C.navy }}>‹ More</button>
      </div>
      <div style={{ padding: '6px 20px 30px', background: C.page, minHeight: '100%' }}>{children}</div>
    </div>
  );
}

function SignOut() {
  const { signOut, user, role } = useApp();
  return (
    <div>
      <div style={{ fontSize: 11.5, color: C.muted2, textAlign: 'center', marginBottom: 10 }}>
        Signed in as {user?.email} · {role} · build 16
      </div>
      <Button kind="ghost" onClick={signOut} style={{ color: C.red }}>Sign out</Button>
    </div>
  );
}

/* ---------------- Clients & Families ---------------- */
function Clients({ nav: _nav }: { nav: Nav }) {
  const { canEditBilling, barn } = useApp();
  const { data: families, reload } = useTable<Family>('families', q => q.order('family_name'));
  const { data: charges, reload: reloadC } = useTable<Charge>('charges');
  const { data: payments, reload: reloadP } = useTable<Payment>('payments');
  const { data: riders } = useTable<Rider>('riders', q => q.order('full_name'));
  const [open, setOpen] = useState<Family | null>(null);
  const [bill, setBill] = useState(false);
  const [adding, setAdding] = useState(false);

  async function delFamily(f: Family) {
    if (!confirm(`Delete the ${f.family_name}? This also removes their riders.`)) return;
    if (!confirm('This permanently deletes the family and can’t be undone. Are you absolutely sure?')) return;
    await supabase.from('families').delete().eq('id', f.id);
    setOpen(null); reload();
  }

  if (open && bill) return (
    <FamilyBill
      family={open}
      charges={charges.filter(c => c.family_id === open.id)}
      payments={payments.filter(p => p.family_id === open.id)}
      onBack={() => { setBill(false); reloadC(); reloadP(); }}
      canEdit={canEditBilling}
      onChange={() => { reloadC(); reloadP(); reload(); }}
    />
  );
  if (open) return (
    <FamilyDetail
      family={open}
      riders={riders.filter(r => r.family_id === open.id)}
      onBack={() => { setOpen(null); reload(); }}
      onBilling={() => setBill(true)}
      onRemove={() => delFamily(open)}
    />
  );
  return (
    <>
      <H>Clients &amp; Families</H>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {families.map(f => (
          <Card key={f.id} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div onClick={() => setOpen(f)} style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1, minWidth: 0, cursor: 'pointer' }}>
              <Avatar init={f.family_name.slice(0, 1)} tint={C.navy} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>{f.family_name}</div>
                <div style={{ fontSize: 11, color: C.muted2 }}>{f.contact_name || (f.onboarded === false ? 'Invited — awaiting sign-up' : '—')}{f.phone ? ` · ${f.phone}` : ''}</div>
              </div>
              <Pill color={f.onboarded === false ? C.gold : f.status === 'overdue' ? C.red : f.status === 'due' ? C.gold : C.green}>{f.onboarded === false ? 'invited' : f.status}</Pill>
            </div>
            <button onClick={() => delFamily(f)} style={delX}>Remove</button>
          </Card>
        ))}
        {families.length === 0 && <Empty>No families yet.</Empty>}
      </div>
      <div style={{ marginTop: 14 }}><Button kind="soft" onClick={() => setAdding(true)}>+ Invite a family</Button></div>
      {adding && <InviteFamilyModal barnId={barn?.id} onClose={() => setAdding(false)} onSent={() => { setAdding(false); reload(); }} />}
    </>
  );
}

function FamilyDetail({ family, riders, onBack, onBilling, onRemove }:
  { family: Family; riders: Rider[]; onBack: () => void; onBilling: () => void; onRemove: () => void }) {
  return (
    <>
      <button onClick={onBack} style={backBtn}>‹ Clients</button>
      <div style={{ fontFamily: serif, fontSize: 25, color: C.navy }}>{family.family_name}</div>
      <div style={{ fontSize: 12, color: C.muted2, marginBottom: 12 }}>
        {family.onboarded === false ? 'Invited — awaiting registration' : 'Registered family'}
      </div>

      <SectionLabel style={{ marginTop: 4 }}>Contact</SectionLabel>
      <Card>
        <Row l="Main contact" v={family.contact_name || '—'} />
        <Row l="Email" v={family.email || '—'} />
        <Row l="Phone" v={family.phone || '—'} />
        <Row l="Home address" v={family.home_address || '—'} />
        <Row l="Emergency contact" v={family.emergency_contact || '—'} last />
      </Card>

      <SectionLabel>Riders ({riders.length})</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {riders.map(r => (
          <Card key={r.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>{r.full_name}</div>
              {r.age != null && <Pill color={C.purple}>age {r.age}</Pill>}
            </div>
            <div style={{ marginTop: 6 }}>
              <Row l="Relationship" v={r.relationship || (r.is_self ? 'Self' : '—')} />
              <Row l="Emergency contact" v={r.emergency_contact_name || '—'} />
              <Row l="Emergency phone" v={r.emergency_contact_phone || '—'} last />
            </div>
          </Card>
        ))}
        {riders.length === 0 && <Empty>No riders on file for this family yet.</Empty>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 16 }}>
        <Button kind="soft" onClick={onBilling}>View billing</Button>
        <Button kind="ghost" onClick={onRemove} style={{ color: C.red }}>Remove family</Button>
      </div>
    </>
  );
}

function InviteFamilyModal({ barnId, onClose, onSent }: { barnId?: string; onClose: () => void; onSent: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState('');

  const emailOk = /\S+@\S+\.\S+/.test(email.trim());
  const ready = name.trim().length > 0 && emailOk;

  async function send() {
    setErr(''); setBusy(true);
    try {
      const famName = /family$/i.test(name.trim()) ? name.trim() : `${name.trim()} family`;
      const { data: fam, error } = await supabase.from('families')
        .insert({ barn_id: barnId, family_name: famName, email: email.trim().toLowerCase(), status: 'current', onboarded: false })
        .select('id').single();
      if (error || !fam) throw new Error(error?.message || 'Could not create the family.');
      const res = await sendInvite({ email: email.trim(), role: 'client', barn_id: barnId, full_name: famName, family_id: fam.id });
      if (!res.ok) throw new Error(res.error || 'The invite email failed to send.');
      setDone(`Invitation sent to ${email.trim()}. They'll get an email with a link to register.`);
    } catch (e: any) {
      setErr(e.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  const inp: React.CSSProperties = { width: '100%', border: `1px solid ${C.page}`, borderRadius: 12, padding: '13px 14px', fontSize: 15, background: '#fff', outline: 'none', marginBottom: 4, fontFamily: 'inherit' };
  const lbl: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, color: C.muted, margin: '10px 0 5px' };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(14,21,48,0.5)', zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.page, width: '100%', maxWidth: 430, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: '22px 20px 30px' }}>
        {done ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontFamily: serif, fontSize: 24, color: C.green, marginBottom: 8 }}>Invitation sent ✓</div>
            <p style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.6 }}>{done}</p>
            <Button onClick={onSent} style={{ marginTop: 14 }}>Done</Button>
          </div>
        ) : (
          <>
            <div style={{ fontFamily: serif, fontSize: 24, color: C.navy, marginBottom: 4 }}>Invite a family</div>
            <div style={{ fontSize: 12.5, color: C.muted2, marginBottom: 8, lineHeight: 1.5 }}>Enter their name and email. They’ll get a link to register and add their own rider &amp; contact details.</div>
            <div style={lbl}>Family / contact name *</div>
            <input style={inp} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Reyes" autoFocus />
            <div style={lbl}>Email address *</div>
            <input style={inp} value={email} onChange={e => setEmail(e.target.value)} placeholder="name@email.com" inputMode="email" autoCapitalize="none" />
            {err && <div style={{ color: C.red, fontSize: 12.5, margin: '10px 2px 0', fontWeight: 600 }}>{err}</div>}
            <Button disabled={!ready || busy} onClick={send} style={{ marginTop: 16 }}>{busy ? 'Sending…' : 'Send invitation'}</Button>
            <Button kind="ghost" onClick={onClose} style={{ marginTop: 10 }}>Cancel</Button>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------- Riders ---------------- */
function Riders() {
  const { isStaff } = useApp();
  const { data: riders, reload } = useTable<Rider>('riders', q => q.order('full_name'));
  const { data: families } = useTable<Family>('families');
  const [open, setOpen] = useState<Rider | null>(null);
  const famName = (id: string | null) => families.find(f => f.id === id)?.family_name || '—';

  if (open) {
    const r = open;
    return (
      <>
        <button onClick={() => setOpen(null)} style={backBtn}>‹ Riders</button>
        <div style={{ fontFamily: serif, fontSize: 25, color: C.navy }}>{r.full_name}</div>
        <div style={{ fontSize: 12, color: C.muted2, marginBottom: 12 }}>{famName(r.family_id)}{r.age ? ` · age ${r.age}` : ''}</div>
        <SectionLabel>Progress</SectionLabel>
        <Card>
          <Row l="Flat" v={r.flat_level || '—'} />
          <Row l="Jumping" v={r.jump_level || '—'} />
          <Row l="Dressage" v={r.dressage_level || '—'} last />
        </Card>
        <SectionLabel>Emergency</SectionLabel>
        <Card>
          <Row l="Contact" v={r.emergency_contact_name || '—'} />
          <Row l="Phone" v={r.emergency_contact_phone || '—'} />
          <Row l="Relationship" v={r.relationship || '—'} last />
        </Card>
        {isStaff && r.trainer_note && (
          <>
            <SectionLabel>Trainer note</SectionLabel>
            <Card><div style={{ fontSize: 13, color: C.text }}>{r.trainer_note}</div></Card>
          </>
        )}
        {isStaff && (
          <div style={{ marginTop: 14 }}>
            <Button kind="ghost" onClick={async () => {
              const note = prompt('Trainer note?', r.trainer_note || ''); if (note === null) return;
              await supabase.from('riders').update({ trainer_note: note }).eq('id', r.id); setOpen(null); reload();
            }}>Edit trainer note</Button>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <H>Riders</H>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {riders.map(r => (
          <Card key={r.id} onClick={() => setOpen(r)} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Avatar init={r.full_name.slice(0, 1)} tint={C.purple} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>{r.full_name}</div>
              <div style={{ fontSize: 11, color: C.muted2 }}>{famName(r.family_id)}{r.age ? ` · age ${r.age}` : ''}</div>
            </div>
          </Card>
        ))}
        {riders.length === 0 && <Empty>No riders yet. They’re added when families register.</Empty>}
      </div>
    </>
  );
}

/* ---------------- Staff & Tasks ---------------- */
function Staff() {
  const { barn, role } = useApp();
  const { data: staff, reload: reloadStaff } = useTable<AppUser>('users', q => q.neq('role', 'client').order('full_name'));
  const { data: tasks, reload: reloadTasks } = useTable<TaskRow>('tasks', q => q.order('time_label'));

  async function addTask() {
    const label = prompt('Task? (e.g. "Cold-hose left front 10 min")'); if (!label) return;
    const type = (prompt('Type? FEED / CARE / CHORE', 'CARE') || 'CARE').toUpperCase();
    const horse = prompt('Which horse (or "Whole barn")?', 'Whole barn') || '';
    const who = prompt('Assign to whom? (name)', '') || '';
    const time = prompt('Time? (e.g. "4:30 PM")', '') || '';
    await supabase.from('tasks').insert({ barn_id: barn?.id, label, task_type: type, horse_name: horse, assignee_name: who, time_label: time, done: false });
    reloadTasks();
  }
  async function delTask(id: string, label: string) {
    if (!confirm(`Delete task "${label}"?`)) return;
    await supabase.from('tasks').delete().eq('id', id);
    reloadTasks();
  }
  async function addTeamMember() {
    const name = prompt("Team member's name?"); if (!name) return;
    const email = prompt(`Email for ${name}?\n\nWe'll email them a sign-in link that ties them to the barn.`);
    if (!email) return;
    const roleInput = (prompt('Role? Type one of:\ntrainer  ·  head_trainer  ·  owner', 'trainer') || 'trainer')
      .trim().toLowerCase().replace(' ', '_');
    const allowed = ['trainer', 'head_trainer', 'owner'];
    const chosen: Role = (allowed.includes(roleInput) ? roleInput : 'trainer') as Role;
    const res = await sendInvite({ email, role: chosen, barn_id: barn?.id, full_name: name });
    if (res.ok) alert(`Invite emailed to ${email} as ${chosen.replace('_', ' ')}. When they open the link they're added to the barn.`);
    else alert('Invite failed: ' + res.error);
  }
  async function delStaff(s: AppUser) {
    if (role !== 'owner') { alert('Only the owner can remove team members.'); return; }
    if (!confirm(`Remove ${s.full_name || s.email} from the team?`)) return;
    if (!confirm('This permanently removes their profile from the barn. Are you absolutely sure?')) return;
    await supabase.from('users').delete().eq('id', s.id);
    reloadStaff();
  }

  return (
    <>
      <H>Staff &amp; Tasks</H>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <SectionLabel style={{ margin: 0 }}>Team</SectionLabel>
        {role === 'owner' && <button onClick={addTeamMember} style={chip}>+ Add team member</button>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {staff.map(s => (
          <Card key={s.id} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Avatar init={(s.full_name || '?').slice(0, 1)} tint={C.navy} />
            <div style={{ flex: 1 }}><div style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>{s.full_name || s.email}</div><div style={{ fontSize: 11, color: C.muted2, textTransform: 'capitalize' }}>{s.role.replace('_', ' ')}</div></div>
            {role === 'owner' && <button onClick={() => delStaff(s)} style={delX}>Remove</button>}
          </Card>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '18px 0 8px' }}>
        <SectionLabel style={{ margin: 0 }}>Today's tasks</SectionLabel>
        <button onClick={addTask} style={chip}>+ Add task</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tasks.map(t => (
          <Card key={t.id} style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: taskBg(t.task_type) }}><span style={{ fontSize: 8.5, fontWeight: 800, color: taskColor(t.task_type) }}>{t.task_type}</span></div>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12.5, fontWeight: 700, color: C.text, textDecoration: t.done ? 'line-through' : 'none' }}>{t.label}</div><div style={{ fontSize: 10.5, color: C.muted2 }}>{t.horse_name}{t.assignee_name ? ` · ${t.assignee_name}` : ''}{t.time_label ? ` · ${t.time_label}` : ''}</div></div>
            <input type="checkbox" checked={t.done} onChange={async () => { await supabase.from('tasks').update({ done: !t.done, done_at: new Date().toISOString() }).eq('id', t.id); reloadTasks(); }} style={{ width: 20, height: 20 }} />
            <button onClick={() => delTask(t.id, t.label)} style={{ ...delX, padding: '6px 9px' }}>✕</button>
          </Card>
        ))}
        {tasks.length === 0 && <Empty>No tasks yet. Tap “+ Add task”.</Empty>}
      </div>
    </>
  );
}
const taskColor = (t?: string | null) => ({ FEED: C.gold, CARE: C.green, CHORE: C.navy } as any)[t || ''] || C.navy;
const taskBg = (t?: string | null) => taskColor(t) + '1a';

/* ---------------- Scheduling Requests ---------------- */
function Requests() {
  const { data: reqs, reload } = useTable<any>('schedule_requests', q => q.order('created_at'));
  return (
    <>
      <H>Scheduling Requests</H>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {reqs.map(r => (
          <Card key={r.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><div style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>{r.rider_name || 'Request'} · {r.kind}</div><div style={{ fontSize: 11, color: C.muted2 }}>{r.orig}</div></div>
              <Pill color={r.status === 'approved' ? C.green : C.gold}>{r.status}</Pill>
            </div>
            {r.reason && <div style={{ fontSize: 11.5, color: C.muted, margin: '8px 0', fontStyle: 'italic' }}>{r.reason}</div>}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(r.proposed || []).map((p: string, i: number) => <Pill key={i} color={C.navy} bg={C.infoBg}>{p}</Pill>)}
            </div>
            {r.status !== 'approved' && <Button kind="soft" style={{ marginTop: 11 }} onClick={async () => {
              await supabase.from('schedule_requests').update({ status: 'approved' }).eq('id', r.id);
              if (r.family_id) await notify({ barn_id: r.barn_id, family_id: r.family_id, kind: 'approval', title: 'Schedule request approved', body: `${r.kind}${r.orig ? ` · ${r.orig}` : ''}` });
              reload();
            }}>Approve &amp; confirm</Button>}
          </Card>
        ))}
        {reqs.length === 0 && <Empty>No pending requests.</Empty>}
      </div>
    </>
  );
}

/* ---------------- Care Schedule ---------------- */
const CARE_CATS = ['feed', 'supplement', 'turnout', 'medication', 'other'];
const catColor = (c: string) => ({ feed: C.gold, supplement: C.green, turnout: C.info, medication: C.red, other: C.purple } as any)[c] || C.navy;
const careColor = (s: string) => ({ overdue: C.red, soon: C.gold, ok: C.green } as any)[s] || C.green;

function Care({ nav }: { nav: Nav }) {
  const { isStaff, barn } = useApp();
  const { data: horses } = useTable<any>('horses', q => q.order('farrier_next'));
  const { data: items, reload } = useTable<any>('care_items', q => q.order('created_at'));

  async function addItem() {
    const title = prompt('Feed / care instruction title?\n(e.g. "AM grain — 2 scoops + soaked hay")'); if (!title) return;
    const category = (prompt(`Type? ${CARE_CATS.join(' / ')}`, 'feed') || 'feed').toLowerCase();
    const schedule = prompt('When? (e.g. "6:30am & 4:30pm", "AM only", "Daily")', '') || '';
    const horseName = prompt('Which horse? (leave blank for whole barn)', '') || '';
    const horse = horseName ? horses.find(h => h.name.toLowerCase() === horseName.toLowerCase()) : null;
    const detail = prompt('Details / amounts (optional)', '') || '';
    await supabase.from('care_items').insert({
      barn_id: barn?.id, horse_id: horse?.id || null, category: CARE_CATS.includes(category) ? category : 'other',
      title, schedule, detail,
    });
    reload();
  }
  async function delItem(id: string, title: string) {
    if (!confirm(`Delete "${title}"?`)) return;
    await supabase.from('care_items').delete().eq('id', id);
    reload();
  }
  const horseName = (id: string | null) => id ? (horses.find(h => h.id === id)?.name || 'Horse') : 'Whole barn';

  return (
    <>
      <H>Care Schedule</H>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <SectionLabel style={{ margin: 0 }}>Feed &amp; care instructions</SectionLabel>
        {isStaff && <button onClick={addItem} style={chip}>+ Add</button>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(it => (
          <Card key={it.id} style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
            <div style={{ width: 46, height: 46, borderRadius: 13, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: catColor(it.category) + '1a' }}><span style={{ fontSize: 8, fontWeight: 800, color: catColor(it.category), textTransform: 'uppercase' }}>{it.category}</span></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{it.title}</div>
              <div style={{ fontSize: 11, color: C.muted2 }}>{horseName(it.horse_id)}{it.schedule ? ` · ${it.schedule}` : ''}</div>
              {it.detail && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{it.detail}</div>}
            </div>
            {isStaff && <button onClick={() => delItem(it.id, it.title)} style={delX}>✕</button>}
          </Card>
        ))}
        {items.length === 0 && <Empty>No feed/care instructions yet.{isStaff ? ' Tap “+ Add”.' : ''}</Empty>}
      </div>

      <SectionLabel>Farrier &amp; vet</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {horses.map(h => (
          <Card key={h.id} onClick={() => nav.go('horses', undefined, { horseId: h.id })} style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
            <div style={{ width: 46, height: 46, borderRadius: 13, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.navy + '1a' }}><span style={{ fontSize: 8.5, fontWeight: 800, color: C.navy }}>FARRIER</span></div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{h.name}</div><div style={{ fontSize: 11, color: C.muted2 }}>{h.next_care_key}</div></div>
            <div style={{ textAlign: 'right' }}><div style={{ fontSize: 12, fontWeight: 700, color: careColor(h.care_level) }}>{h.farrier_next}</div><div style={{ fontSize: 10, color: careColor(h.care_level) }}>{h.care_level}</div></div>
          </Card>
        ))}
      </div>
    </>
  );
}

/* ---------------- Shows & Travel ---------------- */
function Shows() {
  const { isStaff, user, barn } = useApp();
  const { data: shows, reload } = useTable<Show>('shows', q => q.order('created_at'));
  const { data: staff } = useTable<AppUser>('users', q => q.neq('role', 'client'));
  const [open, setOpen] = useState<Show | null>(null);
  const cur = open ? shows.find(s => s.id === open.id) || open : null;

  async function assignTrainer() {
    if (!cur) return;
    const names = staff.map(s => s.full_name).filter(Boolean).join(', ');
    const who = prompt(`Which trainer is taking riders?${names ? `\n(${names})` : ''}`, (cur as any).trainer_name || '');
    if (who === null) return;
    await supabase.from('shows').update({ trainer_name: who }).eq('id', cur.id);
    reload();
  }
  async function addDate() {
    if (!cur) return;
    const d = prompt('Add a date to this show (e.g. "Sep 14, 2026"):');
    if (!d) return;
    const merged = cur.date_label ? `${cur.date_label}; ${d}` : d;
    await supabase.from('shows').update({ date_label: merged }).eq('id', cur.id);
    reload();
  }
  async function delShow() {
    if (!cur) return;
    if (!confirm(`Delete "${cur.name}"?`)) return;
    if (!confirm('This permanently removes the show and its reservations. Are you absolutely sure?')) return;
    await supabase.from('shows').delete().eq('id', cur.id);
    setOpen(null); reload();
  }

  if (cur) return (
    <>
      <button onClick={() => setOpen(null)} style={backBtn}>‹ Shows</button>
      <div style={{ fontFamily: serif, fontSize: 25, color: C.navy }}>{cur.name}</div>
      <div style={{ fontSize: 12, color: C.muted2, marginBottom: 4 }}>{cur.date_label} · {cur.venue}</div>
      <Card style={{ margin: '12px 0' }}>
        <Row l="Trailer spots" v={`${cur.reserved} / ${cur.trailer_cap} filled`} />
        <Row l="Reserve fee" v={money(cur.fee)} />
        <Row l="Deadline" v={cur.deadline || '—'} />
        <Row l="Hauling" v={cur.haul_est || '—'} />
        <Row l="Trainer taking riders" v={(cur as any).trainer_name || '—'} last />
      </Card>
      {cur.note && <div style={{ background: C.purpleBg, borderRadius: 12, padding: 12, fontSize: 12, color: C.purple, marginBottom: 12 }}>{cur.note}</div>}
      {(cur.bring_list || []).length > 0 && (
        <>
          <SectionLabel>What to bring</SectionLabel>
          <Card><ul style={{ margin: 0, paddingLeft: 18 }}>{(cur.bring_list || []).map((b, i) => <li key={i} style={{ fontSize: 12.5, color: C.text, padding: '3px 0' }}>{b}</li>)}</ul></Card>
        </>
      )}
      <div style={{ marginTop: 14 }}><Button onClick={async () => { await supabase.from('reservations').insert({ barn_id: barn?.id, show_id: cur.id, family_id: user?.family_id, rider_name: user?.full_name }); await supabase.from('shows').update({ reserved: cur.reserved + 1 }).eq('id', cur.id); alert('Spot reserved! Reserve fee due at the barn.'); reload(); }}>Reserve my spot + {money(cur.fee)}</Button></div>
      {isStaff && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 12 }}>
          <Button kind="ghost" onClick={assignTrainer}>Assign trainer taking riders</Button>
          <Button kind="ghost" onClick={addDate}>Add another date</Button>
          <Button kind="ghost" onClick={delShow} style={{ color: C.red }}>Delete show</Button>
        </div>
      )}
    </>
  );
  return (
    <>
      <H>Shows &amp; Travel</H>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {shows.map(s => (
          <Card key={s.id} onClick={() => setOpen(s)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{s.name}</div><div style={{ fontSize: 11, color: C.muted2 }}>{s.date_label}</div></div>
              <Pill color={C.gold} bg={C.goldTint}>{s.reserved}/{s.trailer_cap}</Pill>
            </div>
            <div style={{ fontSize: 11.5, color: C.red, marginTop: 8, fontWeight: 600 }}>Reserve by {s.deadline} · {money(s.fee)} fee</div>
          </Card>
        ))}
        {shows.length === 0 && <Empty>No shows yet.</Empty>}
      </div>
      {isStaff && <div style={{ marginTop: 14 }}><Button kind="soft" onClick={() => addShow(barn?.id, reload)}>+ Add a show</Button></div>}
    </>
  );
}
async function addShow(barnId: string | undefined, reload: () => void) {
  const name = prompt('Show name?'); if (!name) return;
  const date_label = prompt('Date(s)? (e.g. "Jul 12–13, 2026")') || '';
  const venue = prompt('Venue?') || '';
  const cap = prompt('Trailer spots (max horses)?', '6');
  const fee = prompt('Reserve fee? (number, e.g. 75)', '0');
  const deadline = prompt('Reserve-by deadline? (e.g. "Jul 2")') || '';
  await supabase.from('shows').insert({
    barn_id: barnId, name, date_label, venue,
    trailer_cap: Number(cap) || 0, reserved: 0, fee: Number(fee) || 0, deadline,
  });
  reload();
}

/* ---------------- Marketplace ---------------- */
function Marketplace() {
  const { isStaff, barn } = useApp();
  const { data: listings, reload } = useTable<Listing>('listings', q => q.eq('active', true).order('created_at'));
  async function addListing() {
    const title = prompt('Listing title? (e.g. "Wintec saddle 17\"")'); if (!title) return;
    const category = (prompt('Category? horse / tack / service / other', 'tack') || 'tack').toLowerCase();
    const price = prompt('Price? (number, optional)', '') || '';
    const detail = prompt('Details?', '') || '';
    const contact = prompt('Contact? (name/phone)', '') || '';
    await supabase.from('listings').insert({ barn_id: barn?.id, active: true, category, title, price: price ? Number(price) : null, detail, contact });
    reload();
  }
  return (
    <>
      <H>Barn Marketplace</H>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {listings.map(l => (
          <Card key={l.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{l.title}</div>
              {l.price != null && <div style={{ fontFamily: serif, fontSize: 16, color: C.green }}>{money(l.price)}</div>}
            </div>
            <div style={{ fontSize: 11, color: C.muted2, textTransform: 'capitalize', marginTop: 2 }}>{l.category}</div>
            {l.detail && <div style={{ fontSize: 12.5, color: C.text, marginTop: 6 }}>{l.detail}</div>}
            {l.contact && <div style={{ fontSize: 11.5, color: C.navy, marginTop: 6, fontWeight: 600 }}>Contact: {l.contact}</div>}
            {isStaff && <button onClick={async () => { if (confirm('Remove listing?')) { await supabase.from('listings').update({ active: false }).eq('id', l.id); reload(); } }} style={{ ...delX, marginTop: 8 }}>Remove</button>}
          </Card>
        ))}
        {listings.length === 0 && <Empty>Nothing listed right now.</Empty>}
      </div>
      {isStaff && <div style={{ marginTop: 14 }}><Button kind="soft" onClick={addListing}>+ Post a listing</Button></div>}
    </>
  );
}

/* ---------------- Financial Reports ---------------- */
function Reports() {
  const { data: charges } = useTable<Charge>('charges');
  const { data: payments } = useTable<Payment>('payments');
  const charged = charges.reduce((s, c) => s + Number(c.amount || 0), 0);
  const collected = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const outstanding = charged - collected;
  return (
    <>
      <H>Financial Reports</H>
      <Card>
        <Row l="Total charged" v={money(charged)} />
        <Row l="Collected" v={money(collected)} />
        <Row l="Outstanding" v={money(outstanding)} last />
      </Card>
      <div style={{ fontSize: 12, color: C.muted2, marginTop: 12, lineHeight: 1.5 }}>
        Figures are across all charges and recorded payments.
      </div>
    </>
  );
}

/* ---------------- Trainer Pay ---------------- */
const PAY_LABEL: Record<string, string> = { per_lesson: 'per lesson', hourly: 'per hour', percent: '% of lesson fee', manual: 'manual' };

function payFor(t: AppUser, ls: Lesson[]) {
  const count = ls.length;
  const hours = ls.reduce((s, l) => s + (Number(l.duration_min) || 60) / 60, 0);
  const feeSum = ls.reduce((s, l) => s + Number(l.fee || 0), 0);
  const rate = Number(t.pay_rate || 0);
  if (t.pay_type === 'per_lesson') return rate * count;
  if (t.pay_type === 'hourly') return rate * hours;
  if (t.pay_type === 'percent') return feeSum * rate / 100;
  return 0;
}

function Pay() {
  const { canViewBilling, user } = useApp();
  const { data: staff, reload } = useTable<AppUser>('users', q => q.neq('role', 'client').order('full_name'));
  const { data: lessons } = useTable<Lesson>('lessons', q => q.order('starts_at'));
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('month');
  const [edit, setEdit] = useState<AppUser | null>(null);

  const now = new Date();
  const start = new Date(now);
  if (period === 'week') { start.setDate(now.getDate() - now.getDay()); start.setHours(0, 0, 0, 0); }
  else if (period === 'month') { start.setDate(1); start.setHours(0, 0, 0, 0); }
  else { start.setFullYear(2000); }
  const inRange = (iso: string) => new Date(iso) >= start;

  const shown = canViewBilling ? staff : staff.filter(s => s.id === user?.id);

  const periodBtn = (p: typeof period, l: string) => (
    <button key={p} onClick={() => setPeriod(p)} style={{ flex: 1, border: 'none', borderRadius: 10, padding: '9px 4px', fontSize: 12.5, fontWeight: 700, background: period === p ? C.navy : '#fff', color: period === p ? '#fff' : C.muted }}>{l}</button>
  );

  return (
    <>
      <H>{canViewBilling ? 'Trainer Pay' : 'My Pay'}</H>
      <div style={{ display: 'flex', gap: 7, marginBottom: 12 }}>
        {periodBtn('week', 'This week')}
        {periodBtn('month', 'This month')}
        {periodBtn('all', 'All time')}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {shown.map(t => {
          const ls = lessons.filter(l => l.trainer_id === t.id && inRange(l.starts_at));
          const amt = payFor(t, ls);
          const configured = !!t.pay_type && t.pay_type !== 'manual';
          return (
            <Card key={t.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{t.full_name || t.email}</div>
                  <div style={{ fontSize: 11, color: C.muted2 }}>
                    {ls.length} lesson{ls.length === 1 ? '' : 's'}
                    {t.pay_type ? ` · ${money(Number(t.pay_rate || 0))}${t.pay_type === 'percent' ? '%' : ''} ${PAY_LABEL[t.pay_type]}` : ' · pay not set'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: serif, fontSize: 20, color: C.green }}>{configured ? money(amt) : '—'}</div>
                </div>
              </div>
              {canViewBilling && (
                <button onClick={() => setEdit(t)} style={{ ...chip, marginTop: 10 }}>{t.pay_type ? 'Edit pay' : 'Set pay'}</button>
              )}
            </Card>
          );
        })}
        {shown.length === 0 && <Empty>No trainers yet.</Empty>}
      </div>

      <div style={{ fontSize: 11, color: C.muted2, marginTop: 12, lineHeight: 1.5 }}>
        Totals count lessons assigned to each trainer in the selected period. Set each person's pay type (per lesson, hourly, or a percentage of the lesson fee).
      </div>

      {edit && <PayConfigModal staff={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
    </>
  );
}

function PayConfigModal({ staff, onClose, onSaved }: { staff: AppUser; onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState(staff.pay_type || 'per_lesson');
  const [rate, setRate] = useState(String(staff.pay_rate ?? ''));
  const [busy, setBusy] = useState(false);
  const rateLabel = type === 'per_lesson' ? 'Amount per lesson ($)' : type === 'hourly' ? 'Amount per hour ($)' : type === 'percent' ? 'Percent of lesson fee (%)' : 'Rate';

  async function save() {
    setBusy(true);
    await supabase.from('users').update({ pay_type: type, pay_rate: Number(rate) || 0 }).eq('id', staff.id);
    setBusy(false); onSaved();
  }
  const inp: React.CSSProperties = { width: '100%', border: `1px solid ${C.page}`, borderRadius: 12, padding: '12px 13px', fontSize: 14, background: '#fff', outline: 'none', marginBottom: 10, fontFamily: 'inherit' };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(14,21,48,0.5)', zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.page, width: '100%', maxWidth: 430, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: '22px 20px 30px' }}>
        <div style={{ fontFamily: serif, fontSize: 23, color: C.navy, marginBottom: 2 }}>Pay for {staff.full_name || staff.email}</div>
        <div style={{ fontSize: 12, color: C.muted2, marginBottom: 14 }}>How is this person paid?</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 12 }}>
          {([['per_lesson', 'Per lesson'], ['hourly', 'Hourly'], ['percent', '% of fee'], ['manual', 'Manual']] as const).map(([v, l]) => (
            <button key={v} onClick={() => setType(v)} style={{ border: 'none', borderRadius: 10, padding: '11px 4px', fontSize: 12.5, fontWeight: 700, background: type === v ? C.navy : '#fff', color: type === v ? '#fff' : C.muted }}>{l}</button>
          ))}
        </div>
        {type !== 'manual' && (
          <>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: C.muted, marginBottom: 5 }}>{rateLabel}</div>
            <input style={inp} value={rate} onChange={e => setRate(e.target.value)} inputMode="decimal" placeholder="0" />
          </>
        )}
        {type === 'manual' && <div style={{ fontSize: 12.5, color: C.muted2, marginBottom: 10 }}>You'll track this person's pay yourself; the app won't auto-calculate it.</div>}
        <Button disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</Button>
        <Button kind="ghost" onClick={onClose} style={{ marginTop: 10 }}>Cancel</Button>
      </div>
    </div>
  );
}

/* ---------------- Documents & Contracts (e-sign) ---------------- */
function Documents() {
  const { isStaff, user, barn } = useApp();
  const { data: docs, reload } = useTable<BarnDocument>('barn_documents', q => q.order('created_at'));
  const { data: sigs } = useTable<Signature>('signatures');
  const { data: families } = useTable<Family>('families');
  const [open, setOpen] = useState<BarnDocument | null>(null);
  const [adding, setAdding] = useState(false);

  const sigsFor = (docId: string) => sigs.filter(s => s.document_id === docId);
  const famName = (id: string | null) => families.find(f => f.id === id)?.family_name || 'Family';

  if (open && isStaff) {
    const list = sigsFor(open.id);
    return (
      <>
        <button onClick={() => setOpen(null)} style={backBtn}>‹ Documents</button>
        <div style={{ fontFamily: serif, fontSize: 24, color: C.navy }}>{open.title}</div>
        <div style={{ fontSize: 12, color: C.muted2, marginBottom: 12 }}>{open.required ? 'Required' : 'Optional'} · {open.active ? 'Active' : 'Hidden'}</div>
        {open.body && <Card style={{ whiteSpace: 'pre-wrap', fontSize: 12.5, color: C.text, lineHeight: 1.6, marginBottom: 12 }}>{open.body}</Card>}
        <SectionLabel>Signatures ({list.length})</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {list.map(s => (
            <Card key={s.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{famName(s.family_id)}</div>
                <div style={{ fontSize: 10.5, color: C.muted2 }}>{new Date(s.signed_at).toLocaleDateString()}</div>
              </div>
              {s.method === 'drawn' && s.signature_data
                ? <img src={s.signature_data} alt="signature" style={{ height: 48, marginTop: 6 }} />
                : <div style={{ fontFamily: serif, fontSize: 20, color: C.navy, marginTop: 4 }}>{s.signer_name || s.signature_data}</div>}
            </Card>
          ))}
          {list.length === 0 && <Empty>No one has signed this yet.</Empty>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 16 }}>
          <Button kind="ghost" onClick={async () => { await supabase.from('barn_documents').update({ required: !open.required }).eq('id', open.id); setOpen(null); reload(); }}>
            {open.required ? 'Make optional' : 'Make required'}
          </Button>
          <Button kind="ghost" onClick={async () => { await supabase.from('barn_documents').update({ active: !open.active }).eq('id', open.id); setOpen(null); reload(); }}>
            {open.active ? 'Hide from families' : 'Show to families'}
          </Button>
          <Button kind="ghost" style={{ color: C.red }} onClick={async () => { if (confirm(`Delete "${open.title}" and its signatures?`)) { await supabase.from('barn_documents').delete().eq('id', open.id); setOpen(null); reload(); } }}>
            Delete document
          </Button>
        </div>
      </>
    );
  }

  if (open && !isStaff) {
    const mySig = sigs.find(s => s.document_id === open.id && s.family_id === user?.family_id);
    return <ClientDocView doc={open} sig={mySig} onBack={() => setOpen(null)} />;
  }

  const visible = isStaff ? docs : docs.filter(d => d.active);
  const mySignedIds = new Set(sigs.filter(s => s.family_id === user?.family_id).map(s => s.document_id));

  return (
    <>
      <H>Documents &amp; Contracts</H>
      {isStaff && (
        <div style={{ fontSize: 12, color: C.muted2, marginBottom: 10, lineHeight: 1.5 }}>
          Documents you add here are shown to families to sign. Mark one <b>required</b> and a family must sign it before they can use the app.
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {visible.map(d => (
          <Card key={d.id} onClick={() => setOpen(d)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>{d.title}</div>
              <div style={{ fontSize: 11, color: C.muted2 }}>
                {isStaff
                  ? `${d.required ? 'Required' : 'Optional'} · ${sigsFor(d.id).length} signed${d.active ? '' : ' · hidden'}`
                  : (d.required ? 'Required' : 'Optional')}
              </div>
            </div>
            {isStaff
              ? <Icon d={ICONS.chevron} size={17} stroke={C.faint} />
              : <Pill color={mySignedIds.has(d.id) ? C.green : C.gold}>{mySignedIds.has(d.id) ? 'signed' : 'unsigned'}</Pill>}
          </Card>
        ))}
        {visible.length === 0 && <Empty>{isStaff ? 'No documents yet. Add your first waiver or contract below.' : 'No documents to sign.'}</Empty>}
      </div>
      {isStaff && <div style={{ marginTop: 14 }}><Button kind="soft" onClick={() => setAdding(true)}>+ Add a document</Button></div>}
      {adding && <AddDocModal barnId={barn?.id} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); reload(); }} />}
    </>
  );
}

function AddDocModal({ barnId, onClose, onSaved }: { barnId?: string; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [required, setRequired] = useState(true);
  const [busy, setBusy] = useState(false);
  const inp: React.CSSProperties = { width: '100%', border: `1px solid ${C.page}`, borderRadius: 12, padding: '12px 13px', fontSize: 14, background: '#fff', outline: 'none', marginBottom: 10, fontFamily: 'inherit' };

  async function save() {
    if (!title.trim()) return;
    setBusy(true);
    await supabase.from('barn_documents').insert({ barn_id: barnId, title: title.trim(), body: body.trim(), required, active: true });
    setBusy(false); onSaved();
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(14,21,48,0.5)', zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.page, width: '100%', maxWidth: 430, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: '22px 20px 30px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontFamily: serif, fontSize: 24, color: C.navy, marginBottom: 12 }}>Add a document</div>
        <input style={inp} placeholder='Title (e.g. "Liability Waiver 2026")' value={title} onChange={e => setTitle(e.target.value)} autoFocus />
        <textarea style={{ ...inp, minHeight: 180 }} placeholder="Paste the full document / waiver text here. Families will read this and sign it." value={body} onChange={e => setBody(e.target.value)} />
        <label style={{ display: 'flex', gap: 10, alignItems: 'center', margin: '4px 2px 14px', cursor: 'pointer' }}>
          <input type="checkbox" checked={required} onChange={e => setRequired(e.target.checked)} style={{ width: 20, height: 20 }} />
          <span style={{ fontSize: 13, color: C.text }}>Required — families must sign before using the app</span>
        </label>
        <Button disabled={!title.trim() || busy} onClick={save}>{busy ? 'Saving…' : 'Save document'}</Button>
        <Button kind="ghost" onClick={onClose} style={{ marginTop: 10 }}>Cancel</Button>
      </div>
    </div>
  );
}

function ClientDocView({ doc, sig, onBack }: { doc: BarnDocument; sig?: Signature; onBack: () => void }) {
  return (
    <>
      <button onClick={onBack} style={backBtn}>‹ Documents</button>
      <div style={{ fontFamily: serif, fontSize: 24, color: C.navy }}>{doc.title}</div>
      <div style={{ marginBottom: 12 }}>
        <Pill color={sig ? C.green : C.gold}>{sig ? 'Signed' : 'Not signed'}</Pill>
      </div>
      <Card style={{ whiteSpace: 'pre-wrap', fontSize: 12.5, color: C.text, lineHeight: 1.6 }}>{doc.body || 'No document text.'}</Card>
      {sig && (
        <>
          <SectionLabel>Your signature</SectionLabel>
          <Card>
            {sig.method === 'drawn' && sig.signature_data
              ? <img src={sig.signature_data} alt="signature" style={{ height: 52 }} />
              : <div style={{ fontFamily: serif, fontSize: 22, color: C.navy }}>{sig.signer_name || sig.signature_data}</div>}
            <div style={{ fontSize: 11.5, color: C.muted2, marginTop: 6 }}>Signed {new Date(sig.signed_at).toLocaleDateString()}</div>
          </Card>
        </>
      )}
    </>
  );
}

/* ---------------- Notifications ---------------- */
const notifColor = (k?: string | null) => ({ request: C.gold, approval: C.green, billing: C.red, lesson: C.navy } as any)[k || ''] || C.info;

function Notifications() {
  const { data: notes, reload } = useTable<AppNotification>('notifications', q => q.order('created_at', { ascending: false }));
  const unread = notes.filter(n => !n.read);

  async function markAll() {
    if (!unread.length) return;
    await supabase.from('notifications').update({ read: true }).in('id', unread.map(n => n.id));
    reload();
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <H>Notifications</H>
        {unread.length > 0 && <button onClick={markAll} style={chip}>Mark all read</button>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {notes.map(n => (
          <Card key={n.id} style={{ display: 'flex', gap: 11, alignItems: 'flex-start', opacity: n.read ? 0.6 : 1 }}>
            <div style={{ width: 9, height: 9, borderRadius: 5, marginTop: 5, flex: 'none', background: n.read ? C.faint : notifColor(n.kind) }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>{n.title}</div>
              {n.body && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{n.body}</div>}
              <div style={{ fontSize: 10.5, color: C.muted2, marginTop: 3 }}>{new Date(n.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>
            </div>
          </Card>
        ))}
        {notes.length === 0 && <Empty>You’re all caught up.</Empty>}
      </div>
    </>
  );
}

/* ---------------- Barn Settings ---------------- */
function Settings() {
  const { barn, refresh } = useApp();
  const [saving, setSaving] = useState('');
  if (!barn) return <Empty>Loading…</Empty>;

  async function set(patch: Record<string, any>, label: string) {
    setSaving(label);
    await supabase.from('barns').update(patch).eq('id', barn!.id);
    await refresh();
    setSaving('');
  }
  const inp: React.CSSProperties = { width: '100%', border: `1px solid ${C.page}`, borderRadius: 12, padding: '12px 13px', fontSize: 14, background: '#fff', outline: 'none', marginBottom: 10, fontFamily: 'inherit' };

  return (
    <>
      <H>Barn Settings</H>

      <SectionLabel>Barn</SectionLabel>
      <input style={inp} defaultValue={barn.name} placeholder="Barn name" onBlur={e => e.target.value !== barn.name && set({ name: e.target.value }, 'name')} />
      <input style={inp} defaultValue={barn.phone || ''} placeholder="Phone" onBlur={e => set({ phone: e.target.value }, 'phone')} />
      <input style={inp} defaultValue={barn.email || ''} placeholder="Email" onBlur={e => set({ email: e.target.value }, 'email')} />

      <SectionLabel>Brand color</SectionLabel>
      <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
        {BRAND_OPTIONS.map(o => (
          <button key={o.value} onClick={() => set({ brand_color: o.value }, 'brand')} style={{
            width: 40, height: 40, borderRadius: 12, background: o.value, cursor: 'pointer',
            border: barn.brand_color === o.value ? `3px solid ${C.gold}` : '3px solid transparent',
          }} title={o.name} />
        ))}
      </div>

      <SectionLabel>Payment handles</SectionLabel>
      <div style={{ fontSize: 11.5, color: C.muted2, marginBottom: 8 }}>Powers the one-tap pay buttons clients see. Username / cashtag only.</div>
      <input style={inp} defaultValue={barn.venmo || ''} placeholder="Venmo username" onBlur={e => set({ venmo: e.target.value }, 'venmo')} />
      <input style={inp} defaultValue={barn.cashapp || ''} placeholder="Cash App $cashtag" onBlur={e => set({ cashapp: e.target.value }, 'cashapp')} />
      <input style={inp} defaultValue={barn.paypal || ''} placeholder="PayPal.me handle" onBlur={e => set({ paypal: e.target.value }, 'paypal')} />

      <SectionLabel>Arena hours (for open-ride availability)</SectionLabel>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: C.muted, marginBottom: 5 }}>Opens</div>
          <input style={inp} defaultValue={barn.arena_open || '7:00 AM'} placeholder="7:00 AM" onBlur={e => set({ arena_open: e.target.value }, 'ao')} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: C.muted, marginBottom: 5 }}>Closes</div>
          <input style={inp} defaultValue={barn.arena_close || '7:00 PM'} placeholder="7:00 PM" onBlur={e => set({ arena_close: e.target.value }, 'ac')} />
        </div>
      </div>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: C.muted, marginBottom: 5 }}>Time-slot length (minutes)</div>
      <input style={inp} defaultValue={String(barn.arena_slot_min || 60)} inputMode="numeric" onBlur={e => set({ arena_slot_min: Number(e.target.value) || 60 }, 'as')} />
      <div style={{ fontSize: 11.5, fontWeight: 700, color: C.muted, marginBottom: 6 }}>Days open</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => {
          const days = barn.arena_days || {};
          const on = days[String(i)] !== false;
          return (
            <button key={i} onClick={() => set({ arena_days: { ...days, [String(i)]: !on } }, 'ad')} style={{
              border: 'none', borderRadius: 10, padding: '9px 11px', fontSize: 12, fontWeight: 700,
              background: on ? C.navy : '#fff', color: on ? '#fff' : C.muted,
            }}>{d}</button>
          );
        })}
      </div>

      <SectionLabel>Permissions</SectionLabel>
      <Card style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Head trainer can edit billing</span>
        <input type="checkbox" defaultChecked={!!barn.head_can_edit_billing} onChange={e => set({ head_can_edit_billing: e.target.checked }, 'perm')} style={{ width: 20, height: 20 }} />
      </Card>

      {saving && <div style={{ fontSize: 12, color: C.green, marginTop: 12, fontWeight: 600 }}>Saved ✓</div>}
    </>
  );
}

/* ---------------- My Bill (client) ---------------- */
function MyBill() {
  const { user } = useApp();
  const { data: families } = useTable<Family>('families', q => q.eq('id', user?.family_id));
  const { data: charges, reload: reloadC } = useTable<Charge>('charges', q => q.eq('family_id', user?.family_id));
  const { data: payments, reload: reloadP } = useTable<Payment>('payments', q => q.eq('family_id', user?.family_id));
  const fam = families[0];
  if (!user?.family_id || !fam) return <Empty>No bill on file yet.</Empty>;
  return <FamilyBill family={fam} charges={charges} payments={payments} onBack={() => {}} hideBack canEdit={false} onChange={() => { reloadC(); reloadP(); }} />;
}

/* ---------------- Profile ---------------- */
function Profile() {
  const { user, role, refresh } = useApp();
  async function editName() {
    const name = prompt('Your name?', user?.full_name || ''); if (!name) return;
    await supabase.from('users').update({ full_name: name }).eq('id', user!.id);
    await refresh();
  }
  return (
    <>
      <H>My Profile</H>
      <Card>
        <Row l="Name" v={user?.full_name || '—'} />
        <Row l="Email" v={user?.email || '—'} />
        <Row l="Role" v={<span style={{ textTransform: 'capitalize' }}>{(role || '').replace('_', ' ')}</span>} last />
      </Card>
      <div style={{ marginTop: 14 }}><Button kind="ghost" onClick={editName}>Edit my name</Button></div>
    </>
  );
}

/* ---------------- shared styles ---------------- */
const delX: React.CSSProperties = { background: C.redBg, color: C.red, border: 'none', borderRadius: 10, padding: '7px 11px', fontSize: 11, fontWeight: 700, flex: 'none' };
const chip: React.CSSProperties = { background: C.goldTint, color: C.navy, border: 'none', borderRadius: 20, padding: '7px 13px', fontSize: 11.5, fontWeight: 800 };
const backBtn: React.CSSProperties = { background: '#fff', border: 'none', borderRadius: 11, padding: '8px 13px', fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 12 };
