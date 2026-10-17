import { C, serif, money } from '../theme';
import { Card, SectionLabel, Icon, ICONS } from '../ui';
import { useApp } from '../AppContext';
import { useTable } from '../db';
import { Nav } from '../App';
import {
  Family, Horse, Rider, Lesson, Charge, Payment, BarnDocument, Signature, AppUser, TaskRow,
} from '../types';

export default function AdminOverview({ nav }: { nav: Nav }) {
  const { canViewBilling } = useApp();
  const { data: horses } = useTable<Horse>('horses');
  const { data: families } = useTable<Family>('families');
  const { data: riders } = useTable<Rider>('riders');
  const { data: staff } = useTable<AppUser>('users', q => q.neq('role', 'client'));
  const { data: lessons } = useTable<Lesson>('lessons');
  const { data: charges } = useTable<Charge>('charges');
  const { data: payments } = useTable<Payment>('payments');
  const { data: bdocs } = useTable<BarnDocument>('barn_documents', q => q.eq('active', true).eq('required', true));
  const { data: sigs } = useTable<Signature>('signatures');
  const { data: tasks } = useTable<TaskRow>('tasks');

  const barnOwned = horses.filter(h => h.barn_owned).length;
  const boarders = horses.length - barnOwned;

  const balOf = (fid: string) =>
    charges.filter(c => c.family_id === fid).reduce((s, c) => s + Number(c.amount || 0), 0) -
    payments.filter(p => p.family_id === fid).reduce((s, p) => s + Number(p.amount || 0), 0);
  const charged = charges.reduce((s, c) => s + Number(c.amount || 0), 0);
  const collected = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const outstanding = charged - collected;
  const overdueFamilies = families.filter(f => balOf(f.id) > 0);

  const careDue = horses.filter(h => h.care_level === 'soon' || h.care_level === 'overdue');
  const critical = horses.filter(h => (h.critical_notes || []).length > 0);
  const famMissingDocs = families.filter(f => bdocs.some(d => !sigs.some(s => s.document_id === d.id && s.family_id === f.id)));
  const openTasks = tasks.filter(t => !t.done);

  const stats: { n: string; l: string; go: () => void }[] = [
    { n: String(horses.length), l: `Horses · ${barnOwned} barn / ${boarders} board`, go: () => nav.go('horses') },
    { n: String(families.length), l: 'Families', go: () => nav.go('more', 'clients') },
    { n: String(riders.length), l: 'Riders', go: () => nav.go('more', 'riders') },
    { n: String(staff.length), l: 'Staff', go: () => nav.go('more', 'staff') },
    { n: String(lessons.length), l: 'Lessons on file', go: () => nav.go('calendar') },
    { n: String(openTasks.length), l: 'Open tasks', go: () => nav.go('more', 'staff') },
  ];

  type Flag = { title: string; count: number; color: string; bg: string; go: () => void; detail?: string };
  const flags: Flag[] = [];
  if (canViewBilling && overdueFamilies.length)
    flags.push({ title: 'Accounts with a balance', count: overdueFamilies.length, color: C.red, bg: C.redBg, go: () => nav.go('billing'), detail: money(outstanding) + ' outstanding' });
  if (careDue.length)
    flags.push({ title: 'Farrier / vet due soon', count: careDue.length, color: C.gold, bg: C.goldTint, go: () => nav.go('more', 'care'), detail: careDue.slice(0, 3).map(h => h.name).join(', ') });
  if (famMissingDocs.length)
    flags.push({ title: 'Families with unsigned documents', count: famMissingDocs.length, color: C.purple, bg: C.purpleBg, go: () => nav.go('more', 'documents') });
  if (critical.length)
    flags.push({ title: 'Horses with critical notes', count: critical.length, color: C.red, bg: C.redBg, go: () => nav.go('horses'), detail: critical.slice(0, 3).map(h => h.name).join(', ') });

  return (
    <div style={{ marginTop: -6 }}>
      <div style={{ fontFamily: serif, fontSize: 27, color: C.navy, marginBottom: 3 }}>Admin Overview</div>
      <div style={{ fontSize: 12, color: C.muted2, marginBottom: 14 }}>The whole barn at a glance. Tap anything to jump in and fix it.</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
        {stats.map((s, i) => (
          <Card key={i} onClick={s.go} style={{ padding: 13 }}>
            <div style={{ fontFamily: serif, fontSize: 26, color: C.navy, lineHeight: 1 }}>{s.n}</div>
            <div style={{ fontSize: 10.5, color: C.muted2, marginTop: 4, lineHeight: 1.3 }}>{s.l}</div>
          </Card>
        ))}
      </div>

      {canViewBilling && (
        <>
          <SectionLabel>Money</SectionLabel>
          <Card>
            <MoneyRow l="Charged" v={money(charged)} c={C.navy} />
            <MoneyRow l="Collected" v={money(collected)} c={C.green} />
            <MoneyRow l="Outstanding" v={money(outstanding)} c={outstanding > 0 ? C.red : C.green} last />
            <button onClick={() => nav.go('billing')} style={jump}>Open Billing →</button>
          </Card>
        </>
      )}

      <SectionLabel>Needs attention</SectionLabel>
      {flags.length === 0 && <Card><div style={{ fontSize: 13, color: C.muted, textAlign: 'center', padding: 8 }}>Nothing flagged. Everything looks in order. 🐴</div></Card>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {flags.map((f, i) => (
          <Card key={i} onClick={f.go} style={{ background: f.bg, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, flex: 'none', background: f.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: serif, fontSize: 16 }}>{f.count}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>{f.title}</div>
              {f.detail && <div style={{ fontSize: 11, color: C.muted, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.detail}</div>}
            </div>
            <Icon d={ICONS.chevron} size={18} stroke={f.color} />
          </Card>
        ))}
      </div>

      <SectionLabel>Manage</SectionLabel>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[
          ['Horses', () => nav.go('horses')],
          ['Clients & Families', () => nav.go('more', 'clients')],
          ['Riders', () => nav.go('more', 'riders')],
          ['Staff & Tasks', () => nav.go('more', 'staff')],
          ['Schedule', () => nav.go('calendar')],
          ['Care', () => nav.go('more', 'care')],
          ['Documents', () => nav.go('more', 'documents')],
          ['Barn Settings', () => nav.go('more', 'settings')],
        ].map(([l, go], i) => (
          <button key={i} onClick={go as () => void} style={{
            background: '#fff', border: 'none', borderRadius: 20, padding: '10px 15px',
            fontSize: 12, fontWeight: 700, color: C.navy, boxShadow: '0 1px 0 rgba(40,58,109,0.05)',
          }}>{l as string}</button>
        ))}
      </div>
    </div>
  );
}

function MoneyRow({ l, v, c, last }: { l: string; v: string; c: string; last?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: last ? 'none' : `1px solid rgba(40,58,109,0.06)` }}>
      <span style={{ fontSize: 12.5, color: C.muted2 }}>{l}</span>
      <span style={{ fontFamily: serif, fontSize: 18, color: c }}>{v}</span>
    </div>
  );
}

const jump: React.CSSProperties = {
  width: '100%', marginTop: 12, background: C.goldTint, color: C.navy, border: 'none',
  borderRadius: 12, padding: 12, fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
};
