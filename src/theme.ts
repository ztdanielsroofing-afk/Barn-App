export const serif = "'Georgia', 'Times New Roman', 'Iowan Old Style', serif";

export const C = {
  navy: '#283a6d',
  navyDeep: '#0e1530',
  gold: '#c9a14a',
  goldLight: '#e6c877',
  goldTint: 'rgba(201,161,74,0.16)',
  green: '#4b7d57',
  greenBg: 'rgba(75,125,87,0.13)',
  red: '#b5532e',
  redBg: 'rgba(181,83,46,0.12)',
  purple: '#6a5a8a',
  purpleBg: 'rgba(106,90,138,0.13)',
  info: '#3a6ea5',
  infoBg: 'rgba(58,110,165,0.12)',
  page: '#e4ddcf',
  card: '#ffffff',
  text: '#2b2b2b',
  muted: '#6b6455',
  muted2: '#8a8270',
  faint: '#a99f88',
};

export const BRAND_OPTIONS: { name: string; value: string }[] = [
  { name: 'Navy', value: '#283a6d' },
  { name: 'Forest', value: '#4b7d57' },
  { name: 'Wine', value: '#7a2e3a' },
  { name: 'Plum', value: '#6a5a8a' },
  { name: 'Slate', value: '#3a4a5a' },
  { name: 'Rust', value: '#b5532e' },
];

export function money(n: number | null | undefined): string {
  const v = Number(n) || 0;
  const hasCents = Math.abs(v % 1) > 0.001;
  return '$' + v.toLocaleString('en-US', {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  });
}
