import { supabase } from './supabase';
import { Role } from './types';

// Create an invite row + email the person a magic sign-in link.
// When they open the link they're logged in, and the DB trigger / ensure_profile
// assigns their role/barn/family from the invite. Uses Supabase's built-in email
// (no SMTP needed to start; add an SMTP provider in Supabase for higher volume).
export async function sendInvite(opts: {
  email: string;
  role: Role;
  barn_id?: string;
  full_name?: string;
  family_id?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const email = opts.email.trim().toLowerCase();
  if (!email || !email.includes('@')) return { ok: false, error: 'Enter a valid email.' };

  const { error: insErr } = await supabase.from('invites').insert({
    barn_id: opts.barn_id, email, role: opts.role,
    full_name: opts.full_name || null, family_id: opts.family_id || null,
  });
  if (insErr) return { ok: false, error: insErr.message };

  const { error: otpErr } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: window.location.origin },
  });
  if (otpErr) return { ok: false, error: otpErr.message };
  return { ok: true };
}
