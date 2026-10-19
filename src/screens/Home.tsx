import { useMemo, useState } from 'react';
import { C, serif, money } from '../theme';
import { Card, SectionLabel, Pill } from '../ui';
import { BrandHeader } from './Header';
import { useApp } from '../AppContext';
import { useTable } from '../db';
import { supabase } from '../supabase';
import { notify } from '../notify';
import { getHomePrefs, setHomePrefs, moduleOn, Timeframe } from '../prefs';
import { Nav } from '../App';
import { Lesson, Horse, Charge, Payment, Family, ArenaBooking } from '../types';

export default function Home({ nav }: { nav: Nav }) {
  const { user, barn, isClient, isStaff, canViewBilling } = useApp();
  const [prefs, setPrefs] = useState(getHomePrefs());
  const setTf = (tf: Timeframe) => { const p = { ...prefs, timeframe: tf }; setPrefs(p); setHomePrefs(p); };
  const { data: lessons } = useTable<Lesson>('lessons', q => q.order('starts_at'));
  const { data: horses } = useTable<Horse>('horses', q => q.order('farrier_next'));
  const { data: charges } = useTable<Charge>('charges');
  const { data: payments } = useTable<Payment>('payments');
  const { data: families } = useTable<Family>('families');
  const { data: arenaReq, reload: reloadArena } = useTable<ArenaBooking>('arena_bookings', q => q.eq('status', 'requested').order('date'));
  const { data: schedReq } = useTable<any>('schedule_requests', q => q.neq('status', 'approved').order('created_at'));

  async function arenaAct(b: ArenaBooking, status: string) {
    await supabase.from('arena_bookings').update({ status }).eq('id', b.id);
    if (b.family_id) await notify({ barn_id: barn?.id, family_id: b.family_id, kind: 'approval', title: `Arena time ${status === 'approved' ? 'approved' : 'declined'}`, body: `${new Date(b.date + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${b.start_label}` });
    reloadArena();
  }

  const todayKey = new Date().toISOString().slice(0, 10);
  const endKey = useMemo(() => {
    const d = new Date();
    if (prefs.timeframe === 'week') d.setDate(d.getDate() + 7);
    else if (prefs.timeframe === 'month') d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  }, [prefs.timeframe]);
  const upcoming = useMemo(
    () => lessons.filter(l => {
      const k = l.starts_at.slice(0, 10);
      if (k < todayKey) return false;
      return prefs.timeframe === 'day' ? k === todayKey : k <= endKey;
    }).slice(0, 20),
    [lessons, todayKey, endKey, prefs.timeframe]
  );

  const careDue = horses.filter(h => h.care_level === 'soon' || h.care_level === 'overdue');
  const balOf = (fid: string) =>
    charges.filter(c => c.family_id === fid).reduce((s, c) => s + Number(c.amount || 0), 0) -
    payments.filter(p => p.family_id === fid).reduce((s, p) => s + Number(p.amount || 0), 0);
  const overdue = families.filter(f => balOf(f.id) > 0);
  const myBalance = isClient && user?.family_id ? balOf(user.family_id) : 0;

  const jump = isClient
    ? [{ l: 'Schedule', t: 'calendar' }, { l: 'My Horse', t: 'horses' }, { l: 'My Bill', t: 'more', s: 'mybill' }]
    : [{ l: 'Admin Overview', t: 'more', s: 'overview' }, { l: 'Schedule', t: 'calendar' }, { l: 'Horses', t: 'horses' }, { l: 'Clients', t: 'more', s: 'clients' }, { l: 'Care', t: 'more', s: 'care' }];


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

        {/* Persistent "action needed" alert for staff — stays until they respond */}
        {isStaff && moduleOn(prefs, 'requests') && (arenaReq.length + schedReq.length) > 0 && (
          <div style={{ marginTop: 10, background: C.redBg, border: `1px solid ${C.red}44`, borderRadius: 16, padding: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.red, letterSpacing: '0.03em', marginBottom: 10 }}>
              ⚠ NEEDS YOUR RESPONSE ({arenaReq.length + schedReq.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {arenaReq.map(b => (
                <div key={b.id} style={{ background: '#fff', borderRadius: 12, padding: '11px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Arena request · {b.rider_name || 'Client'}</div>
                    <div style={{ fontSize: 11, color: C.muted2 }}>{new Date(b.date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · {b.start_label}</div>
                  </div>
                  <button onClick={() => arenaAct(b, 'approved')} style={homeAct(C.green)}>Approve</button>
                  <button onClick={() => arenaAct(b, 'denied')} style={homeAct(C.red)}>Deny</button>
                </div>
              ))}
              {schedReq.map((r: any) => (
                <div key={r.id} style={{ background: '#fff', borderRadius: 12, padding: '11px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{r.kind || 'Schedule'} request · {r.rider_name || 'Client'}</div>
                    <div style={{ fontSize: 11, color: C.muted2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.orig || r.reason || ''}</div>
                  </div>
                  <button onClick={() => nav.go('more', 'requests')} style={homeAct(C.navy)}>Review</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {isClient && moduleOn(prefs, 'balance') && myBalance > 0 && (
          <>
            <SectionLabel>Your balance</SectionLabel>
            <Card onClick={() => nav.go('more', 'mybill')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: serif, fontSize: 24, color: C.red }}>{money(myBalance)}</div>
                <div style={{ fontSize: 11.5, color: C.muted2 }}>Tap to view & pay</div>
              </div>
              <Pill color={C.red}>due</Pill>
            </Card>
          </>
        )}

        {isStaff && moduleOn(prefs, 'attention') && (careDue.length > 0 || (canViewBilling && overdue.length > 0)) && (
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

        {moduleOn(prefs, 'upcoming') && (<>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '18px 0 9px' }}>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.07em', color: C.faint, textTransform: 'uppercase' }}>Upcoming</span>
          <div style={{ display: 'flex', gap: 4, background: '#fff', borderRadius: 20, padding: 3 }}>
            {(['day', 'week', 'month'] as Timeframe[]).map(tf => (
              <button key={tf} onClick={() => setTf(tf)} style={{
                border: 'none', borderRadius: 18, padding: '5px 11px', fontSize: 11, fontWeight: 700, textTransform: 'capitalize',
                background: prefs.timeframe === tf ? C.navy : 'transparent', color: prefs.timeframe === tf ? '#fff' : C.muted,
              }}>{tf}</button>
            ))}
          </div>
        </div>
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
              Nothing scheduled {prefs.timeframe === 'day' ? 'today' : prefs.timeframe === 'week' ? 'this week' : 'this month'}.
            </div>
          )}
        </div>
        </>)}
      </div>
    </div>
  );
}

const homeAct = (color: string): React.CSSProperties => ({ background: color + '1a', color, border: 'none', borderRadius: 9, padding: '7px 11px', fontSize: 11.5, fontWeight: 800, flex: 'none' });
