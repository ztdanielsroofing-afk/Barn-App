import { supabase } from './supabase';

// Create an in-app notification. Fire-and-forget; failures are swallowed so a
// notification never blocks the action that triggered it.
export async function notify(opts: {
  barn_id?: string;
  audience?: 'staff' | null;      // 'staff' => all staff/owner see it
  family_id?: string | null;      // target a specific client family
  title: string;
  body?: string;
  kind?: string;
  link?: string;
}) {
  try {
    await supabase.from('notifications').insert({
      barn_id: opts.barn_id,
      audience: opts.audience ?? null,
      family_id: opts.family_id ?? null,
      title: opts.title,
      body: opts.body ?? null,
      kind: opts.kind ?? 'info',
      link: opts.link ?? null,
    });
  } catch { /* ignore */ }
}
