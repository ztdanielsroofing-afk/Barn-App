import { CSSProperties, ReactNode, useEffect } from 'react';
import { C, serif } from './theme';

// Lock the page behind a bottom-sheet so touch-scrolling the sheet doesn't
// scroll the screen behind it. Call once at the top of a modal component.
export function useScrollLock() {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);
}

// Style for a bottom-sheet's scrollable inner panel: caps height to the real
// visible viewport and contains scrolling so it never chains to the page.
export const sheetPanel: CSSProperties = {
  background: C.page, width: '100%', maxWidth: 430,
  borderTopLeftRadius: 26, borderTopRightRadius: 26,
  padding: '22px 20px 34px',
  maxHeight: '88dvh', overflowY: 'auto',
  overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch',
};

export const ICONS: Record<string, string> = {
  home: 'M3 11.5l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  calendar: 'M4 5h16v16H4zM4 9h16M8 3v4M16 3v4',
  horse: 'M5 20c0-6 3-11 9-11l1-3 4 2-1 3c1 2 1 4 0 6M7 20h3M15 17l2 3',
  billing: 'M3 6h18v12H3zM3 10h18M7 15h4',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  chevron: 'M9 6l6 6-6 6',
  plus: 'M12 5v14M5 12h14',
  check: 'M5 13l4 4L19 7',
  bell: 'M6 10a6 6 0 0112 0c0 6 2 7 2 7H4s2-1 2-7M10 21a2 2 0 004 0',
  user: 'M4 21c0-4 4-6 8-6s8 2 8 6M12 11a4 4 0 100-8 4 4 0 000 8',
  back: 'M15 6l-6 6 6 6',
};

export function Icon({ d, size = 20, stroke = C.navy, fill = 'none', width = 2 }:
  { d: string; size?: number; stroke?: string; fill?: string; width?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
      stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export function Card({ children, onClick, style }:
  { children: ReactNode; onClick?: () => void; style?: CSSProperties }) {
  return (
    <div onClick={onClick} style={{
      background: C.card, borderRadius: 16, padding: 15,
      boxShadow: '0 1px 0 rgba(40,58,109,0.05), 0 10px 24px -20px rgba(40,58,109,0.5)',
      cursor: onClick ? 'pointer' : 'default', ...style,
    }}>
      {children}
    </div>
  );
}

export function Button({ children, onClick, kind = 'primary', disabled, style }:
  { children: ReactNode; onClick?: () => void; kind?: 'primary' | 'soft' | 'ghost'; disabled?: boolean; style?: CSSProperties }) {
  const base: CSSProperties = {
    width: '100%', border: 'none', borderRadius: 14, padding: '13px 18px',
    fontSize: 14, fontWeight: 700, cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.5 : 1, transition: 'opacity .15s',
  };
  const kinds: Record<string, CSSProperties> = {
    primary: { background: C.navy, color: '#fff' },
    soft: { background: C.goldTint, color: C.navy },
    ghost: { background: 'transparent', color: C.navy, border: `1px solid rgba(40,58,109,0.18)` },
  };
  return <button disabled={disabled} onClick={onClick} style={{ ...base, ...kinds[kind], ...style }}>{children}</button>;
}

export function Pill({ children, color = C.navy, bg }:
  { children: ReactNode; color?: string; bg?: string }) {
  return (
    <span style={{
      background: bg || color + '1a', color, fontSize: 10.5, fontWeight: 800,
      padding: '4px 9px', borderRadius: 20, textTransform: 'capitalize', whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

export function SectionLabel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 800, letterSpacing: '0.07em', color: C.faint,
      textTransform: 'uppercase', margin: '18px 0 9px', ...style,
    }}>{children}</div>
  );
}

export function H({ children }: { children: ReactNode }) {
  return <div style={{ fontFamily: serif, fontSize: 27, color: C.navy, marginBottom: 12 }}>{children}</div>;
}

export function Avatar({ init, tint = C.navy }: { init: string; tint?: string }) {
  return (
    <div style={{
      width: 44, height: 44, borderRadius: 13, flex: 'none', background: tint + '1a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: serif, fontSize: 18, color: tint, fontWeight: 700, textTransform: 'uppercase',
    }}>{init}</div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div style={{
      textAlign: 'center', color: C.muted2, fontSize: 13, padding: '22px 12px',
      background: 'rgba(255,255,255,0.5)', borderRadius: 14,
    }}>{children}</div>
  );
}

export function Row({ l, v, last }: { l: string; v: ReactNode; last?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
      padding: '10px 0', borderBottom: last ? 'none' : `1px solid rgba(40,58,109,0.06)`,
    }}>
      <span style={{ fontSize: 12.5, color: C.muted2 }}>{l}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: C.text, textAlign: 'right' }}>{v}</span>
    </div>
  );
}
