import React from 'react';

export type TonoChip = 'danger' | 'warn' | 'ok' | 'neutro';

const CLASE: Record<TonoChip, string> = {
  danger: 'text-[var(--c-danger)] border-[var(--c-danger)]/40 bg-[var(--c-danger)]/10',
  warn: 'text-[var(--c-warn)] border-[var(--c-warn)]/40 bg-[var(--c-warn)]/10',
  ok: 'text-[var(--c-ok)] border-[var(--c-ok)]/40 bg-[var(--c-ok)]/10',
  neutro: 'text-[var(--c-text-2)] border-[var(--c-line)] bg-[var(--c-surface-2)]',
};

// Etiqueta corta de estado/alerta (seguimiento, sin calificar, origen…)
export const ChipSenal: React.FC<{ tono: TonoChip; className?: string; children: React.ReactNode }> = ({
  tono,
  className = '',
  children,
}) => (
  <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${CLASE[tono]} ${className}`}>
    {children}
  </span>
);
