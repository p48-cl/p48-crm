import React from 'react';

export type TonoFranja = 'ok' | 'warn' | 'danger' | 'muted' | 'normal';

export interface ItemFranja {
  etiqueta: string;
  valor: React.ReactNode;
  tonoValor?: TonoFranja;
  mono?: boolean;
  nota?: React.ReactNode;
  tonoNota?: TonoFranja;
}

const CLASE_TONO: Record<TonoFranja, string> = {
  ok: 'text-[var(--c-ok)]',
  warn: 'text-[var(--c-warn)]',
  danger: 'text-[var(--c-danger)]',
  muted: 'text-[var(--c-muted)]',
  normal: 'text-[var(--c-text)]',
};

// Franja de decisión: 4 datos clave siempre visibles bajo el encabezado de una ficha.
// Las líneas divisorias salen del gap sobre fondo de línea, así no dependen del orden ni del nº de columnas.
export const FranjaDecision: React.FC<{ items: ItemFranja[] }> = ({ items }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[var(--c-line)] border-b border-[var(--c-line)]">
    {items.map((it) => (
      <div key={it.etiqueta} className="bg-[var(--c-surface)] px-4 sm:px-5 py-3 min-w-0">
        <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--c-muted)]">{it.etiqueta}</p>
        <p
          className={`text-sm font-semibold mt-0.5 truncate ${it.mono ? 'font-mono' : ''} ${CLASE_TONO[it.tonoValor ?? 'normal']}`}
        >
          {it.valor}
        </p>
        {it.nota ? (
          <p className={`text-[10px] font-mono mt-0.5 truncate ${CLASE_TONO[it.tonoNota ?? 'muted']}`}>{it.nota}</p>
        ) : null}
      </div>
    ))}
  </div>
);
