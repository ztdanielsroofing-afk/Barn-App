import { ReactNode } from 'react';
import { C, serif } from '../theme';
import { useApp } from '../AppContext';

export function BrandHeader({ title, subtitle }: { title?: string; subtitle?: string }) {
  const { barn } = useApp();
  const brand = barn?.brand_color || C.navy;
  return (
    <div style={{
      background: `linear-gradient(135deg, ${brand}, ${C.navyDeep})`,
      color: '#fff', padding: '54px 20px 22px',
      borderBottomLeftRadius: 26, borderBottomRightRadius: 26,
    }}>
      <div style={{ fontFamily: serif, fontSize: 23 }}>{title || barn?.name || 'Free Rein'}</div>
      {subtitle && <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.72)', marginTop: 4 }}>{subtitle}</div>}
    </div>
  );
}

export function Page({ children, header = true }: { children: ReactNode; header?: boolean }) {
  return (
    <div>
      {header && <BrandHeader />}
      <div style={{ padding: '16px 20px 30px' }}>{children}</div>
    </div>
  );
}
