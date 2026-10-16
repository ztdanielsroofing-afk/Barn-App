import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from './supabase';

type QueryModifier = (q: any) => any;

// Small data hook: selects a table (with optional query modifier) and exposes
// the rows plus a reload(). The modifier is captured once so passing an inline
// arrow each render doesn't cause reload loops.
export function useTable<T = any>(table: string, modify?: QueryModifier) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const modifyRef = useRef(modify);
  modifyRef.current = modify;

  const load = useCallback(async () => {
    setLoading(true);
    let q: any = supabase.from(table).select('*');
    if (modifyRef.current) q = modifyRef.current(q);
    const { data: rows, error: err } = await q;
    if (err) setError(err.message);
    setData(((rows as T[]) || []));
    setLoading(false);
  }, [table]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, reload: load };
}
