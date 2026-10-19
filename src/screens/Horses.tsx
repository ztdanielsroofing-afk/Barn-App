import { useState, useEffect } from 'react';
import { C, serif } from '../theme';
import { Card, SectionLabel, Pill, Button, Avatar, Row, Empty } from '../ui';
import { Page } from './Header';
import { useTable } from '../db';
import { supabase } from '../supabase';
import { Horse, TrainingSession } from '../types';
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

      <TrainingLog horse={horse} canEdit={canEdit} />

      {canEdit && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 14 }}>
          <Button kind="soft" onClick={flagCritical}>⚠ Flag a critical handling note</Button>
          <Button kind="ghost" onClick={del} style={{ color: C.red }}>Delete horse</Button>
        </div>
      )}
    </Page>
  );
}

const TRAIN_WORK = ['Groundwork', 'Flat work', 'Jumping', 'Lunging', 'Dressage', 'Trail', 'Other'];

function TrainingLog({ horse, canEdit }: { horse: Horse; canEdit: boolean }) {
  const { barn, user } = useApp();
  const { data: sessions, reload } = useTable<TrainingSession>('training_sessions', q => q.eq('horse_id', horse.id).order('date', { ascending: false }));
  const [adding, setAdding] = useState(false);

  const countFor = (w: string) => sessions.filter(s => (s.work_types || []).includes(w)).length;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '18px 0 9px' }}>
        <SectionLabel style={{ margin: 0 }}>Training log</SectionLabel>
        {canEdit && <button onClick={() => setAdding(true)} style={{ background: C.goldTint, color: C.navy, border: 'none', borderRadius: 20, padding: '7px 13px', fontSize: 11.5, fontWeight: 800 }}>+ Log training</button>}
      </div>

      {sessions.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          {['Groundwork', 'Flat work', 'Jumping'].map(w => (
            <div key={w} style={{ flex: 1, background: '#fff', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ fontFamily: serif, fontSize: 20, color: C.navy }}>{countFor(w)}</div>
              <div style={{ fontSize: 10, color: C.muted2 }}>{w}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sessions.map(s => (
          <Card key={s.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{s.date ? new Date(s.date + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</div>
              {s.trainer_name && <div style={{ fontSize: 11, color: C.muted2 }}>{s.trainer_name}</div>}
            </div>
            {(s.work_types || []).length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 7 }}>
                {(s.work_types || []).map(w => <Pill key={w} color={C.navy} bg={C.infoBg}>{w}</Pill>)}
              </div>
            )}
            {s.notes && <div style={{ fontSize: 12.5, color: C.text, marginTop: 7, lineHeight: 1.5 }}>{s.notes}</div>}
            {canEdit && <button onClick={async () => { if (confirm('Delete this training entry?')) { await supabase.from('training_sessions').delete().eq('id', s.id); reload(); } }} style={{ background: C.redBg, color: C.red, border: 'none', borderRadius: 9, padding: '5px 10px', fontSize: 11, fontWeight: 700, marginTop: 8 }}>Delete</button>}
          </Card>
        ))}
        {sessions.length === 0 && <Empty>No training logged yet.{canEdit ? ' Tap “+ Log training”.' : ''}</Empty>}
      </div>

      {adding && <LogTrainingModal horse={horse} barnId={barn?.id} trainerName={user?.full_name || null} trainerId={user?.id || null} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); reload(); }} />}
    </>
  );
}

function LogTrainingModal({ horse, barnId, trainerName, trainerId, onClose, onSaved }:
  { horse: Horse; barnId?: string; trainerName: string | null; trainerId: string | null; onClose: () => void; onSaved: () => void }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [work, setWork] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const toggle = (w: string) => setWork(p => p.includes(w) ? p.filter(x => x !== w) : [...p, w]);

  async function save() {
    setBusy(true);
    await supabase.from('training_sessions').insert({
      barn_id: barnId, horse_id: horse.id, trainer_id: trainerId, trainer_name: trainerName,
      date, work_types: work, notes: notes.trim() || null,
    });
    setBusy(false); onSaved();
  }
  const inp: React.CSSProperties = { width: '100%', border: `1px solid ${C.page}`, borderRadius: 12, padding: '12px 13px', fontSize: 14, background: '#fff', outline: 'none', marginBottom: 10, fontFamily: 'inherit' };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(14,21,48,0.5)', zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.page, width: '100%', maxWidth: 430, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: '22px 20px 30px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontFamily: serif, fontSize: 24, color: C.navy, marginBottom: 2 }}>Log training — {horse.name}</div>
        <div style={{ fontSize: 12, color: C.muted2, marginBottom: 14 }}>Record what you worked on; the owner can see it.</div>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: C.muted, marginBottom: 5 }}>Date</div>
        <input type="date" style={inp} value={date} onChange={e => setDate(e.target.value)} />
        <div style={{ fontSize: 11.5, fontWeight: 700, color: C.muted, marginBottom: 6 }}>Worked on</div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 12 }}>
          {TRAIN_WORK.map(w => (
            <button key={w} onClick={() => toggle(w)} style={{ border: 'none', borderRadius: 18, padding: '8px 12px', fontSize: 12, fontWeight: 700, background: work.includes(w) ? C.navy : '#fff', color: work.includes(w) ? '#fff' : C.muted }}>{w}</button>
          ))}
        </div>
        <textarea style={{ ...inp, minHeight: 80 }} placeholder="Notes on the ride / progress (optional)" value={notes} onChange={e => setNotes(e.target.value)} />
        <Button disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save training entry'}</Button>
        <Button kind="ghost" onClick={onClose} style={{ marginTop: 10 }}>Cancel</Button>
      </div>
    </div>
  );
}
