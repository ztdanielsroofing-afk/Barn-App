import { useState, useEffect } from 'react';
import { C, serif } from '../theme';
import { Card, SectionLabel, Pill, Button, Avatar, Row, Empty, useScrollLock, sheetPanel } from '../ui';
import { Page } from './Header';
import { useTable } from '../db';
import { supabase } from '../supabase';
import { Horse, TrainingSession, Vaccine, CriticalNote, Lesson } from '../types';
import { useApp } from '../AppContext';
import { Nav } from '../App';

const careColor = (s: string) => ({ overdue: C.red, soon: C.gold, ok: C.green } as any)[s] || C.green;

export default function Horses({ params }: { nav: Nav; params?: any }) {
  const { isStaff, isClient, role, user, barn } = useApp();
  const { data: horses, reload } = useTable<Horse>('horses', q => q.order('name'));
  // A trainer's "own" horses come from lessons they teach and training they log.
  const { data: myLessons } = useTable<Lesson>('lessons', q => user?.id ? q.eq('trainer_id', user.id) : q.limit(0));
  const { data: myTraining } = useTable<TrainingSession>('training_sessions', q => user?.id ? q.eq('trainer_id', user.id) : q.limit(0));
  const [openId, setOpenId] = useState<string | null>(params?.horseId || null);
  // Clients and trainers default to their own horses, with a tab to see the whole barn.
  const canFilterMine = isClient || role === 'trainer';
  const [view, setView] = useState<'mine' | 'all'>(canFilterMine ? 'mine' : 'all');

  useEffect(() => { if (params?.horseId) setOpenId(params.horseId); }, [params?.horseId]);

  const isMine = (h: Horse): boolean => {
    if (isClient) return h.owner_family_id === user?.family_id;
    if (role === 'trainer') {
      const names = new Set(myLessons.map(l => l.horse_name).filter(Boolean));
      const ids = new Set(myTraining.map(t => t.horse_id));
      return ids.has(h.id) || names.has(h.name);
    }
    return true;
  };
  const visible = canFilterMine && view === 'mine' ? horses.filter(isMine) : horses;

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
      {canFilterMine && (
        <div style={{ display: 'flex', gap: 6, background: '#fff', borderRadius: 12, padding: 4, marginBottom: 12 }}>
          {([['mine', isClient ? 'My horses' : 'My horses'], ['all', 'All barn']] as const).map(([v, l]) => (
            <button key={v} onClick={() => setView(v)} style={{
              flex: 1, border: 'none', borderRadius: 9, padding: '9px 4px', fontSize: 12.5, fontWeight: 700,
              background: view === v ? C.navy : 'transparent', color: view === v ? '#fff' : C.muted,
            }}>{l}</button>
          ))}
        </div>
      )}
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
        {visible.length === 0 && (
          <Empty>
            {canFilterMine && view === 'mine'
              ? (isClient ? 'No horse on file for you yet. Tap “All barn” to see the barn’s horses.' : 'No horses assigned to you yet. Tap “All barn” to see every horse.')
              : 'No horses yet.'}
          </Empty>
        )}
      </div>
      {isStaff && <div style={{ marginTop: 14 }}><Button kind="soft" onClick={addHorse}>+ Add a horse</Button></div>}
    </Page>
  );
}

function HorseDetail({ horse, onBack, canEdit }: { horse: Horse; onBack: () => void; canEdit: boolean }) {
  const [tab, setTab] = useState<'overview' | 'care' | 'emergency'>('overview');
  const [editing, setEditing] = useState(false);
  const crit = horse.critical_notes || [];

  async function del() {
    if (!confirm(`Delete ${horse.name}? This cannot be undone.`)) return;
    if (!confirm(`Really delete ${horse.name}?`)) return;
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button onClick={onBack} style={{ background: '#fff', border: 'none', borderRadius: 11, padding: '8px 13px', fontSize: 12, fontWeight: 700, color: C.navy }}>‹ Horses</button>
        {canEdit && (
          <button onClick={() => setEditing(true)} style={{ background: C.navy, border: 'none', borderRadius: 11, padding: '8px 16px', fontSize: 12.5, fontWeight: 800, color: '#fff' }}>Edit</button>
        )}
      </div>
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
            <div key={i} style={{ background: C.redBg, border: `1px solid ${C.red}33`, borderRadius: 12, padding: '11px 13px' }}>
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
        </Card>
      )}

      {tab === 'emergency' && (
        <Card>
          <Row l="Vet" v={horse.em_vet || '—'} />
          <Row l="Owner phone" v={horse.em_owner_phone || '—'} />
          <Row l="Medical" v={horse.em_medical || '—'} />
          <Row l="Handling" v={horse.em_handling || '—'} last />
        </Card>
      )}

      <TrainingLog horse={horse} canEdit={canEdit} />

      {canEdit && (
        <div style={{ marginTop: 14 }}>
          <Button kind="ghost" onClick={del} style={{ color: C.red }}>Delete horse</Button>
        </div>
      )}

      {editing && <EditHorseModal horse={horse} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); onBack(); }} />}
    </Page>
  );
}

const TINTS = ['#283a6d', '#c9a14a', '#4b7d57', '#b5532e', '#6a5a8a', '#7a3b2e', '#2e6b7a', '#8a3b5a'];

function EditHorseModal({ horse, onClose, onSaved }: { horse: Horse; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(horse.name || '');
  const [breed, setBreed] = useState(horse.breed || '');
  const [age, setAge] = useState(horse.age || '');
  const [barnOwned, setBarnOwned] = useState(!!horse.barn_owned);
  const [ownerName, setOwnerName] = useState(horse.owner_name || '');
  const [farrierLast, setFarrierLast] = useState(horse.farrier_last || '');
  const [farrierNext, setFarrierNext] = useState(horse.farrier_next || '');
  const [farrierInterval, setFarrierInterval] = useState(horse.farrier_interval || '');
  const [feeding, setFeeding] = useState(horse.feeding || '');
  const [emVet, setEmVet] = useState(horse.em_vet || '');
  const [emOwnerPhone, setEmOwnerPhone] = useState(horse.em_owner_phone || '');
  const [emMedical, setEmMedical] = useState(horse.em_medical || '');
  const [emHandling, setEmHandling] = useState(horse.em_handling || '');
  const [tint, setTint] = useState(horse.tint || C.navy);
  const [vaccines, setVaccines] = useState<Vaccine[]>(horse.vaccines || []);
  const [crit, setCrit] = useState<CriticalNote[]>(horse.critical_notes || []);
  const [busy, setBusy] = useState(false);
  useScrollLock();

  async function save() {
    if (!name.trim()) { alert('Name is required.'); return; }
    setBusy(true);
    await supabase.from('horses').update({
      name: name.trim(),
      breed: breed.trim() || null,
      age: age.trim() || null,
      barn_owned: barnOwned,
      owner_name: barnOwned ? null : (ownerName.trim() || null),
      farrier_last: farrierLast.trim() || null,
      farrier_next: farrierNext.trim() || null,
      farrier_interval: farrierInterval.trim() || null,
      feeding: feeding.trim() || null,
      em_vet: emVet.trim() || null,
      em_owner_phone: emOwnerPhone.trim() || null,
      em_medical: emMedical.trim() || null,
      em_handling: emHandling.trim() || null,
      tint,
      vaccines: vaccines.filter(v => v.name.trim()),
      critical_notes: crit.filter(n => n.text.trim()),
    }).eq('id', horse.id);
    setBusy(false);
    onSaved();
  }

  const inp: React.CSSProperties = { width: '100%', border: `1px solid ${C.page}`, borderRadius: 12, padding: '12px 13px', fontSize: 14, background: '#fff', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };
  const lbl: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, color: C.muted, margin: '12px 0 5px' };
  const head: React.CSSProperties = { fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', color: C.faint, textTransform: 'uppercase', margin: '20px 0 2px' };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(14,21,48,0.5)', zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={sheetPanel}>
        <div style={{ fontFamily: serif, fontSize: 24, color: C.navy, marginBottom: 2 }}>Edit {horse.name}</div>
        <div style={{ fontSize: 12, color: C.muted2 }}>Change any detail below, then save once.</div>

        <div style={head}>Basics</div>
        <div style={lbl}>Name</div>
        <input style={inp} value={name} onChange={e => setName(e.target.value)} placeholder="Horse name" />
        <div style={lbl}>Breed</div>
        <input style={inp} value={breed} onChange={e => setBreed(e.target.value)} placeholder="e.g. Quarter Horse" />
        <div style={lbl}>Age</div>
        <input style={inp} value={age} onChange={e => setAge(e.target.value)} placeholder="e.g. 18 yrs" />
        <div style={lbl}>Ownership</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setBarnOwned(true)} style={seg(barnOwned)}>Barn owned</button>
          <button onClick={() => setBarnOwned(false)} style={seg(!barnOwned)}>Boarder</button>
        </div>
        {!barnOwned && (<>
          <div style={lbl}>Owner name</div>
          <input style={inp} value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="Boarder / owner name" />
        </>)}
        <div style={lbl}>Color tag</div>
        <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
          {TINTS.map(t => (
            <button key={t} onClick={() => setTint(t)} style={{ width: 34, height: 34, borderRadius: '50%', background: t, border: tint === t ? '3px solid ' + C.navy : '3px solid #fff', boxShadow: '0 0 0 1px rgba(0,0,0,0.08)' }} />
          ))}
        </div>

        <div style={head}>Care</div>
        <div style={lbl}>Farrier — last</div>
        <input style={inp} value={farrierLast} onChange={e => setFarrierLast(e.target.value)} placeholder="e.g. Sept 10" />
        <div style={lbl}>Farrier — next</div>
        <input style={inp} value={farrierNext} onChange={e => setFarrierNext(e.target.value)} placeholder="e.g. Nov 5" />
        <div style={lbl}>Farrier — interval</div>
        <input style={inp} value={farrierInterval} onChange={e => setFarrierInterval(e.target.value)} placeholder="e.g. 6–8 weeks" />
        <div style={lbl}>Feeding notes</div>
        <textarea style={{ ...inp, minHeight: 64 }} value={feeding} onChange={e => setFeeding(e.target.value)} placeholder="Feed / supplements / schedule" />

        <div style={lbl}>Vaccines / vet</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {vaccines.map((v, i) => (
            <div key={i} style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
              <input style={{ ...inp, flex: 1 }} value={v.name} placeholder="Name (e.g. Shots)" onChange={e => setVaccines(vaccines.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
              <input style={{ ...inp, flex: 1 }} value={v.due} placeholder="Due (e.g. April)" onChange={e => setVaccines(vaccines.map((x, j) => j === i ? { ...x, due: e.target.value } : x))} />
              <button onClick={() => setVaccines(vaccines.filter((_, j) => j !== i))} style={{ background: C.redBg, color: C.red, border: 'none', borderRadius: 9, width: 34, height: 40, fontSize: 18, fontWeight: 700, flex: 'none' }}>×</button>
            </div>
          ))}
          <button onClick={() => setVaccines([...vaccines, { name: '', due: '' }])} style={{ background: '#fff', color: C.navy, border: `1px dashed ${C.faint}`, borderRadius: 12, padding: '10px', fontSize: 12.5, fontWeight: 700 }}>+ Add vaccine / vet item</button>
        </div>

        <div style={head}>Emergency</div>
        <div style={lbl}>Vet</div>
        <input style={inp} value={emVet} onChange={e => setEmVet(e.target.value)} placeholder="Vet name / clinic" />
        <div style={lbl}>Owner phone</div>
        <input style={inp} value={emOwnerPhone} onChange={e => setEmOwnerPhone(e.target.value)} placeholder="Emergency contact phone" />
        <div style={lbl}>Medical notes</div>
        <textarea style={{ ...inp, minHeight: 56 }} value={emMedical} onChange={e => setEmMedical(e.target.value)} placeholder="Allergies, conditions, meds" />
        <div style={lbl}>Handling notes</div>
        <textarea style={{ ...inp, minHeight: 56 }} value={emHandling} onChange={e => setEmHandling(e.target.value)} placeholder="How to safely handle" />

        <div style={head}>⚠ Critical handling notes</div>
        <div style={{ fontSize: 11.5, color: C.muted2, marginBottom: 6 }}>These show in red to everyone.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {crit.map((n, i) => (
            <div key={i} style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
              <input style={{ ...inp, flex: 1 }} value={n.text} placeholder="e.g. ONLY cross-ties" onChange={e => setCrit(crit.map((x, j) => j === i ? { ...x, text: e.target.value } : x))} />
              <button onClick={() => setCrit(crit.filter((_, j) => j !== i))} style={{ background: C.redBg, color: C.red, border: 'none', borderRadius: 9, width: 34, height: 40, fontSize: 18, fontWeight: 700, flex: 'none' }}>×</button>
            </div>
          ))}
          <button onClick={() => setCrit([...crit, { text: '', by: 'Barn' }])} style={{ background: '#fff', color: C.red, border: `1px dashed ${C.red}66`, borderRadius: 12, padding: '10px', fontSize: 12.5, fontWeight: 700 }}>+ Add critical note</button>
        </div>

        <div style={{ marginTop: 22 }}>
          <Button disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save all changes'}</Button>
          <Button kind="ghost" onClick={onClose} style={{ marginTop: 10 }}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}

const seg = (on: boolean): React.CSSProperties => ({ flex: 1, border: 'none', borderRadius: 12, padding: '11px 4px', fontSize: 13, fontWeight: 700, background: on ? C.navy : '#fff', color: on ? '#fff' : C.muted });

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
  useScrollLock();
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
      <div onClick={e => e.stopPropagation()} style={sheetPanel}>
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
