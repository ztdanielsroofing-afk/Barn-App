import { createClient } from '@supabase/supabase-js';

// Runtime config comes from public/config.js (window.__BARN_CONFIG__), so the
// URL/anon key can be swapped without rebuilding. The anon key is a public
// client key protected by row-level security.
const cfg = (typeof window !== 'undefined' && (window as any).__BARN_CONFIG__) || {};
const url: string = cfg.SUPABASE_URL || '';
const key: string = cfg.SUPABASE_ANON_KEY || '';

export const isConfigured = !!url && !!key;

export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  key || 'placeholder-anon-key',
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
);
