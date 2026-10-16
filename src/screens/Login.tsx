import { useState } from 'react';
import { supabase } from '../supabase';
import { C, serif } from '../theme';
import { Button } from '../ui';

export default function Login() {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  async function submit() {
    setErr(''); setMsg(''); setBusy(true);
    try {
      if (mode === 'up') {
        if (!name.trim()) throw new Error('Please enter your name.');
        const { error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(), password: pw,
          options: { data: { full_name: name.trim() } },
        });
        if (error) throw error;
        setMsg('Account created — signing you in…');
        const { error: e2 } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: pw });
        if (e2) { setMsg('Account created. If email confirmation is on, check your inbox, then sign in.'); setMode('in'); }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: pw });
        if (error) throw error;
      }
    } catch (e: any) {
      setErr(e.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  const inp: React.CSSProperties = { width: '100%', border: `1px solid ${C.page}`, borderRadius: 12, padding: '13px 14px', fontSize: 15, background: '#fff', outline: 'none', marginBottom: 11, fontFamily: 'inherit' };

  return (
    <div className="phone" style={{ background: `linear-gradient(160deg, ${C.navy}, ${C.navyDeep})` }}>
      <div className="scroll" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '30px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div style={{ fontFamily: serif, fontSize: 38, color: C.goldLight }}>Free Rein</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>Equestrian barn management</div>
        </div>

        <div style={{ background: C.page, borderRadius: 20, padding: 20 }}>
          <div style={{ fontFamily: serif, fontSize: 22, color: C.navy, marginBottom: 14 }}>
            {mode === 'in' ? 'Sign in' : 'Create an account'}
          </div>
          {mode === 'up' && (
            <input style={inp} placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
          )}
          <input style={inp} placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} inputMode="email" autoCapitalize="none" />
          <input style={inp} placeholder="Password" type="password" value={pw} onChange={e => setPw(e.target.value)} />

          {err && <div style={{ color: C.red, fontSize: 12.5, margin: '2px 2px 10px', fontWeight: 600 }}>{err}</div>}
          {msg && <div style={{ color: C.green, fontSize: 12.5, margin: '2px 2px 10px', fontWeight: 600 }}>{msg}</div>}

          <Button disabled={busy || !email || !pw} onClick={submit}>
            {busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : 'Create account'}
          </Button>

          <button
            onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setErr(''); setMsg(''); }}
            style={{ width: '100%', background: 'none', border: 'none', color: C.muted, fontSize: 12.5, fontWeight: 600, marginTop: 14 }}>
            {mode === 'in' ? 'New here? Create an account' : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
