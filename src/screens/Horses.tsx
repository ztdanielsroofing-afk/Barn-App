import { useState, useEffect } from 'react';
import { C, serif } from '../theme';
import { Card, SectionLabel, Pill, Button, Avatar, Row, Empty } from '../ui';
import { Page } from './Header';
import { useTable } from '../db';
import { supabase } from '../supabase';
import { Horse } from '../types';
import { useApp } from '../AppContext';
import { Nav } from '../App';

const careColor = (s: string) => ({ overdue: C.red, soon: C.gold, ok: C.green } as any)[s] || C.green;

export default function Horses({ params }: { nav: Nav; params?: any }) {
  const { isStaff, isClient, user, barn } = useApp();
  const { data: horses, reload } = useTable<Horse>('horses', q => q.order('name'));
  const [openId, setOpenId] = useState<string | null>(params?.horseId || null);

  useEffect(() => { if (params?.horseId) setOpenId(params.horseId); }, [params?.horseId]);

  const visible = isClient
    ? horses.filter(h => h.barn_owned || h.owner_family_id === user?.family_id)
    : horses;

  const open = openId ? horses.find(h => h.id === openId) : null;
  if (open) return <HorseDetail horse={open} onBack={() => { setOpenId(null); reload(); }} canEdit={isStaff} />;

  async function addHorse() {
    const name = prompt('Horse name?'); if (!name) return;
    await supabase.from('horses').insert({
      barn_id: barn?.id, name, barn_owned: true, care_level: 'ok',
      vaccines: [], critical_notes: [],
    });
    reload();
  }

  return (
    <Page>
      <div style={{ fontFamily: serif, fontSize: 27, color: C.navy, marginBottom: 12 }}>{isClient ? 'Horses' : 'The Barn'}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {visible.map(h => (
          <Card key={h.id} onClick={() => setOpenId(h.id)} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Avatar init={h.name.slice(0, 1)} tint={h.tint || C.navy} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                {h.name}
                {(h.critical_notes || []).length > 0 && <span style={{ color: C.red, marginLeft: 6, fontSize: 12 }}>●</span>}
              </div>
              <div style={{ fontSize: 11, color: C.muted2 }}>{h.breed || (h.barn_owned ? 'Barn owned' : 'Boarder')}{h.age ? ` · ${h.age}` : ''}</div>
            </div>
            <Pill color={careColor(h.care_level)}>{h.care_level}</Pill>
          </Card>
        ))}
        {visible.length === 0 && <Empty>No horses yet.</Empty>}
      </div>
      {isStaff && <div style={{ marginTop: 14 }}><Button kind="soft" onClick={addHorse}>+ Add a horse</Button></div>}
    </Page>
  );
}

function HorseDetail({ horse, onBack, canEdit }: { horse: Horse; onBack: () => void; canEdit: boolean }) {
  const [tab, setTab] = useState<'overview' | 'care' | 'emergency'>('overview');
  const crit = horse.critical_notes || [];

  async function edit(field: keyof Horse, promptLabel: string) {
    const val = prompt(promptLabel, (horse[field] as any) ?? '');
    if (val === null) return;
    await supabase.from('horses').update({ [field]: val }).eq('id', horse.id);
    onBack();
  }
  async function flagCritical() {
    const text = prompt('Critical handling note (shows in red to everyone):');
    if (!text) return;
    const next = [...crit, { text, by: 'Barn' }];
    await supabase.from('horses').update({ critical_notes: next }).eq('id', horse.id);
    onBack();
  }
  async function clearCritical(i: number) {
    if (!confirm('Remove this critical note?')) return;
    const next = crit.filter((_, j) => j !== i);
    await supabase.from('horses').update({ critical_notes: next }).eq('id', horse.id);
    onBack();
  }
  async function del() {
    if (!confirm(`Delete ${horse.name}?`)) return;
    await supabase.from('horses').delete().eq('id', horse.id);
    onBack();
  }

  const tabBtn = (k: typeof tab, label: string) => (
    <button onClick={() => setTab(k)} style={{
      flex: 1, border: 'none', borderRadius: 10, padding: '9px 4px', fontSize: 12.5, fontWeight: 700,
      background: tab === k ? C.navy : '#fff', color: tab === k ? '#fff' : C.muted,
    }}>{label}</button>
  );

  return (
    <Page>
      <button onClick={onBack} style={{ background: '#fff', border: 'none', borderRadius: 11, padding: '8px 13px', fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 12 }}>‹ Horses</button>
      <div style={{ display: 'flex', gap: 13, alignItems: 'center', marginBottom: 14 }}>
        <Avatar init={horse.name.slice(0, 1)} tint={horse.tint || C.navy} />
        <div>
          <div style={{ fontFamily: serif, fontSize: 26, color: C.navy }}>{horse.name}</div>
          <div style={{ fontSize: 12, color: C.muted2 }}>{horse.breed || (horse.barn_owned ? 'Barn owned' : 'Boarder')}</div>
        </div>
      </div>

      {crit.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 14 }}>
          {crit.map((n, i) => (
            <div key={i} onClick={() => canEdit && clearCritical(i)} style={{ background: C.redBg, border: `1px solid ${C.red}33`, borderRadius: 12, padding: '11px 13px' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: C.red, letterSpacing: '0.05em' }}>⚠ CRITICAL</div>
              <div style={{ fontSize: 13, color: C.text, marginTop: 2 }}>{n.text}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {tabBtn('overview', 'Overview')}
        {tabBtn('care', 'Care')}
        {tabBtn('emergency', 'Emergency')}
      </div>

      {tab === 'overview' && (
        <Card>
          <Row l="Breed" v={horse.breed || '—'} />
          <Row l="Age" v={horse.age || '—'} />
          <Row l="Ownership" v={horse.barn_owned ? 'Barn owned' : (horse.owner_name || 'Boarder')} last />
          {canEdit && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              <Button kind="ghost" onClick={() => edit('breed', 'Breed?')}>Edit breed</Button>
              <Button kind="ghost" onClick={() => edit('age', 'Age?')}>Edit age</Button>
              <Button kind="ghost" onClick={() => edit('owner_name', 'Owner name (for boarders)?')}>Edit owner</Button>
            </div>
          )}
        </Card>
      )}

      {tab === 'care' && (
        <Card>
          <Row l="Farrier — last" v={horse.farrier_last || '—'} />
          <Row l="Farrier — next" v={horse.farrier_next || '—'} />
          <Row l="Farrier — interval" v={horse.farrier_interval || '—'} />
          <Row l="Feeding" v={horse.feeding || '—'} last={!(horse.vaccines || []).length} />
          {(horse.vaccines || []).map((v, i, a) => (
            <Row key={i} l={v.name} v={v.due} last={i === a.length - 1} />
          ))}
          {canEdit && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              <Button kind="ghost" onClick={() => edit('farrier_next', 'Next farrier date?')}>Edit next farrier</Button>
              <Button kind="ghost" onClick={() => edit('feeding', 'Feeding notes?')}>Edit feeding</Button>
            </div>
          )}
        </Card>
      )}

      {tab === 'emergency' && (
        <Card>
          <Row l="Vet" v={horse.em_vet || '—'} />
          <Row l="Owner phone" v={horse.em_owner_phone || '—'} />
          <Row l="Medical" v={horse.em_medical || '—'} />
          <Row l="Handling" v={horse.em_handling || '—'} last />
          {canEdit && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              <Button kind="ghost" onClick={() => edit('em_medical', 'Medical notes?')}>Edit medical</Button>
              <Button kind="ghost" onClick={() => edit('em_handling', 'Handling notes?')}>Edit handling</Button>
            </div>
          )}
        </Card>
      )}

      {canEdit && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 14 }}>
          <Button kind="soft" onClick={flagCritical}>⚠ Flag a critical handling note</Button>
          <Button kind="ghost" onClick={del} style={{ color: C.red }}>Delete horse</Button>
        </div>
      )}
    </Page>
  );
}
