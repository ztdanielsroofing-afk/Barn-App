import { useMemo } from 'react';
import { C, serif, money } from '../theme';
import { Card, SectionLabel, Pill } from '../ui';
import { BrandHeader } from './Header';
import { useApp } from '../AppContext';
import { useTable } from '../db';
import { Nav } from '../App';
import { Lesson, Horse, Invoice, Family } from '../types';

export default function Home({ nav }: { nav: Nav }) {
  const { user, isClient, isStaff, canViewBilling } = useApp();
  const { data: lessons } = useTable<Lesson>('lessons', q => q.order('starts_at'));
  const { data: horses } = useTable<Horse>('horses', q => q.order('farrier_next'));
  const { data: invoices } = useTable<Invoice>('invoices');
  const { data: _families } = useTable<Family>('families');

  const todayKey = new Date().toISOString().slice(0, 10);
  const upcoming = useMemo(
    () => lessons.filter(l => l.starts_at.slice(0, 10) >= todayKey).slice(0, 4),
    [lessons, todayKey]
  );

  const careDue = horses.filter(h => h.care_level === 'soon' || h.care_level === 'overdue');
  const overdue = invoices.filter(i => i.status === 'overdue');

  const jump = isClient
    ? [{ l: 'Schedule', t: 'calendar' }, { l: 'My Horse', t: 'horses' }, { l: 'My Bill', t: 'more', s: 'mybill' }]
    : [{ l: 'Admin Overview', t: 'more', s: 'overview' }, { l: 'Schedule', t: 'calendar' }, { l: 'Horses', t: 'horses' }, { l: 'Clients', t: 'more', s: 'clients' }, { l: 'Care', t: 'more', s: 'care' }];

  const myInvoice = isClient ? invoices.find(i => i.family_id === user?.family_id && Number(i.due) > 0) : null;

  return (
    <div>
      <BrandHeader
        title={`Welcome${user?.full_name ? ', ' + user.full_name.split(' ')[0] : ''}`}
        subtitle={new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
      />
      <div style={{ padding: '16px 20px 30px' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
          {jump.map((j, i) => (
            <button key={i} onClick={() => nav.go(j.t, (j as any).s)} style={{
              background: '#fff', border: 'none', borderRadius: 20, padding: '9px 14px',
              fontSize: 12, fontWeight: 700, color: C.navy, boxShadow: '0 1px 0 rgba(40,58,109,0.05)',
            }}>{j.l}</button>
          ))}
        </div>

        {isClient && myInvoice && (
          <>
            <SectionLabel>Your balance</SectionLabel>
            <Card onClick={() => nav.go('more', 'mybill')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: serif, fontSize: 24, color: C.red }}>{money(myInvoice.due)}</div>
                <div style={{ fontSize: 11.5, color: C.muted2 }}>Tap to view & pay</div>
              </div>
              <Pill color={C.red}>due</Pill>
            </Card>
          </>
        )}

        {isStaff && (careDue.length > 0 || (canViewBilling && overdue.length > 0)) && (
          <>
            <SectionLabel>Needs your attention</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {canViewBilling && overdue.length > 0 && (
                <Card onClick={() => nav.go('billing')} style={{ background: C.redBg, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{overdue.length} overdue account{overdue.length > 1 ? 's' : ''}</span>
                  <Pill color={C.red}>review</Pill>
                </Card>
              )}
              {careDue.length > 0 && (
                <Card onClick={() => nav.go('more', 'care')} style={{ background: C.goldTint, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{careDue.length} horse{careDue.length > 1 ? 's' : ''} due for farrier/vet</span>
                  <Pill color={C.gold}>soon</Pill>
                </Card>
              )}
            </div>
          </>
        )}

        <SectionLabel>Upcoming</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {upcoming.map(l => (
            <Card key={l.id} onClick={() => nav.go('calendar')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>{l.rider_name || 'Lesson'}{l.horse_name ? ` · ${l.horse_name}` : ''}</div>
                <div style={{ fontSize: 11, color: C.muted2 }}>
                  {new Date(l.starts_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}{l.time_label ? ` · ${l.time_label}` : ''}
                </div>
              </div>
              <Pill color={C.navy}>{l.lesson_type}</Pill>
            </Card>
          ))}
          {upcoming.length === 0 && (
            <div style={{ textAlign: 'center', color: C.muted2, fontSize: 13, padding: '18px 12px', background: 'rgba(255,255,255,0.5)', borderRadius: 14 }}>
              Nothing scheduled yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
