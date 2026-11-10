import React, { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import type { ProyectoFase, Tarea, TareaDependencia } from '../../types/crm';
import { aFecha, diasEntre, diaCorto, hoyIso, sumarDias } from './fechas';

const ALTO_FILA = 36;
const ALTO_CABECERA = 44;
const ANCHO_NOMBRES = 224;
const ESCALAS = { dia: { px: 32, etiqueta: 'Día' }, semana: { px: 14, etiqueta: 'Semana' }, mes: { px: 5, etiqueta: 'Mes' } } as const;
type Escala = keyof typeof ESCALAS;

type Fila =
  | { tipo: 'fase'; id: string; nombre: string; inicio: string; fin: string; hechas: number; total: number }
  | { tipo: 'tarea'; id: string; tarea: Tarea; inicio: string; fin: string };

interface Props {
  tareas: Tarea[];
  fases: ProyectoFase[];
  dependencias: TareaDependencia[];
  nombreMiembro: (id?: string | null) => string;
  onToggle: (t: Tarea) => void;
  onEditar: (t: Tarea) => void;
}

const inicioDe = (t: Tarea) => t.fecha_inicio ?? t.fecha_vencimiento;

export const Gantt: React.FC<Props> = ({ tareas, fases, dependencias, nombreMiembro, onToggle, onEditar }) => {
  const [escala, setEscala] = useState<Escala>('semana');
  const px = ESCALAS[escala].px;
  const hoy = hoyIso();

  const filas = useMemo<Fila[]>(() => {
    const out: Fila[] = [];
    const ordenadas = [...tareas].sort((a, b) => inicioDe(a).localeCompare(inicioDe(b)) || a.fecha_vencimiento.localeCompare(b.fecha_vencimiento));
    const grupos: { id: string; nombre: string; tareas: Tarea[] }[] = [...fases]
      .sort((a, b) => a.orden - b.orden)
      .map((f) => ({ id: f.id, nombre: f.nombre, tareas: ordenadas.filter((t) => t.fase_id === f.id) }));
    const sueltas = ordenadas.filter((t) => !t.fase_id || !fases.some((f) => f.id === t.fase_id));
    if (sueltas.length > 0) grupos.push({ id: 'sin-fase', nombre: 'Sin fase', tareas: sueltas });
    for (const g of grupos) {
      const fase = fases.find((f) => f.id === g.id);
      const ini = g.tareas.length ? g.tareas.map(inicioDe).sort()[0] : fase?.fecha_inicio ?? hoy;
      const fin = g.tareas.length ? g.tareas.map((t) => t.fecha_vencimiento).sort().slice(-1)[0] : fase?.fecha_fin ?? ini;
      out.push({ tipo: 'fase', id: g.id, nombre: g.nombre, inicio: ini, fin, hechas: g.tareas.filter((t) => t.completada).length, total: g.tareas.length });
      for (const t of g.tareas) out.push({ tipo: 'tarea', id: t.id, tarea: t, inicio: inicioDe(t), fin: t.fecha_vencimiento });
    }
    return out;
  }, [tareas, fases, hoy]);

  // Rango visible: desde la primera fecha hasta la última, con margen; siempre incluye hoy
  const { desde, dias } = useMemo(() => {
    const fechas = filas.flatMap((f) => [f.inicio, f.fin]).concat(hoy);
    const min = fechas.reduce((a, b) => (a < b ? a : b));
    const max = fechas.reduce((a, b) => (a > b ? a : b));
    const d = sumarDias(min, -3);
    return { desde: d, dias: diasEntre(d, sumarDias(max, 7)) + 1 };
  }, [filas, hoy]);

  const ancho = dias * px;
  const x = (iso: string) => diasEntre(desde, iso) * px;
  const indiceFila = useMemo(() => new Map(filas.map((f, i) => [f.id, i])), [filas]);

  // Marcas de la cabecera
  const meses = useMemo(() => {
    const out: { etiqueta: string; x: number; ancho: number }[] = [];
    for (let i = 0; i < dias; ) {
      const d = aFecha(sumarDias(desde, i));
      const restantes = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() - d.getDate() + 1;
      const largo = Math.min(restantes, dias - i);
      out.push({ etiqueta: d.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }), x: i * px, ancho: largo * px });
      i += largo;
    }
    return out;
  }, [desde, dias, px]);

  const marcas = useMemo(() => {
    if (escala === 'mes') return [];
    const out: { x: number; etiqueta: string; finde: boolean }[] = [];
    for (let i = 0; i < dias; i++) {
      const d = aFecha(sumarDias(desde, i));
      if (escala === 'dia') out.push({ x: i * px, etiqueta: String(d.getDate()), finde: d.getDay() === 0 || d.getDay() === 6 });
      else if (d.getDay() === 1) out.push({ x: i * px, etiqueta: String(d.getDate()), finde: false });
    }
    return out;
  }, [desde, dias, px, escala]);

  if (tareas.length === 0 && fases.length === 0) {
    return <div className="surface p-6 text-sm text-[var(--c-muted)]">Aún no hay fases ni tareas. Agrega la primera fase o crea el proyecto desde una plantilla.</div>;
  }

  const color = (t: Tarea) => (t.completada ? 'var(--c-ok)' : t.fecha_vencimiento < hoy ? 'var(--c-danger)' : 'var(--c-accent)');
  const alto = filas.length * ALTO_FILA;

  return (
    <div className="surface overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[var(--c-line)]">
        <div className="flex flex-wrap gap-3 text-[10px] font-mono uppercase tracking-wider text-[var(--c-muted)]">
          <span className="inline-flex items-center gap-1"><i className="w-2 h-2 rounded-sm bg-[var(--c-accent)]" />En curso</span>
          <span className="inline-flex items-center gap-1"><i className="w-2 h-2 rounded-sm bg-[var(--c-ok)]" />Hecha</span>
          <span className="inline-flex items-center gap-1"><i className="w-2 h-2 rounded-sm bg-[var(--c-danger)]" />Atrasada</span>
        </div>
        <div role="group" aria-label="Escala" className="inline-flex gap-1 p-0.5 rounded-md bg-[var(--c-surface-2)]">
          {(Object.keys(ESCALAS) as Escala[]).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={escala === k}
              onClick={() => setEscala(k)}
              className={`px-2 py-0.5 text-[11px] rounded ${escala === k ? 'bg-[var(--c-surface)] text-[var(--c-text)] font-semibold ring-1 ring-[var(--module)]' : 'text-[var(--c-muted)]'}`}
            >
              {ESCALAS[k].etiqueta}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="flex" style={{ width: ANCHO_NOMBRES + ancho }}>
          {/* Columna de nombres (fija al desplazar) */}
          <div className="sticky left-0 z-10 shrink-0 bg-[var(--c-surface)] border-r border-[var(--c-line)]" style={{ width: ANCHO_NOMBRES }}>
            <div style={{ height: ALTO_CABECERA }} className="border-b border-[var(--c-line)] px-3 flex items-end pb-1 text-[10px] font-mono uppercase tracking-wider text-[var(--c-muted)]">
              Fase / tarea
            </div>
            {filas.map((f) =>
              f.tipo === 'fase' ? (
                <div key={f.id} style={{ height: ALTO_FILA }} className="px-3 flex items-center justify-between gap-2 bg-[var(--c-surface-2)] border-b border-[var(--c-line)]">
                  <span className="text-xs font-semibold text-[var(--c-text)] truncate">{f.nombre}</span>
                  <span className="text-[10px] font-mono text-[var(--c-muted)] shrink-0">{f.hechas}/{f.total}</span>
                </div>
              ) : (
                <div key={f.id} style={{ height: ALTO_FILA }} className="px-2 flex items-center gap-2 border-b border-[var(--c-line)]">
                  <button
                    type="button"
                    onClick={() => onToggle(f.tarea)}
                    aria-label={f.tarea.completada ? 'Marcar pendiente' : 'Marcar hecha'}
                    className={`w-4 h-4 rounded border grid place-items-center shrink-0 ${f.tarea.completada ? 'bg-[var(--c-ok)] border-[var(--c-ok)] text-[var(--c-on-accent)]' : 'border-[var(--c-line)]'}`}
                  >
                    {f.tarea.completada && <Check className="w-3 h-3" />}
                  </button>
                  <button type="button" onClick={() => onEditar(f.tarea)} className={`min-w-0 text-left text-xs truncate hover:text-[var(--c-accent)] ${f.tarea.completada ? 'line-through text-[var(--c-muted)]' : 'text-[var(--c-text-2)]'}`} title={f.tarea.titulo}>
                    {f.tarea.titulo}
                  </button>
                </div>
              ),
            )}
          </div>

          {/* Línea de tiempo */}
          <div className="relative" style={{ width: ancho }}>
            <div style={{ height: ALTO_CABECERA }} className="relative border-b border-[var(--c-line)]">
              {meses.map((m) => (
                <div key={m.x} className="absolute top-0 h-5 px-2 text-[10px] font-mono uppercase tracking-wider text-[var(--c-muted)] border-l border-[var(--c-line)] truncate capitalize" style={{ left: m.x, width: m.ancho }}>
                  {m.etiqueta}
                </div>
              ))}
              {marcas.map((m) => (
                <div key={m.x} className={`absolute bottom-1 text-[10px] font-mono ${m.finde ? 'text-[var(--c-muted-2)]' : 'text-[var(--c-muted)]'}`} style={{ left: m.x + 2 }}>
                  {m.etiqueta}
                </div>
              ))}
            </div>

            {filas.map((f, i) => (
              <div key={f.id} style={{ top: ALTO_CABECERA + i * ALTO_FILA, height: ALTO_FILA }} className={`absolute inset-x-0 border-b border-[var(--c-line)] ${f.tipo === 'fase' ? 'bg-[var(--c-surface-2)]/60' : ''}`} />
            ))}

            {/* Hoy */}
            <div className="absolute w-px bg-[var(--c-accent)] z-[1]" style={{ left: x(hoy) + px / 2, top: ALTO_CABECERA, height: alto }} title={`Hoy, ${diaCorto(hoy)}`} />

            {/* Dependencias */}
            <svg className="absolute left-0 pointer-events-none" style={{ top: ALTO_CABECERA, width: ancho, height: alto }} aria-hidden>
              {dependencias.map((d) => {
                const a = indiceFila.get(d.depende_de_id);
                const b = indiceFila.get(d.tarea_id);
                if (a === undefined || b === undefined) return null;
                const fa = filas[a];
                const fb = filas[b];
                const x1 = x(fa.fin) + px;
                const y1 = a * ALTO_FILA + ALTO_FILA / 2;
                const x2 = x(fb.inicio);
                const y2 = b * ALTO_FILA + ALTO_FILA / 2;
                const medio = Math.max(x1 + 6, Math.min(x2 - 6, (x1 + x2) / 2));
                return <path key={`${d.tarea_id}-${d.depende_de_id}`} d={`M${x1},${y1} H${medio} V${y2} H${x2}`} fill="none" stroke="var(--c-muted)" strokeWidth={1} opacity={0.7} />;
              })}
            </svg>

            {/* Barras */}
            {filas.map((f, i) => {
              const top = ALTO_CABECERA + i * ALTO_FILA;
              const left = x(f.inicio);
              const w = Math.max((diasEntre(f.inicio, f.fin) + 1) * px, 8);
              if (f.tipo === 'fase') {
                const pct = f.total ? f.hechas / f.total : 0;
                return (
                  <div key={f.id} className="absolute z-[2] rounded-sm bg-[var(--c-muted)]/40" style={{ left, width: w, top: top + 12, height: 12 }} title={`${f.nombre}: ${diaCorto(f.inicio)} – ${diaCorto(f.fin)}`}>
                    <div className="h-full rounded-sm bg-[var(--c-muted)]" style={{ width: `${pct * 100}%` }} />
                  </div>
                );
              }
              const t = f.tarea;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => onEditar(t)}
                  className="absolute z-[2] rounded text-left overflow-hidden text-[10px] leading-none px-1.5 text-[var(--c-on-accent)] font-semibold hover:brightness-110 focus-visible:ring-2 ring-[var(--c-text)]"
                  style={{ left, width: w, top: top + 7, height: 22, background: color(t), opacity: t.completada ? 0.75 : 1 }}
                  title={`${t.titulo} · ${diaCorto(f.inicio)} – ${diaCorto(f.fin)} · ${nombreMiembro(t.responsable_id)}`}
                >
                  {w > 60 ? t.titulo : ''}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
