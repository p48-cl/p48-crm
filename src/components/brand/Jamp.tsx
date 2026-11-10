import React, { useId } from 'react';

// Isotipo JAMP: cuadrado midnight con una «J» de tres segmentos (Sales, Media, Organic).
export const JampMark: React.FC<{ size?: number; className?: string }> = ({ size = 32, className }) => {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" role="img" aria-label="JAMP" className={className}>
      <defs>
        <linearGradient id={`${id}-bg`} x1="14" y1="10" x2="117" y2="121" gradientUnits="userSpaceOnUse">
          <stop stopColor="#102B43" />
          <stop offset="1" stopColor="#020617" />
        </linearGradient>
      </defs>
      <rect width="128" height="128" rx="36" fill={`url(#${id}-bg)`} />
      <g fill="none" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round">
        <path d="M84 25v31" stroke="#38BDF8" />
        <path d="M84 56v20c0 18-12 28-29 28" stroke="#14B8A6" />
        <path d="M55 104c-17 0-27-10-27-25" stroke="#F59E0B" />
      </g>
    </svg>
  );
};

// Logotipo tipográfico: «JAMP» bold + «CRM» regular, en Inter.
export const JampWordmark: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`font-sans tracking-tight text-[var(--c-text)] ${className}`}>
    <span className="font-bold">JAMP</span> <span className="font-normal">CRM</span>
  </span>
);

export const JampBrand: React.FC<{ size?: number; subtitle?: boolean; className?: string }> = ({ size = 32, subtitle = false, className = '' }) => (
  <div className={`flex items-center gap-2.5 ${className}`}>
    <JampMark size={size} />
    <div className="leading-tight">
      <JampWordmark className="text-sm" />
      {subtitle && <p className="text-[9px] font-mono uppercase tracking-[0.18em] text-[var(--c-muted-2)] mt-0.5">Multi agent</p>}
    </div>
  </div>
);
