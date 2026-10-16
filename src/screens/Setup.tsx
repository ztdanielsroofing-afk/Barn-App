import { C, serif } from '../theme';

export default function Setup() {
  return (
    <div className="phone" style={{ alignItems: 'center', justifyContent: 'center', background: C.navyDeep, color: '#fff', padding: 30 }}>
      <div style={{ maxWidth: 340 }}>
        <div style={{ fontFamily: serif, fontSize: 30, color: C.goldLight, marginBottom: 8 }}>Free Rein</div>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Almost there — connect your database.</div>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: 'rgba(255,255,255,0.8)' }}>
          Open <code style={{ background: 'rgba(255,255,255,0.12)', padding: '1px 6px', borderRadius: 5 }}>config.js</code> and
          fill in your Supabase <b>URL</b> and <b>anon key</b>, then reload this page.
        </p>
        <p style={{ fontSize: 12, lineHeight: 1.6, color: 'rgba(255,255,255,0.6)', marginTop: 14 }}>
          You'll find both in Supabase → Project Settings → API.
        </p>
      </div>
    </div>
  );
}
