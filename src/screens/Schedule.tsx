import { useMemo, useState } from 'react';
import { C, serif } from '../theme';
import { Card, SectionLabel, Pill, Button } from '../ui';
import { Page } from './Header';
import { useTable } from '../db';
import { supabase } from '../supabase';
import { Lesson, Horse } from '../types';
import { useApp } from '../AppContext';
import { Nav } from '../App';

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const lessonColor = (t: string) => ({ Private: C.navy, 'Semi-private': C.purple, Group: C.green, Training: C.gold } as any)[t] || C.navy;

export default function Schedule({ nav: _nav }: { nav: Nav }) {
  const { isStaff, isClient } = useApp();
  const today = new Date();
  const [sel, setSel] = useState<Date>(today);
  const [view, setView] = useState<Date>(new Date(today.getFullYear(), today.getMonth(), 1));
  const [open, setOpen] = useState<Lesson | null>(null);
  const [req, setReq] = useState(false);

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

      <SectionLabel>{sel.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {dayItems.map(l => (
          <Card key={l.id} onClick={() => setOpen(l)} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 4, background: lessonColor(l.lesson_type) }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: C.text }}>{l.rider_name || 'Lesson'}{l.horse_name ? ` · ${l.horse_name}` : ''}</div>
              <div style={{ fontSize: 11, color: C.muted2 }}>{l.time_label}</div>
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
          <Button kind="soft" onClick={() => addLesson(sel, reload)}>+ Add a lesson on this day</Button>
        </div>
      )}
      {isClient && (
        <div style={{ marginTop: 16 }}>
          <Button kind="soft" onClick={() => setReq(true)}>Request a schedule change</Button>
        </div>
      )}
      {req && <RequestSheet onClose={() => setReq(false)} />}
    </Page>
  );
}

const navBtn: React.CSSProperties = { background: '#fff', border: 'none', borderRadius: 10, width: 34, height: 34, fontSize: 18, color: C.navy };

async function addLesson(day: Date, reload: () => void) {
  const rider = prompt('Rider name?');
  if (!rider) return;
  const horse = prompt('Horse?') || '';
  const timeLabel = prompt('Time (e.g. 4:00 PM)?') || '4:00 PM';
  const type = (prompt('Type? Private / Semi-private / Group / Training', 'Private') || 'Private');
  const { data: b } = await supabase.from('barns').select('id').limit(1).maybeSingle();
  const starts = new Date(day); starts.setHours(16, 0, 0, 0);
  await supabase.from('lessons').insert({
    barn_id: b?.id, starts_at: starts.toISOString(), time_label: timeLabel,
    rider_name: rider, horse_name: horse, lesson_type: type, status: 'booked',
  });
  reload();
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
    setSaved(true);
  }
  async function del() {
    if (!confirm('Delete this lesson?')) return;
    await supabase.from('lessons').delete().eq('id', lesson.id);
    onBack();
  }

  return (
    <Page>
      <button onClick={onBack} style={{ background: '#fff', border: 'none', borderRadius: 11, padding: '8px 13px', fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 12 }}>‹ Schedule</button>
      <div style={{ fontFamily: serif, fontSize: 25, color: C.navy }}>{lesson.rider_name || 'Lesson'}</div>
      <div style={{ fontSize: 12, color: C.muted2, marginBottom: 12 }}>
        {new Date(lesson.starts_at).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} · {lesson.time_label}
      </div>
      <Card>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{lesson.lesson_type} lesson</div>
        <div style={{ fontSize: 12, color: C.muted2, marginTop: 4 }}>Horse: {lesson.horse_name || '—'}</div>
      </Card>

      {isStaff && (
        <>
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
