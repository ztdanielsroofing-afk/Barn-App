import { useMemo, useState } from 'react';
import { C, serif } from '../theme';
import { Card, SectionLabel, Pill, Button } from '../ui';
import { Page } from './Header';
import { useTable } from '../db';
import { supabase } from '../supabase';
import { Lesson, Horse, Rider, AppUser, ArenaBooking } from '../types';
import { useApp } from '../AppContext';
import { notify } from '../notify';
import { Nav } from '../App';

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const lessonColor = (t: string) => ({ Private: C.navy, 'Semi-private': C.purple, Group: C.green, Training: C.gold } as any)[t] || C.navy;
const riderNames = (l: Lesson): string[] =>
  (l.participants && l.participants.length ? l.participants.map(p => p.name) : (l.rider_name ? [l.rider_name] : []));
const riderTitle = (l: Lesson): string => {
  const ns = riderNames(l);
  return ns.length > 1 ? `${ns.length} riders · ${ns.join(', ')}` : (ns[0] || 'Lesson');
};

export default function Schedule({ nav: _nav }: { nav: Nav }) {
  const { isStaff, isClient } = useApp();
  const today = new Date();
  const [sel, setSel] = useState<Date>(today);
  const [view, setView] = useState<Date>(new Date(today.getFullYear(), today.getMonth(), 1));
  const [open, setOpen] = useState<Lesson | null>(null);
  const [req, setReq] = useState(false);
  const [adding, setAdding] = useState(false);
  const [mode, setMode] = useState<'lessons' | 'arena'>('lessons');

  const { data: lessons, reload } = useTable<Lesson>('lessons', q => q.order('starts_at'));

  const byDay = useMemo(() => {
    const m: Record<string, Lesson[]> = {};
    lessons.forEach(l => {
      const k = l.starts_at.slice(0, 10);
      (m[k] = m[k] || []).push(l);
    });
    return m;
  }, [lessons]);

  const dayItems = byDay[dayKey(sel)] || [];

  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const startPad = first.getDay();
  const daysIn = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysIn; d++) cells.push(new Date(view.getFullYear(), view.getMonth(), d));

  if (open) return <LessonDetail lesson={open} onBack={() => { setOpen(null); reload(); }} />;

  return (
    <Page>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontFamily: serif, fontSize: 22, color: C.navy }}>{MON[view.getMonth()]} {view.getFullYear()}</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))} style={navBtn}>‹</button>
          <button onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))} style={navBtn}>›</button>
        </div>
      </div>

      <Card style={{ padding: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
          {DOW.map((d, i) => <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: C.faint, padding: '2px 0' }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const k = dayKey(d);
            const count = (byDay[k] || []).length;
            const isSel = k === dayKey(sel);
            const isToday = k === dayKey(today);
            return (
              <button key={i} onClick={() => setSel(d)} style={{
                aspectRatio: '1', border: 'none', borderRadius: 10, cursor: 'pointer',
                background: isSel ? C.navy : 'transparent',
                color: isSel ? '#fff' : isToday ? C.gold : C.text,
                fontWeight: isToday || isSel ? 800 : 500, fontSize: 12.5,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              }}>
                {d.getDate()}
                <div style={{ width: 4, height: 4, borderRadius: 2, marginTop: 2, background: count ? (isSel ? C.goldLight : C.gold) : 'transparent' }} />
              </button>
            );
          })}
        </div>
      </Card>

      <div style={{ display: 'flex', gap: 7, marginTop: 16 }}>
        <button onClick={() => setMode('lessons')} style={{ flex: 1, border: 'none', borderRadius: 10, padding: '9px 4px', fontSize: 12.5, fontWeight: 700, background: mode === 'lessons' ? C.navy : '#fff', color: mode === 'lessons' ? '#fff' : C.muted }}>Lessons</button>
        <button onClick={() => setMode('arena')} style={{ flex: 1, border: 'none', borderRadius: 10, padding: '9px 4px', fontSize: 12.5, fontWeight: 700, background: mode === 'arena' ? C.navy : '#fff', color: mode === 'arena' ? '#fff' : C.muted }}>Open Arena</button>
      </div>

      {mode === 'arena' ? <ArenaDay date={sel} /> : (<>
      <SectionLabel>{sel.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {dayItems.map(l => (
          <Card key={l.id} onClick={() => setOpen(l)} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 4, background: lessonColor(l.lesson_type) }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>{riderTitle(l)}{l.horse_name ? ` · ${l.horse_name}` : ''}</div>
              <div style={{ fontSize: 11, color: C.muted2 }}>{l.time_label}{l.trainer_name ? ` · ${l.trainer_name}` : ''}</div>
            </div>
            <Pill color={lessonColor(l.lesson_type)}>{l.lesson_type}</Pill>
          </Card>
        ))}
        {dayItems.length === 0 && (
          <div style={{ textAlign: 'center', color: C.muted2, fontSize: 13, padding: '18px 12px', background: 'rgba(255,255,255,0.5)', borderRadius: 14 }}>
            No lessons this day.
          </div>
        )}
      </div>

      {isStaff && (
        <div style={{ marginTop: 16 }}>
          <Button kind="soft" onClick={() => setAdding(true)}>+ Add a lesson on this day</Button>
        </div>
      )}
      {isClient && (
        <div style={{ marginTop: 16 }}>
          <Button kind="soft" onClick={() => setReq(true)}>Request a schedule change</Button>
        </div>
      )}
      </>)}
      {req && <RequestSheet onClose={() => setReq(false)} />}
      {adding && <AddLessonSheet day={sel} onClose={() => setAdding(false)} onSaved={reload} />}
    </Page>
  );
}

const navBtn: React.CSSProperties = { background: '#fff', border: 'none', borderRadius: 10, width: 34, height: 34, fontSize: 18, color: C.navy };

function AddLessonSheet({ day, onClose, onSaved }: { day: Date; onClose: () => void; onSaved: () => void }) {
  const { barn } = useApp();
  const { data: riders } = useTable<Rider>('riders', q => q.order('full_name'));
  const { data: horses } = useTable<Horse>('horses', q => q.order('name'));
  const { data: staff } = useTable<AppUser>('users', q => q.neq('role', 'client').order('full_name'));

  const [people, setPeople] = useState<{ name: string; family_id: string | null }[]>([]);
  const [manual, setManual] = useState('');
  const [horse, setHorse] = useState('');
  const [trainerId, setTrainerId] = useState('');
  const [type, setType] = useState('Private');
  const [time, setTime] = useState('4:00 PM');
  const [fee, setFee] = useState('');
  const [repeat, setRepeat] = useState(false);
  const [weeks, setWeeks] = useState('12');
  const [busy, setBusy] = useState(false);

  const ready = people.length > 0;
  const dowName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day.getDay()];

  function addRiderById(id: string) {
    const r = riders.find(x => x.id === id);
    if (r && !people.some(p => p.name === r.full_name)) setPeople([...people, { name: r.full_name, family_id: r.family_id }]);
  }
  function addManual() {
    const n = manual.trim();
    if (n && !people.some(p => p.name === n)) { setPeople([...people, { name: n, family_id: null }]); setManual(''); }
  }
  function removePerson(i: number) { setPeople(people.filter((_, j) => j !== i)); }

  async function save() {
    setBusy(true);
    try {
      const trainer = staff.find(s => s.id === trainerId);
      const primary = people[0];
      const base: any = {
        barn_id: barn?.id, rider_name: primary.name, family_id: primary.family_id, participants: people,
        horse_name: horse || null, lesson_type: type, time_label: time || null,
        fee: Number(fee) || 0, trainer_id: trainerId || null, trainer_name: trainer?.full_name || null,
        status: 'booked',
      };
      if (repeat) {
        const { data: series } = await supabase.from('lesson_series').insert({
          barn_id: barn?.id, rider_name: primary.name, family_id: primary.family_id, horse_name: horse || null,
          trainer_id: trainerId || null, trainer_name: trainer?.full_name || null,
          lesson_type: type, dow: day.getDay(), time_label: time || null, fee: Number(fee) || 0,
        }).select('id').single();
        const n = Math.min(Math.max(Number(weeks) || 12, 1), 52);
        const rows = [];
        for (let i = 0; i < n; i++) {
          const d = new Date(day); d.setDate(d.getDate() + i * 7); d.setHours(12, 0, 0, 0);
          rows.push({ ...base, starts_at: d.toISOString(), series_id: series?.id });
        }
        await supabase.from('lessons').insert(rows);
      } else {
        const d = new Date(day); d.setHours(12, 0, 0, 0);
        await supabase.from('lessons').insert({ ...base, starts_at: d.toISOString() });
      }
      onSaved(); onClose();
    } finally { setBusy(false); }
  }

  const inp: React.CSSProperties = { width: '100%', border: `1px solid ${C.page}`, borderRadius: 12, padding: '12px 13px', fontSize: 14, background: '#fff', outline: 'none', marginBottom: 10, fontFamily: 'inherit' };
  const lbl: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, color: C.muted, margin: '2px 0 5px' };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(14,21,48,0.5)', zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.page, width: '100%', maxWidth: 430, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: '22px 20px 30px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontFamily: serif, fontSize: 24, color: C.navy, marginBottom: 2 }}>Add a lesson</div>
        <div style={{ fontSize: 12, color: C.muted2, marginBottom: 14 }}>{day.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>

        <div style={lbl}>Rider(s) — add more than one for a group lesson</div>
        {riders.length > 0 && (
          <select value="" onChange={e => { addRiderById(e.target.value); e.target.value = ''; }} style={inp}>
            <option value="">Add a rider…</option>
            {riders.map(r => <option key={r.id} value={r.id}>{r.full_name}</option>)}
          </select>
        )}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input style={{ ...inp, marginBottom: 0 }} placeholder="or type a name" value={manual} onChange={e => setManual(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addManual(); }} />
          <button onClick={addManual} style={{ background: C.goldTint, color: C.navy, border: 'none', borderRadius: 12, padding: '0 16px', fontSize: 13, fontWeight: 700, flex: 'none' }}>Add</button>
        </div>
        {people.length > 0 && (
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 12 }}>
            {people.map((p, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: C.navy, color: '#fff', borderRadius: 20, padding: '6px 10px', fontSize: 12.5, fontWeight: 700 }}>
                {p.name}
                <button onClick={() => removePerson(i)} style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', border: 'none', borderRadius: 20, width: 18, height: 18, fontSize: 12, lineHeight: 1 }}>×</button>
              </span>
            ))}
          </div>
        )}

        <div style={lbl}>Horse</div>
        <select value={horse} onChange={e => setHorse(e.target.value)} style={inp}>
          <option value="">(none / decide later)</option>
          {horses.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}
        </select>

        <div style={lbl}>Trainer</div>
        <select value={trainerId} onChange={e => setTrainerId(e.target.value)} style={inp}>
          <option value="">(unassigned)</option>
          {staff.map(s => <option key={s.id} value={s.id}>{s.full_name || s.email}</option>)}
        </select>

        <div style={lbl}>Type</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: 10 }}>
          {['Private', 'Semi-private', 'Group', 'Training'].map(t => (
            <button key={t} onClick={() => setType(t)} style={{ border: 'none', borderRadius: 10, padding: '10px 4px', fontSize: 12.5, fontWeight: 700, background: type === t ? C.navy : '#fff', color: type === t ? '#fff' : C.muted }}>{t}</button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}><div style={lbl}>Time</div><input style={inp} value={time} onChange={e => setTime(e.target.value)} placeholder="4:00 PM" /></div>
          <div style={{ flex: 1 }}><div style={lbl}>Fee ($)</div><input style={inp} value={fee} onChange={e => setFee(e.target.value)} placeholder="0" inputMode="decimal" /></div>
        </div>

        <label style={{ display: 'flex', gap: 10, alignItems: 'center', margin: '4px 2px 10px', cursor: 'pointer' }}>
          <input type="checkbox" checked={repeat} onChange={e => setRepeat(e.target.checked)} style={{ width: 20, height: 20 }} />
          <span style={{ fontSize: 13, color: C.text }}>Repeat every <b>{dowName}</b> (standing weekly lesson)</span>
        </label>
        {repeat && (
          <div style={{ marginBottom: 10 }}>
            <div style={lbl}>For how many weeks?</div>
            <input style={inp} value={weeks} onChange={e => setWeeks(e.target.value)} inputMode="numeric" />
          </div>
        )}

        <Button disabled={!ready || busy} onClick={save}>{busy ? 'Saving…' : repeat ? `Add weekly lesson` : 'Add lesson'}</Button>
        <Button kind="ghost" onClick={onClose} style={{ marginTop: 10 }}>Cancel</Button>
      </div>
    </div>
  );
}

function LessonDetail({ lesson, onBack }: { lesson: Lesson; onBack: () => void }) {
  const { isStaff } = useApp();
  const { data: horses } = useTable<Horse>('horses', q => q.order('name'));
  const [notes, setNotes] = useState(lesson.notes || '');
  const [saved, setSaved] = useState(false);

  async function changeHorse(name: string) {
    await supabase.from('lessons').update({ horse_name: name }).eq('id', lesson.id);
    onBack();
  }
  async function saveNotes() {
    await supabase.from('lessons').update({ notes, status: 'completed' }).eq('id', lesson.id);
    await autoChargeLesson(lesson);
    setSaved(true);
  }
  async function del() {
    if (!confirm('Delete this lesson?')) return;
    await supabase.from('lessons').delete().eq('id', lesson.id);
    onBack();
  }
  async function addRider() {
    const name = prompt('Add a rider to this lesson:'); if (!name || !name.trim()) return;
    const current = lesson.participants && lesson.participants.length
      ? lesson.participants
      : (lesson.rider_name ? [{ name: lesson.rider_name, family_id: lesson.family_id || null }] : []);
    const next = [...current, { name: name.trim(), family_id: null }];
    await supabase.from('lessons').update({
      participants: next,
      rider_name: next[0].name,
      lesson_type: lesson.lesson_type === 'Private' ? 'Group' : lesson.lesson_type,
    }).eq('id', lesson.id);
    onBack();
  }

  return (
    <Page>
      <button onClick={onBack} style={{ background: '#fff', border: 'none', borderRadius: 11, padding: '8px 13px', fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 12 }}>‹ Schedule</button>
      <div style={{ fontFamily: serif, fontSize: 25, color: C.navy }}>{lesson.lesson_type} lesson</div>
      <div style={{ fontSize: 12, color: C.muted2, marginBottom: 12 }}>
        {new Date(lesson.starts_at).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} · {lesson.time_label}
      </div>
      <Card>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: C.muted, marginBottom: 4 }}>Rider{riderNames(lesson).length > 1 ? 's' : ''}</div>
        {riderNames(lesson).map((n, i) => (
          <div key={i} style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{n}</div>
        ))}
        <div style={{ fontSize: 12, color: C.muted2, marginTop: 8 }}>Horse: {lesson.horse_name || '—'}{lesson.trainer_name ? ` · Trainer: ${lesson.trainer_name}` : ''}</div>
      </Card>

      {isStaff && (
        <>
          <div style={{ marginTop: 12 }}><Button kind="soft" onClick={addRider}>+ Add another rider (group)</Button></div>
          <SectionLabel>Assign horse</SectionLabel>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {horses.map(h => (
              <button key={h.id} onClick={() => changeHorse(h.name)} style={{
                border: 'none', borderRadius: 18, padding: '8px 12px', fontSize: 12, fontWeight: 700,
                background: lesson.horse_name === h.name ? C.navy : '#fff', color: lesson.horse_name === h.name ? '#fff' : C.navy,
              }}>{h.name}</button>
            ))}
          </div>

          <SectionLabel>Lesson notes</SectionLabel>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="What did you work on?" style={{
            width: '100%', minHeight: 90, border: `1px solid ${C.page}`, borderRadius: 12, padding: 12,
            fontSize: 14, fontFamily: 'inherit', outline: 'none',
          }} />
          <Button onClick={saveNotes} style={{ marginTop: 10 }}>{saved ? 'Saved ✓' : 'Save notes'}</Button>
          <Button kind="ghost" onClick={del} style={{ marginTop: 10, color: C.red }}>Delete lesson</Button>
        </>
      )}
      {!isStaff && lesson.notes && (
        <>
          <SectionLabel>Notes from your trainer</SectionLabel>
          <Card><div style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{lesson.notes}</div></Card>
        </>
      )}
    </Page>
  );
}

// When a lesson is completed, auto-post its fee to each participating per-lesson
// family (once per family) — covers group lessons where several families attend.
async function autoChargeLesson(lesson: Lesson) {
  if (!lesson.fee || Number(lesson.fee) <= 0) return;
  const parts = (lesson.participants && lesson.participants.length
    ? lesson.participants
    : (lesson.family_id ? [{ name: lesson.rider_name || '', family_id: lesson.family_id }] : []));
  const famIds = [...new Set(parts.map(p => p.family_id).filter(Boolean) as string[])];
  if (!famIds.length) return;
  const { data: fams } = await supabase.from('families').select('id, billing_mode, barn_id').in('id', famIds);
  const { data: existing } = await supabase.from('charges').select('family_id').eq('lesson_id', lesson.id);
  const charged = new Set((existing || []).map((c: any) => c.family_id));
  for (const fam of (fams || []) as any[]) {
    if (fam.billing_mode !== 'per_lesson' || charged.has(fam.id)) continue;
    const who = parts.find(p => p.family_id === fam.id)?.name;
    await supabase.from('charges').insert({
      barn_id: fam.barn_id, family_id: fam.id, lesson_id: lesson.id, amount: Number(lesson.fee),
      label: `Lesson — ${new Date(lesson.starts_at).toLocaleDateString()}${who ? ` (${who})` : ''}`,
    });
    await notify({ barn_id: fam.barn_id, family_id: fam.id, kind: 'billing',
      title: 'Lesson charged', body: `${new Date(lesson.starts_at).toLocaleDateString()} · $${Number(lesson.fee)}` });
  }
}

const KINDS = ['Reschedule', 'New booking', 'Cancel', 'Free ride'] as const;
const fmtLesson = (l: Lesson) => {
  const d = new Date(l.starts_at);
  const day = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  return `${day} · ${l.time_label || ''} · ${l.rider_name || ''}${l.horse_name ? ' on ' + l.horse_name : ''}`.trim();
};

function RequestSheet({ onClose }: { onClose: () => void }) {
  const { user, barn } = useApp();
  const { data: lessons } = useTable<Lesson>('lessons', q => q.order('starts_at'));
  const upcoming = lessons.filter(l => l.status === 'booked');

  const [rider, setRider] = useState(user?.full_name || '');
  const [kind, setKind] = useState<typeof KINDS[number]>('Reschedule');
  const [lessonId, setLessonId] = useState('');
  const [reason, setReason] = useState('');
  const [pref, setPref] = useState('');
  const [sent, setSent] = useState(false);

  const picksLesson = kind === 'Reschedule' || kind === 'Cancel';
  const isFreeRide = kind === 'Free ride';
  const ready = reason.trim() && (!picksLesson || !!lessonId || upcoming.length === 0);

  async function submit() {
    const chosen = upcoming.find(l => l.id === lessonId);
    const orig = isFreeRide ? 'Arena time request' : chosen ? fmtLesson(chosen) : '';
    const proposed = pref.split(',').map(s => s.trim()).filter(Boolean);
    await supabase.from('schedule_requests').insert({
      barn_id: barn?.id, family_id: user?.family_id,
      rider_name: rider || (chosen?.rider_name ?? ''),
      kind, orig, reason, status: 'needs-times', proposed,
    });
    await notify({ barn_id: barn?.id, audience: 'staff', kind: 'request', link: 'requests',
      title: `New ${kind.toLowerCase()} request`, body: `${rider || chosen?.rider_name || 'A client'}${orig ? ` · ${orig}` : ''}` });
    setSent(true);
  }

  const inp: React.CSSProperties = { width: '100%', border: `1px solid ${C.page}`, borderRadius: 12, padding: '12px 13px', fontSize: 14, background: '#fff', outline: 'none', marginBottom: 10, fontFamily: 'inherit' };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(14,21,48,0.5)', zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.page, width: '100%', maxWidth: 430, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: '22px 20px 30px', maxHeight: '88vh', overflowY: 'auto' }}>
        {sent ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontFamily: serif, fontSize: 24, color: C.navy, marginBottom: 8 }}>Request sent ✓</div>
            <p style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.6 }}>The barn will review it and get back to you. You’ll see updates under your schedule.</p>
            <Button onClick={onClose} style={{ marginTop: 12 }}>Done</Button>
          </div>
        ) : (
          <>
            <div style={{ fontFamily: serif, fontSize: 24, color: C.navy, marginBottom: 4 }}>Request a schedule change</div>
            <div style={{ fontSize: 12, color: C.muted2, marginBottom: 16 }}>Pick what you need — the barn will confirm.</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              {KINDS.map(k => (
                <button key={k} onClick={() => setKind(k)} style={{ border: 'none', borderRadius: 11, padding: '11px 4px', fontSize: 12.5, fontWeight: 700, background: kind === k ? C.navy : '#fff', color: kind === k ? '#fff' : C.muted }}>{k}</button>
              ))}
            </div>

            {isFreeRide && (
              <div style={{ background: C.greenBg, borderRadius: 12, padding: '11px 13px', marginBottom: 10, fontSize: 12, color: C.green, lineHeight: 1.5 }}>
                Requesting <b>open arena / free-ride time</b> — pick when you’d like to ride and the barn will confirm the arena is open.
              </div>
            )}

            {picksLesson && (
              upcoming.length > 0 ? (
                <select value={lessonId} onChange={e => setLessonId(e.target.value)} style={inp}>
                  <option value="">Which lesson? (choose one)</option>
                  {upcoming.map(l => <option key={l.id} value={l.id}>{fmtLesson(l)}</option>)}
                </select>
              ) : (
                <div style={{ fontSize: 12, color: C.muted2, marginBottom: 10 }}>No upcoming lessons on file yet — describe it below.</div>
              )
            )}

            {!picksLesson && <input style={inp} placeholder="Rider name" value={rider} onChange={e => setRider(e.target.value)} />}

            <textarea style={{ ...inp, minHeight: 66 }} placeholder={isFreeRide ? 'What are you hoping to work on? (optional detail)' : 'Reason / what you need'} value={reason} onChange={e => setReason(e.target.value)} />
            {kind !== 'Cancel' && <input style={inp} placeholder="Days/times that work for you (comma-separated)" value={pref} onChange={e => setPref(e.target.value)} />}

            <Button disabled={!ready} onClick={submit}>Send request</Button>
            <Button kind="ghost" onClick={onClose} style={{ marginTop: 10 }}>Cancel</Button>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------- Open Arena availability ---------------- */
function parseTime(label?: string | null): number | null {
  if (!label) return null;
  const m = /(\d{1,2}):(\d{2})\s*([AaPp][Mm])/.exec(label);
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (/[Pp]/.test(m[3])) h += 12;
  return h * 60 + Number(m[2]);
}
function fmtTime(mins: number): string {
  let h = Math.floor(mins / 60); const mm = mins % 60;
  const ap = h >= 12 ? 'PM' : 'AM'; let hh = h % 12; if (hh === 0) hh = 12;
  return `${hh}:${String(mm).padStart(2, '0')} ${ap}`;
}
function buildSlots(open?: string | null, close?: string | null, step?: number | null): string[] {
  const a = parseTime(open) ?? 7 * 60;
  const b = parseTime(close) ?? 19 * 60;
  const s = Number(step) || 60;
  const out: string[] = [];
  for (let t = a; t < b; t += s) out.push(fmtTime(t));
  return out;
}
const norm = (s?: string | null) => (s || '').replace(/\s+/g, '').toUpperCase();

function ArenaDay({ date }: { date: Date }) {
  const { barn, isStaff, user } = useApp();
  const dk = dayKey(date);
  const { data: lessons } = useTable<Lesson>('lessons', q => q.order('starts_at'));
  const { data: bookings, reload } = useTable<ArenaBooking>('arena_bookings', q => q.eq('date', dk));
  // All pending requests across every day (for staff to review in one place).
  const { data: pending, reload: reloadPending } = useTable<ArenaBooking>('arena_bookings', q => q.eq('status', 'requested').order('date'));

  function refreshAll() { reload(); reloadPending(); }

  const dayOpen = barn?.arena_days ? barn.arena_days[String(date.getDay())] !== false : true;
  const slots = buildSlots(barn?.arena_open, barn?.arena_close, barn?.arena_slot_min);
  const dayLessons = lessons.filter(l => l.starts_at.slice(0, 10) === dk);

  function slotInfo(slot: string) {
    const booking = bookings.find(b => b.start_label === slot && b.status !== 'denied');
    if (booking) return { state: booking.status === 'approved' ? 'booked' : 'requested', booking } as const;
    const lesson = dayLessons.find(l => norm(l.time_label) === norm(slot));
    if (lesson) return { state: 'lesson', lesson } as const;
    return { state: 'open' } as const;
  }

  async function request(slot: string) {
    await supabase.from('arena_bookings').insert({
      barn_id: barn?.id, family_id: user?.family_id || null, rider_name: user?.full_name || null,
      date: dk, start_label: slot, status: isStaff ? 'approved' : 'requested',
    });
    if (!isStaff) {
      await notify({ barn_id: barn?.id, audience: 'staff', kind: 'request', link: 'requests',
        title: 'New arena time request', body: `${user?.full_name || 'A client'} · ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${slot}` });
    }
    refreshAll();
  }
  async function setStatus(id: string, status: string) {
    await supabase.from('arena_bookings').update({ status }).eq('id', id);
    const b = [...bookings, ...pending].find(x => x.id === id);
    if (b && b.family_id && status !== 'requested') {
      await notify({ barn_id: barn?.id, family_id: b.family_id, kind: 'approval', link: 'requests',
        title: `Arena time ${status === 'approved' ? 'approved' : 'declined'}`,
        body: `${new Date(b.date + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${b.start_label}` });
    }
    refreshAll();
  }
  async function remove(id: string) { await supabase.from('arena_bookings').delete().eq('id', id); refreshAll(); }

  const COLORS: Record<string, { c: string; label: string }> = {
    open: { c: C.green, label: 'Open' },
    lesson: { c: C.red, label: 'Lesson' },
    requested: { c: C.gold, label: 'Requested' },
    booked: { c: C.navy, label: 'Booked' },
  };

  const PendingRequests = isStaff && pending.length > 0 ? (
    <>
      <SectionLabel>Arena requests to approve ({pending.length})</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 6 }}>
        {pending.map(b => (
          <div key={b.id} style={{ background: C.goldTint, borderRadius: 12, padding: '11px 13px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{b.rider_name || 'Rider'}</div>
              <div style={{ fontSize: 11, color: C.muted2 }}>{new Date(b.date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · {b.start_label}</div>
            </div>
            <button onClick={() => setStatus(b.id, 'approved')} style={actBtn(C.green)}>Approve</button>
            <button onClick={() => setStatus(b.id, 'denied')} style={actBtn(C.red)}>Deny</button>
          </div>
        ))}
      </div>
    </>
  ) : null;

  if (!dayOpen) {
    return (
      <>
        {PendingRequests}
        <div style={{ textAlign: 'center', color: C.muted2, fontSize: 13, padding: '22px 12px', marginTop: 12, background: 'rgba(255,255,255,0.5)', borderRadius: 14 }}>Arena is closed on {date.toLocaleDateString(undefined, { weekday: 'long' })}.</div>
      </>
    );
  }

  return (
    <>
      {PendingRequests}
      <SectionLabel>{date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} · arena</SectionLabel>
      <div style={{ display: 'flex', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
        {Object.values(COLORS).map(v => (
          <span key={v.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: C.muted2 }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: v.c }} />{v.label}
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {slots.map(slot => {
          const info = slotInfo(slot);
          // For a lesson slot, show the lesson TYPE (Group/Private/…); group lessons
          // get the gold "limited space" color, others red (full).
          const isGroup = info.state === 'lesson' && /group|semi/i.test(info.lesson?.lesson_type || '');
          const col = info.state === 'lesson'
            ? { c: isGroup ? C.gold : C.red, label: `${info.lesson?.lesson_type || 'Lesson'} lesson` }
            : COLORS[info.state];
          const lessonRiders = info.state === 'lesson' && info.lesson ? riderNames(info.lesson) : [];
          return (
            <div key={slot} style={{ background: '#fff', borderRadius: 12, padding: '11px 13px', display: 'flex', alignItems: 'center', gap: 11 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: col.c, flex: 'none' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>{slot}</span>
                <span style={{ fontSize: 12, color: col.c, fontWeight: 700, marginLeft: 8 }}>{col.label}</span>
                {info.state === 'lesson' && lessonRiders.length > 0 && (
                  <span style={{ fontSize: 11, color: C.muted2, marginLeft: 6 }}>· {lessonRiders.join(', ')}</span>
                )}
                {info.state !== 'open' && info.state !== 'lesson' && info.booking?.rider_name && (
                  <span style={{ fontSize: 11, color: C.muted2, marginLeft: 6 }}>· {info.booking.rider_name}</span>
                )}
              </div>
              {/* actions */}
              {info.state === 'open' && !isStaff && (
                <button onClick={() => request(slot)} style={actBtn(C.green)}>Request</button>
              )}
              {info.state === 'open' && isStaff && (
                <button onClick={() => request(slot)} style={actBtn(C.navy)}>Block</button>
              )}
              {info.state === 'requested' && isStaff && info.booking && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setStatus(info.booking!.id, 'approved')} style={actBtn(C.green)}>Approve</button>
                  <button onClick={() => setStatus(info.booking!.id, 'denied')} style={actBtn(C.red)}>Deny</button>
                </div>
              )}
              {info.state === 'booked' && isStaff && info.booking && (
                <button onClick={() => remove(info.booking!.id)} style={actBtn(C.red)}>Free up</button>
              )}
              {info.state === 'requested' && !isStaff && <span style={{ fontSize: 11, color: C.muted2 }}>pending</span>}
            </div>
          );
        })}
        {slots.length === 0 && <div style={{ textAlign: 'center', color: C.muted2, fontSize: 13, padding: 16 }}>Set your arena hours in Barn Settings.</div>}
      </div>
    </>
  );
}
const actBtn = (color: string): React.CSSProperties => ({ background: color + '1a', color, border: 'none', borderRadius: 9, padding: '7px 11px', fontSize: 11.5, fontWeight: 800, flex: 'none' });
