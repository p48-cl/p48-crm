import React from 'react';
import { Plus } from 'lucide-react';

// Piezas compartidas por Cotizaciones y Facturas para que se vean y se lean igual.

export const EncabezadoDoc: React.FC<{ titulo: string; subtitulo?: string; botonTexto?: string; onBoton?: () => void }> = ({ titulo, subtitulo, botonTexto, onBoton }) => (
  <div className="flex items-start justify-between gap-3">
    <div>
      <h3 className="text-xs font-semibold text-[var(--c-text)]">{titulo}</h3>
      {subtitulo && <p className="text-[11px] text-[var(--c-muted)] mt-0.5">{subtitulo}</p>}
    </div>
    {botonTexto && onBoton && (
      <button onClick={onBoton} className="shrink-0 text-xs text-[var(--c-on-accent)] bg-[var(--c-accent)] hover:bg-[var(--c-accent-hover)] px-2.5 py-1 rounded font-medium flex items-center gap-1">
        <Plus className="w-3.5 h-3.5" /> {botonTexto}
      </button>
    )}
  </div>
);

export interface KpiDocProps { etiqueta: string; valor: string; sub?: string; claseEtiqueta?: string; claseValor?: string; color?: string }

// Siempre 4 tarjetas por sección
export const FilaKpis: React.FC<{ items: KpiDocProps[] }> = ({ items }) => (
  <div className={`grid grid-cols-2 gap-3 ${items.length >= 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
    {items.map((k) => (
      <div key={k.etiqueta} className="surface p-3 space-y-0.5 min-w-0" style={k.color ? { borderTop: `3px solid ${k.color}` } : undefined}>
        <p className={`text-[10px] font-mono uppercase tracking-wider ${k.claseEtiqueta ?? 'text-[var(--c-muted)]'}`} style={k.color ? { color: k.color } : undefined}>{k.etiqueta}</p>
        <p className={`text-sm font-bold font-mono truncate ${k.claseValor ?? 'text-[var(--c-text)]'}`}>{k.valor}</p>
        <p className="text-[10px] font-mono text-[var(--c-muted)] truncate">{k.sub ?? '—'}</p>
      </div>
    ))}
  </div>
);

export const TablaDoc: React.FC<{ columnas: { texto: string; derecha?: boolean }[]; vacio: string; hayFilas: boolean; children: React.ReactNode }> = ({ columnas, vacio, hayFilas, children }) =>
  !hayFilas ? (
    <p className="text-xs text-[var(--c-muted)] py-4 text-center ficha-card">{vacio}</p>
  ) : (
    <div className="ficha-card overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-[10px] font-mono uppercase text-[var(--c-muted)] border-b border-[var(--c-line)]">
            {columnas.map((c) => <th key={c.texto} className={`px-3 py-2 font-normal ${c.derecha ? 'text-right' : ''}`}>{c.texto}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );

export const COLUMNAS_DOC = [
  { texto: 'Documento' },
  { texto: 'Detalle' },
  { texto: 'Emisión' },
  { texto: 'Vence' },
  { texto: 'Total', derecha: true },
  { texto: 'Estado' },
  { texto: 'Acciones', derecha: true },
];
export const celda = 'px-3 py-2';
export const filaClase = 'border-b border-[var(--c-line)] last:border-0';
