import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from './supabase';
import { AppUser, Barn, Role } from './types';

interface Ctx {
  loading: boolean;
  session: boolean;
  user: AppUser | null;
  barn: Barn | null;
  role: Role | null;          // effective role (may be a preview)
  actualRole: Role | null;    // the real role from the database
  previewRole: Role | null;   // owner's "view as" override, if any
  setPreviewRole: (r: Role | null) => void;
  canViewBilling: boolean;
  canEditBilling: boolean;
  canManageStaff: boolean;
  isStaff: boolean;
  isClient: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AppCtx = createContext<Ctx>({} as Ctx);
export const useApp = () => useContext(AppCtx);

export function AppProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [barn, setBarn] = useState<Barn | null>(null);
  const [previewRole, setPreviewRoleState] = useState<Role | null>(() => {
    const v = localStorage.getItem('previewRole');
    return v === 'owner' || v === 'head_trainer' || v === 'trainer' || v === 'client' ? v : null;
  });
  const setPreviewRole = useCallback((r: Role | null) => {
    if (r) localStorage.setItem('previewRole', r);
    else localStorage.removeItem('previewRole');
    setPreviewRoleState(r);
  }, []);

  const loadProfile = useCallback(async () => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setSession(false); setUser(null); setBarn(null); return;
    }
    setSession(true);
    // Self-heal profile linkage (handles re-invited emails whose login already
    // exists, so the signup trigger didn't run). Safe/idempotent.
    try { await supabase.rpc('ensure_profile'); } catch { /* older DB without the fn */ }
    const { data: u } = await supabase
      .from('users').select('*').eq('auth_id', authData.user.id).maybeSingle();
    if (u) {
      setUser(u as AppUser);
      const { data: b } = await supabase
        .from('barns').select('*').eq('id', (u as AppUser).barn_id).maybeSingle();
      if (b) setBarn(b as Barn);
    } else {
      setUser(null);
    }
  }, []);

  const refresh = useCallback(async () => {
    await loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    (async () => {
      await loadProfile();
      setLoading(false);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange(async () => {
      setLoading(true);
      await loadProfile();
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(false); setUser(null); setBarn(null);
  }, []);

  const actualRole = user?.role ?? null;
  const role: Role | null =
    actualRole === 'owner' && previewRole ? previewRole : actualRole;
  const isStaff = !!role && role !== 'client';
  const isClient = role === 'client';
  const canViewBilling = role === 'owner' || role === 'head_trainer';
  const canEditBilling =
    role === 'owner' || (role === 'head_trainer' && !!barn?.head_can_edit_billing);
  const canManageStaff =
    role === 'owner' || (role === 'head_trainer' && !!barn?.head_can_edit_staff);

  return (
    <AppCtx.Provider
      value={{
        loading, session, user, barn, role,
        actualRole, previewRole,
        setPreviewRole: actualRole === 'owner' ? setPreviewRole : () => {},
        canViewBilling, canEditBilling, canManageStaff, isStaff, isClient,
        refresh, signOut,
      }}
    >
      {children}
    </AppCtx.Provider>
  );
}
