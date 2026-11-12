import React from 'react';

// Piezas visuales compartidas por Overview, Pipeline y Clientes.

export const estilos = {
  tarjeta: 'surface p-4 flex flex-col gap-2 min-w-0',
  bloque: 'surface p-5 flex flex-col gap-4 min-w-0',
  etiqueta: 'text-[11px] font-mono uppercase tracking-wider text-[var(--c-muted)]',
  valor: 'text-lg font-bold font-mono text-[var(--c-text)] leading-tight break-words',
  nota: 'text-[10px] text-[var(--c-muted)]',
  barra: 'h-1.5 w-full rounded-full bg-[var(--c-surface-3)] overflow-hidden flex',
};

type Tono = 'normal' | 'peligro' | 'aviso';
const colorTono: Record<Tono, string> = {
  normal: '',
  peligro: 'text-[var(--c-danger)]',
  aviso: 'text-[var(--c-warn)]',
};

export const Kpi: React.FC<{
  etiqueta: string;
  valor: React.ReactNode;
  nota?: React.ReactNode;
  tono?: Tono;
  progreso?: number | null; // 0–100
  onClick?: () => void;
  className?: string;
  acento?: string; // color de estado (CSS var): borde superior y etiqueta
}> = ({ etiqueta, valor, nota, tono = 'normal', progreso, onClick, className = '', acento }) => {
  const contenido = (
    <>
      <p className={estilos.etiqueta} style={acento ? { color: acento } : undefined}>{etiqueta}</p>
      <p className={`${estilos.valor} ${colorTono[tono]}`}>{valor}</p>
      {progreso != null && (
        <div className={estilos.barra} aria-hidden>
          <div className="h-full bg-[var(--c-accent)]" style={{ width: `${Math.max(0, Math.min(100, progreso))}%` }} />
        </div>
      )}
      {nota != null && <p className={estilos.nota}>{nota}</p>}
    </>
  );
  return onClick ? (
    <button type="button" onClick={onClick} style={acento ? { borderTop: `3px solid ${acento}` } : undefined} className={`${estilos.tarjeta} text-left hover:border-[var(--c-accent)] transition-colors ${className}`}>
      {contenido}
    </button>
  ) : (
    <div className={`${estilos.tarjeta} ${className}`} style={acento ? { borderTop: `3px solid ${acento}` } : undefined}>{contenido}</div>
  );
};

export interface Segmento {
  clave: string;
  etiqueta: string;
  n: number;
  color: string;
  detalle?: string;
}

const Leyenda: React.FC<{ segmentos: Segmento[]; total: number; vertical?: boolean }> = ({ segmentos, total, vertical }) => (
  <ul className={`flex ${vertical ? 'flex-col gap-1.5' : 'flex-wrap gap-x-4 gap-y-1'} text-[11px] text-[var(--c-text-2)] min-w-0`}>
    {segmentos.map((s) => (
      <li key={s.clave} className="inline-flex items-center gap-1.5 min-w-0">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} aria-hidden />
        <span className="truncate">{s.etiqueta}</span>
        <span className="font-mono text-[var(--c-muted)] whitespace-nowrap">
          {s.detalle ?? `${s.n} · ${total > 0 ? Math.round((s.n / total) * 100) : 0}%`}
        </span>
      </li>
    ))}
  </ul>
);

/** Dona SVG con total al centro y leyenda. */
export const Dona: React.FC<{ segmentos: Segmento[]; centro: React.ReactNode; rotulo: string; tamano?: number }> = ({
  segmentos,
  centro,
  rotulo,
  tamano = 96,
}) => {
  const visibles = segmentos.filter((s) => s.n > 0);
  const total = visibles.reduce((a, s) => a + s.n, 0);
  const R = 40;
  const C = 2 * Math.PI * R;
  let acumulado = 0;
  return (
    <div className="flex items-center gap-5 min-w-0">
      <div className="relative shrink-0" style={{ width: tamano, height: tamano }}>
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90" role="img" aria-label={rotulo}>
          <circle cx="50" cy="50" r={R} fill="none" strokeWidth="12" style={{ stroke: 'var(--c-surface-3)' }} />
          {total > 0 &&
            visibles.map((s) => {
              const largo = (s.n / total) * C;
              const off = -acumulado;
              acumulado += largo;
              return (
                <circle key={s.clave} cx="50" cy="50" r={R} fill="none" strokeWidth="12" style={{ stroke: s.color }}
                  strokeDasharray={`${largo} ${C - largo}`} strokeDashoffset={off} />
              );
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{centro}</div>
      </div>
      <Leyenda segmentos={visibles} total={total} vertical />
    </div>
  );
};

/** Barra apilada horizontal con leyenda. */
export const BarraApilada: React.FC<{ segmentos: Segmento[]; rotulo: string; peso?: (s: Segmento) => number }> = ({
  segmentos,
  rotulo,
  peso = (s) => s.n,
}) => {
  const visibles = segmentos.filter((s) => s.n > 0);
  const totalPeso = visibles.reduce((a, s) => a + peso(s), 0);
  const total = visibles.reduce((a, s) => a + s.n, 0);
  return (
    <>
      <div className={estilos.barra} role="img" aria-label={rotulo}>
        {visibles.map((s) => (
          <div key={s.clave} style={{ width: `${totalPeso > 0 ? (peso(s) / totalPeso) * 100 : 0}%`, background: s.color }} title={s.etiqueta} />
        ))}
      </div>
      <Leyenda segmentos={visibles} total={total} />
    </>
  );
};

/** Fila con etiqueta, valor y barra proporcional. */
export const FilaBarra: React.FC<{ etiqueta: React.ReactNode; valor: React.ReactNode; pct: number; color?: string; sub?: React.ReactNode }> = ({
  etiqueta,
  valor,
  pct,
  color = 'var(--c-accent)',
  sub,
}) => (
  <div className="space-y-1">
    <div className="flex justify-between gap-3 text-[11px]">
      <span className="text-[var(--c-text-2)] truncate">{etiqueta}</span>
      <span className="font-mono text-[var(--c-muted)] whitespace-nowrap">{valor}</span>
    </div>
    <div className="w-full bg-[var(--c-surface-2)] h-1.5 rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }} />
    </div>
    {sub && <p className="text-[10px] text-[var(--c-muted-2)] font-mono">{sub}</p>}
  </div>
);

export const Bloque: React.FC<{ titulo: string; sub?: string; accion?: React.ReactNode; className?: string; children: React.ReactNode }> = ({
  titulo,
  sub,
  accion,
  className = '',
  children,
}) => (
  <section className={`${estilos.bloque} ${className}`}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="text-xs font-semibold text-[var(--c-text)]">{titulo}</h3>
        {sub && <p className="text-[11px] text-[var(--c-muted)]">{sub}</p>}
      </div>
      {accion}
    </div>
    {children}
  </section>
);

export const Vacio: React.FC<{ texto: string }> = ({ texto }) => (
  <p className="text-xs text-[var(--c-muted-2)] text-center py-6">{texto}</p>
);

export const COLOR_SALUD = {
  verde: 'var(--c-ok)',
  amarillo: 'var(--c-warn)',
  rojo: 'var(--c-danger)',
  sin: 'var(--c-muted-2)',
};
