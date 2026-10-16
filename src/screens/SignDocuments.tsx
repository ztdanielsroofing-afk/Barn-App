import { useRef, useState, useEffect } from 'react';
import { C, serif } from '../theme';
import { Button } from '../ui';
import { supabase } from '../supabase';
import { useApp } from '../AppContext';
import { useTable } from '../db';
import { BarnDocument, Signature } from '../types';

// Gate shown to a client who still has required documents to sign.
// Presents each required, unsigned document in turn; can't finish until all
// required ones are signed (typed or drawn).
export default function SignDocuments({ onComplete }: { onComplete: () => void }) {
  const { user, barn, signOut } = useApp();
  const { data: docs } = useTable<BarnDocument>('barn_documents', q => q.eq('active', true).order('created_at'));
  const { data: sigs, reload } = useTable<Signature>('signatures', q => q.eq('family_id', user?.family_id));

  const signedIds = new Set(sigs.map(s => s.document_id));
  const requiredUnsigned = docs.filter(d => d.required && !signedIds.has(d.id));

  // When nothing required is left unsigned, we're done.
  useEffect(() => {
    if (docs.length >= 0 && requiredUnsigned.length === 0) onComplete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requiredUnsigned.length]);

  const doc = requiredUnsigned[0];
  if (!doc) {
    return (
      <div className="phone" style={{ alignItems: 'center', justifyContent: 'center', background: C.page }}>
        <div style={{ color: C.navy, fontFamily: serif, fontSize: 20 }}>All set…</div>
      </div>
    );
  }

  const total = docs.filter(d => d.required).length;
  const doneCount = total - requiredUnsigned.length;

  return (
    <div className="phone">
      <div className="scroll" style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ background: C.navy, color: '#fff', padding: '52px 22px 20px', borderBottomLeftRadius: 26, borderBottomRightRadius: 26 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.goldLight, letterSpacing: '0.06em' }}>
            DOCUMENT {doneCount + 1} OF {total}
          </div>
          <div style={{ fontFamily: serif, fontSize: 24, marginTop: 4 }}>{doc.title}</div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.72)', marginTop: 6 }}>
            Please read and sign to continue.
          </div>
        </div>

        <div style={{ padding: '18px 20px 30px' }}>
          <div style={{
            background: '#fff', borderRadius: 14, padding: 16, fontSize: 13, color: C.text,
            lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: '38vh', overflowY: 'auto',
            border: `1px solid ${C.page}`,
          }}>
            {doc.body || 'No document text provided.'}
          </div>

          <SignaturePad
            key={doc.id}
            defaultName={user?.full_name || ''}
            onSign={async ({ method, data, name }) => {
              await supabase.from('signatures').insert({
                barn_id: barn?.id, document_id: doc.id, family_id: user?.family_id,
                signer_name: name, method, signature_data: data,
              });
              reload();
            }}
          />

          <Button kind="ghost" onClick={signOut} style={{ marginTop: 14, color: C.muted }}>Sign out</Button>
        </div>
      </div>
    </div>
  );
}

function SignaturePad({ defaultName, onSign }:
  { defaultName: string; onSign: (s: { method: string; data: string; name: string }) => Promise<void> }) {
  const [mode, setMode] = useState<'type' | 'draw'>('type');
  const [typed, setTyped] = useState(defaultName);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  function ctx() {
    const c = canvasRef.current!;
    const g = c.getContext('2d')!;
    return { c, g };
  }
  function pos(e: React.PointerEvent) {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
  }
  function down(e: React.PointerEvent) {
    drawing.current = true;
    const { g } = ctx(); const p = pos(e);
    g.strokeStyle = C.navy; g.lineWidth = 2.5; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(p.x, p.y);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }
  function move(e: React.PointerEvent) {
    if (!drawing.current) return;
    const { g } = ctx(); const p = pos(e);
    g.lineTo(p.x, p.y); g.stroke(); setHasInk(true);
  }
  function up() { drawing.current = false; }
  function clear() { const { c, g } = ctx(); g.clearRect(0, 0, c.width, c.height); setHasInk(false); }

  const canSign = mode === 'type' ? !!typed.trim() && agreed : hasInk && agreed;

  async function submit() {
    setBusy(true);
    try {
      if (mode === 'type') {
        await onSign({ method: 'typed', data: typed.trim(), name: typed.trim() });
      } else {
        const data = canvasRef.current!.toDataURL('image/png');
        await onSign({ method: 'drawn', data, name: typed.trim() || defaultName });
      }
    } finally { setBusy(false); }
  }

  const tab = (m: 'type' | 'draw', label: string) => (
    <button onClick={() => setMode(m)} style={{
      flex: 1, border: 'none', borderRadius: 10, padding: '10px 4px', fontSize: 13, fontWeight: 700,
      background: mode === m ? C.navy : '#fff', color: mode === m ? '#fff' : C.muted,
    }}>{label}</button>
  );

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', color: C.faint, textTransform: 'uppercase', marginBottom: 8 }}>Your signature</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {tab('type', 'Type it')}
        {tab('draw', 'Draw it')}
      </div>

      {mode === 'type' ? (
        <input
          value={typed}
          onChange={e => setTyped(e.target.value)}
          placeholder="Type your full legal name"
          style={{
            width: '100%', border: `1px solid ${C.page}`, borderRadius: 12, padding: '14px',
            fontSize: 22, fontFamily: serif, color: C.navy, background: '#fff', outline: 'none',
          }}
        />
      ) : (
        <div>
          <canvas
            ref={canvasRef}
            width={600}
            height={200}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerLeave={up}
            style={{ width: '100%', height: 150, background: '#fff', border: `1px solid ${C.page}`, borderRadius: 12, touchAction: 'none' }}
          />
          <button onClick={clear} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 12, fontWeight: 600, marginTop: 6 }}>Clear</button>
        </div>
      )}

      <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 14, cursor: 'pointer' }}>
        <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ width: 20, height: 20, flex: 'none', marginTop: 1 }} />
        <span style={{ fontSize: 12.5, color: C.text, lineHeight: 1.5 }}>
          I have read this document and agree to it. This is my legal signature.
        </span>
      </label>

      <Button disabled={!canSign || busy} onClick={submit} style={{ marginTop: 14 }}>
        {busy ? 'Saving…' : 'Agree & sign'}
      </Button>
    </div>
  );
}
