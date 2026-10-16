import { useState, useEffect } from 'react';
import { isConfigured, supabase } from './supabase';
import { useApp } from './AppContext';
import { C, serif } from './theme';
import { Icon, ICONS } from './ui';
import Setup from './screens/Setup';
import Login from './screens/Login';
import Home from './screens/Home';
import Schedule from './screens/Schedule';
import Horses from './screens/Horses';
import Billing from './screens/Billing';
import More from './screens/More';
import CompleteProfile from './screens/CompleteProfile';

export type Nav = { go: (tab: string, section?: string, params?: any) => void };

export default function App() {
  const { loading, session, user, barn, role, actualRole, previewRole, setPreviewRole, canViewBilling, isClient, refresh } = useApp();
  const [tab, setTab] = useState('home');
  const [section, setSection] = useState<string | null>(null);
  const [params, setParams] = useState<any>(null);
  const [onboardNeeded, setOnboardNeeded] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (actualRole === 'client') {
        if (!user?.family_id) {
          if (active) setOnboardNeeded(true);
          return;
        }
        const { data } = await supabase.from('families').select('onboarded').eq('id', user.family_id).maybeSingle();
        if (active) setOnboardNeeded(data ? (data as any).onboarded === false : true);
      } else if (active) {
        setOnboardNeeded(false);
      }
    })();
    return () => { active = false; };
  }, [actualRole, user?.family_id]);

  if (!isConfigured) return <Setup />;

  if (loading) {
    return (
      <div className="phone" style={{ alignItems: 'center', justifyContent: 'center', background: C.navyDeep }}>
        <div style={{ color: C.goldLight, fontFamily: serif, fontSize: 22 }}>Free Rein</div>
      </div>
    );
  }

  if (!session) return <Login />;

  if (session && !user) {
    return (
      <div className="phone" style={{ alignItems: 'center', justifyContent: 'center', background: C.page, padding: 30, textAlign: 'center' }}>
        <div>
          <div style={{ fontFamily: serif, fontSize: 24, color: C.navy, marginBottom: 10 }}>Setting up your account…</div>
          <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
            Your login worked, but your barn profile isn't ready yet. If this is a
            brand-new Supabase project, make sure the schema has been run (it creates
            your profile automatically on sign-up). Then refresh.
          </p>
          <button onClick={() => location.reload()} style={{ marginTop: 16, background: C.navy, color: '#fff', border: 'none', borderRadius: 12, padding: '11px 20px', fontWeight: 700 }}>Refresh</button>
        </div>
      </div>
    );
  }

  // Newly-invited client who hasn't filled in their family profile yet.
  // (Fires whether or not a family is linked — the form creates/attaches it.)
  if (actualRole === 'client' && onboardNeeded === true) {
    return <CompleteProfile onDone={async () => { await refresh(); setOnboardNeeded(false); }} />;
  }

  const nav: Nav = {
    go: (t, s = undefined, p = null) => { setTab(t); setSection(s ?? null); setParams(p); },
  };

  const tabs = isClient
    ? [
        { key: 'home', label: 'Home', d: ICONS.home },
        { key: 'calendar', label: 'Schedule', d: ICONS.calendar },
        { key: 'horses', label: 'My Horse', d: ICONS.horse },
        { key: 'more', label: 'More', d: ICONS.more },
      ]
    : [
        { key: 'home', label: 'Home', d: ICONS.home },
        { key: 'calendar', label: 'Schedule', d: ICONS.calendar },
        { key: 'horses', label: 'Horses', d: ICONS.horse },
        ...(canViewBilling ? [{ key: 'billing', label: 'Billing', d: ICONS.billing }] : []),
        { key: 'more', label: 'More', d: ICONS.more },
      ];

  const previewing = actualRole === 'owner' && previewRole && previewRole !== 'owner';
  const roleLabel = (r: string) => ({ owner: 'Owner', head_trainer: 'Head Trainer', trainer: 'Trainer', client: 'Client' } as any)[r] || r;

  return (
    <div className="phone">
      {previewing && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50,
          background: C.gold, color: C.navyDeep, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '8px 14px', fontSize: 12.5, fontWeight: 800,
        }}>
          <span>👁 Previewing as {roleLabel(previewRole!)}</span>
          <button onClick={() => setPreviewRole(null)} style={{
            background: C.navyDeep, color: '#fff', border: 'none', borderRadius: 8,
            padding: '5px 12px', fontSize: 11.5, fontWeight: 700,
          }}>Exit preview</button>
        </div>
      )}
      <div className="scroll" style={{ flex: 1, overflowY: 'auto', paddingBottom: 84, paddingTop: previewing ? 34 : 0 }}>
        <div className="fade-in" key={tab + (section || '')}>
          {tab === 'home' && <Home nav={nav} />}
          {tab === 'calendar' && <Schedule nav={nav} />}
          {tab === 'horses' && <Horses nav={nav} params={params} />}
          {tab === 'billing' && <Billing nav={nav} />}
          {tab === 'more' && <More nav={nav} section={section} params={params} />}
        </div>
      </div>

      {/* bottom tab bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: '#fff', display: 'flex', padding: '8px 6px 14px',
        boxShadow: '0 -8px 24px -18px rgba(40,58,109,0.6)',
        borderTop: `1px solid ${C.page}`,
      }}>
        {tabs.map(t => {
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => nav.go(t.key)} style={{
              flex: 1, background: 'none', border: 'none', display: 'flex',
              flexDirection: 'column', alignItems: 'center', gap: 4, padding: '4px 0',
            }}>
              <div style={{
                width: 42, height: 34, borderRadius: 17, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                background: active ? 'rgba(201,161,74,0.14)' : 'transparent',
              }}>
                <Icon d={t.d} size={21} stroke={active ? C.gold : C.faint} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: active ? C.navy : C.faint }}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
