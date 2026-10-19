// Per-device Home-screen preferences (timeframe + which modules show).
export type Timeframe = 'day' | 'week' | 'month';
export interface HomePrefs { timeframe: Timeframe; modules: Record<string, boolean>; }

export const HOME_MODULES: { key: string; label: string }[] = [
  { key: 'requests', label: 'Pending requests alert' },
  { key: 'balance', label: 'My balance (clients)' },
  { key: 'attention', label: 'Care & overdue attention' },
  { key: 'upcoming', label: 'Upcoming schedule' },
];

const KEY = 'homePrefs';

export function getHomePrefs(): HomePrefs {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { timeframe: v.timeframe || 'week', modules: v.modules || {} };
  } catch {
    return { timeframe: 'week', modules: {} };
  }
}

export function setHomePrefs(p: HomePrefs) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

// Modules default to ON unless explicitly turned off.
export const moduleOn = (p: HomePrefs, key: string) => p.modules[key] !== false;
