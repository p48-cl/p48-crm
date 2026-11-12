import React, { useMemo, useState } from 'react';
import { Check, Pencil } from 'lucide-react';
import type { ProyectoFase, Tarea, TareaDependencia } from '../../types/crm';
import { aFecha, diasEntre, diaCorto, hoyIso, sumarDias } from './fechas';

const ALTO_FILA = 32;
const ALTO_CABECERA = 40;
const ANCHO_NOMBRES = 232;
const ESCALAS = { dia: { px: 28, etiqueta: 'Día' }, semana: { px: 12, etiqueta: 'Semana' }, mes: { px: 4, etiqueta: 'Mes' } } as const;
type Escala = keyof typeof ESCALAS;

type Fila =
  | { tipo: 'cliente'; id: string; nombre: string; inicio: string; fin: string; hechas: number; total: number }
  | { tipo: 'proyecto'; id: string; proyectoId: string; nombre: string; inicio: string; fin: string; hechas: number; total: number }
  | { tipo: 'fase'; id: string; nombre: string; inicio: string; fin: string; hechas: number; total: number }
  | { tipo: 'tarea'; id: string; tarea: Tarea; inicio: string; fin: string };

interface Props {
  tareas: Tarea[];
  fases: ProyectoFase[];
  dependencias: TareaDependencia[];
  nombreMiembro: (id?: string | null) => string;
  onToggle: (t: Tarea) => void;
  onEditar: (t: Tarea) => void;
  // Si hay varios proyectos, agrupa por proyecto (cada uno con sus fases)
  proyectos?: { id: string; nombre: string; cliente?: string }[];
  onEditarProyecto?: (proyectoId: string) => void;
}

const inicioDe = (t: Tarea) => t.fecha_inicio ?? t.fecha_vencimiento;

export const Gantt: React.FC<Props> = ({ tareas, fases, dependencias, nombreMiembro, onToggle, onEditar, proyectos, onEditarProyecto }) => {
  const [escala, setEscala] = useState<Escala>('semana');
  const px = ESCALAS[escala].px;
  const hoy = hoyIso();

  const filas = useMemo<Fila[]>(() => {
    const out: Fila[] = [];
    // Fases (o "Sin fase") de un conjunto de tareas, en orden
    const agregarGrupos = (tSub: Tarea[], fSub: ProyectoFase[], destino: Fila[], prefijo: string) => {
      const ordenadas = [...tSub].sort((a, b) => inicioDe(a).localeCompare(inicioDe(b)) || a.fecha_vencimiento.localeCompare(b.fecha_vencimiento));
      const grupos: { id: string; nombre: string; tareas: Tarea[] }[] = [...fSub]
        .sort((a, b) => a.orden - b.orden)
        .map((f) => ({ id: f.id, nombre: f.nombre, tareas: ordenadas.filter((t) => t.fase_id === f.id) }));
      const sueltas = ordenadas.filter((t) => !t.fase_id || !fSub.some((f) => f.id === t.fase_id));
      if (sueltas.length > 0) grupos.push({ id: `${prefijo}sin-fase`, nombre: 'Sin fase', tareas: sueltas });
      for (const g of grupos) {
        const fase = fSub.find((f) => f.id === g.id);
        const ini = g.tareas.length ? g.tareas.map(inicioDe).sort()[0] : fase?.fecha_inicio ?? hoy;
        const fin = g.tareas.length ? g.tareas.map((t) => t.fecha_vencimiento).sort().slice(-1)[0] : fase?.fecha_fin ?? ini;
        destino.push({ tipo: 'fase', id: g.id, nombre: g.nombre, inicio: ini, fin, hechas: g.tareas.filter((t) => t.completada).length, total: g.tareas.length });
        for (const t of g.tareas) destino.push({ tipo: 'tarea', id: t.id, tarea: t, inicio: inicioDe(t), fin: t.fecha_vencimiento });
      }
    };
    if (proyectos && proyectos.length > 1) {
      const clientes = [...new Set(proyectos.map((p) => p.cliente ?? ''))].sort((a, b) => a.localeCompare(b));
      const ordenados = clientes.flatMap((c) => proyectos.filter((p) => (p.cliente ?? '') === c));
      let clienteActual: string | null = null;
      for (const p of ordenados) {
        const tP = tareas.filter((t) => t.proyecto_id === p.id);
        if (tP.length === 0) continue;
        if (p.cliente && p.cliente !== clienteActual) {
          clienteActual = p.cliente;
          const tC = tareas.filter((t) => proyectos.some((q) => q.cliente === p.cliente && q.id === t.proyecto_id));
          out.push({ tipo: 'cliente', id: `cli-${p.cliente}`, nombre: p.cliente, inicio: tC.map(inicioDe).sort()[0], fin: tC.map((t) => t.fecha_vencimiento).sort().slice(-1)[0], hechas: tC.filter((t) => t.completada).length, total: tC.length });
        }
        const bloque: Fila[] = [];
        agregarGrupos(tP, fases.filter((f) => f.proyecto_id === p.id), bloque, `${p.id}-`);
        const ini = tP.map(inicioDe).sort()[0];
        const fin = tP.map((t) => t.fecha_vencimiento).sort().slice(-1)[0];
        out.push({ tipo: 'proyecto', id: `proy-${p.id}`, proyectoId: p.id, nombre: p.nombre, inicio: ini, fin, hechas: tP.filter((t) => t.completada).length, total: tP.length });
        out.push(...bloque);
      }
    } else {
      agregarGrupos(tareas, fases, out, '');
    }
    return out;
  }, [tareas, fases, hoy, proyectos]);

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

  // Marcas de la cabecera: meses (con su posición) y etiquetas de día o semana
  const meses = useMemo(() => {
    const out: { etiqueta: string; x: number; ancho: number }[] = [];
    for (let i = 0; i < dias; ) {
      const d = aFecha(sumarDias(desde, i));
      const restantes = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() - d.getDate() + 1;
      const largo = Math.min(restantes, dias - i);
      out.push({ etiqueta: d.toLocaleDateString('es-CL', { month: 'short', year: 'numeric' }), x: i * px, ancho: largo * px });
      i += largo;
    }
    return out;
  }, [desde, dias, px]);

  const marcas = useMemo(() => {
    if (escala === 'mes') return [];
    const out: { x: number; etiqueta: string }[] = [];
    for (let i = 0; i < dias; i++) {
      const d = aFecha(sumarDias(desde, i));
      if (escala === 'dia') out.push({ x: i * px, etiqueta: String(d.getDate()) });
      else if (d.getDay() === 1) out.push({ x: i * px, etiqueta: String(d.getDate()) });
    }
    return out;
  }, [desde, dias, px, escala]);

  if (tareas.length === 0 && fases.length === 0) {
    return <div className="surface p-6 text-sm text-[var(--c-muted)]">Aún no hay fases ni tareas. Agrega la primera fase o crea el proyecto desde una plantilla.</div>;
  }

  const color = (t: Tarea) => (t.completada ? 'var(--c-ok)' : t.fecha_vencimiento < hoy ? 'var(--c-danger)' : 'var(--c-accent)');
  const alto = filas.length * ALTO_FILA;
  const conClientes = filas.some((f) => f.tipo === 'cliente');

  return (
    <div className="surface overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[var(--c-line)]">
        <div className="flex flex-wrap gap-3 text-[11px] text-[var(--c-muted)]">
          <span className="inline-flex items-center gap-1.5"><i className="w-2 h-2 rounded-sm bg-[var(--c-accent)]" />En curso</span>
          <span className="inline-flex items-center gap-1.5"><i className="w-2 h-2 rounded-sm bg-[var(--c-ok)]" />Hecha</span>
          <span className="inline-flex items-center gap-1.5"><i className="w-2 h-2 rounded-sm bg-[var(--c-danger)]" />Atrasada</span>
          <span className="inline-flex items-center gap-1.5"><i className="w-px h-3 bg-[var(--c-accent)]" />Hoy</span>
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
            <div style={{ height: ALTO_CABECERA }} className="border-b border-[var(--c-line)] px-3 flex items-end pb-1.5 text-[11px] text-[var(--c-muted)]">
              Cliente · proyecto · fase · tarea
            </div>
            {filas.map((f) => {
              if (f.tipo === 'cliente') {
                return (
                  <div key={f.id} style={{ height: ALTO_FILA }} className="px-3 flex items-center justify-between gap-2 bg-[var(--c-surface-3)] border-b border-[var(--c-line)]">
                    <span className="text-xs font-bold text-[var(--c-text)] truncate">{f.nombre}</span>
                    <span className="text-[10px] font-mono text-[var(--c-muted)] shrink-0">{f.hechas}/{f.total}</span>
                  </div>
                );
              }
              if (f.tipo === 'proyecto') {
                return (
                  <div key={f.id} style={{ height: ALTO_FILA }} className={`${conClientes ? 'pl-5' : 'px-3'} pr-3 flex items-center justify-between gap-2 bg-[var(--c-surface-2)] border-b border-[var(--c-line)]`}>
                    <span className="text-xs font-semibold text-[var(--c-text)] truncate">{f.nombre}</span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-mono text-[var(--c-muted)]">{f.hechas}/{f.total}</span>
                      {onEditarProyecto && (
                        <button type="button" onClick={() => onEditarProyecto(f.proyectoId)} aria-label={`Editar ${f.nombre}`} title="Editar proyecto" className="text-[var(--c-muted)] hover:text-[var(--c-accent)]">
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  </div>
                );
              }
              if (f.tipo === 'fase') {
                return (
                  <div key={f.id} style={{ height: ALTO_FILA }} className={`${conClientes ? 'pl-8' : 'pl-5'} pr-3 flex items-center justify-between gap-2 border-b border-[var(--c-line)]/60`}>
                    <span className="text-[11px] font-medium text-[var(--c-muted)] truncate">{f.nombre}</span>
                    <span className="text-[10px] font-mono text-[var(--c-muted)] shrink-0">{f.hechas}/{f.total}</span>
                  </div>
                );
              }
              return (
                <div key={f.id} style={{ height: ALTO_FILA }} className={`${conClientes ? 'pl-11' : 'pl-8'} pr-2 flex items-center gap-2 border-b border-[var(--c-line)]/60`}>
                  <button
                    type="button"
                    onClick={() => onToggle(f.tarea)}
                    aria-label={f.tarea.completada ? 'Marcar pendiente' : 'Marcar hecha'}
                    className={`w-3.5 h-3.5 rounded-sm border grid place-items-center shrink-0 ${f.tarea.completada ? 'bg-[var(--c-ok)] border-[var(--c-ok)] text-[var(--c-on-accent)]' : 'border-[var(--c-line)]'}`}
                  >
                    {f.tarea.completada && <Check className="w-2.5 h-2.5" />}
                  </button>
                  <button type="button" onClick={() => onEditar(f.tarea)} className={`min-w-0 text-left text-xs truncate hover:text-[var(--c-accent)] ${f.tarea.completada ? 'line-through text-[var(--c-muted)]' : 'text-[var(--c-text-2)]'}`} title={f.tarea.titulo}>
                    {f.tarea.titulo}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Línea de tiempo */}
          <div className="relative" style={{ width: ancho }}>
            <div style={{ height: ALTO_CABECERA }} className="relative border-b border-[var(--c-line)]">
              {meses.map((m) => (
                <div key={m.x} className="absolute top-0 h-5 px-2 text-[11px] text-[var(--c-text-2)] truncate capitalize" style={{ left: m.x, width: m.ancho }}>
                  {m.etiqueta}
                </div>
              ))}
              {marcas.map((m) => (
                <div key={m.x} className="absolute bottom-1.5 text-[10px] font-mono text-[var(--c-muted)]" style={{ left: m.x + 2 }}>
                  {m.etiqueta}
                </div>
              ))}
            </div>

            {/* Filas y separadores */}
            {filas.map((f, i) => (
              <div
                key={f.id}
                style={{ top: ALTO_CABECERA + i * ALTO_FILA, height: ALTO_FILA }}
                className={`absolute inset-x-0 border-b border-[var(--c-line)]/60 ${f.tipo === 'cliente' ? 'bg-[var(--c-surface-3)]' : f.tipo === 'proyecto' ? 'bg-[var(--c-surface-2)]' : ''}`}
              />
            ))}

            {/* Cambio de mes */}
            {meses.slice(1).map((m) => (
              <div key={`mes-${m.x}`} className="absolute top-0 bottom-0 w-px bg-[var(--c-line)]/70" style={{ left: m.x, top: ALTO_CABECERA }} />
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
                return <path key={`${d.tarea_id}-${d.depende_de_id}`} d={`M${x1},${y1} H${medio} V${y2} H${x2}`} fill="none" stroke="var(--c-muted)" strokeWidth={1} opacity={0.4} />;
              })}
            </svg>

            {/* Barras */}
            {filas.map((f, i) => {
              const top = ALTO_CABECERA + i * ALTO_FILA;
              const left = x(f.inicio);
              const w = Math.max((diasEntre(f.inicio, f.fin) + 1) * px, 6);
              if (f.tipo === 'cliente' || f.tipo === 'proyecto' || f.tipo === 'fase') {
                const pct = f.total ? f.hechas / f.total : 0;
                const alt = f.tipo === 'cliente' ? 8 : f.tipo === 'proyecto' ? 6 : 5;
                return (
                  <div
                    key={f.id}
                    className="absolute z-[2] rounded-full bg-[var(--c-muted)]/25 overflow-hidden"
                    style={{ left, width: w, top: top + (ALTO_FILA - alt) / 2, height: alt }}
                    title={`${f.nombre}: ${diaCorto(f.inicio)} – ${diaCorto(f.fin)} · ${f.hechas}/${f.total}`}
                  >
                    <div className="h-full bg-[var(--c-muted)]" style={{ width: `${pct * 100}%` }} />
                  </div>
                );
              }
              const t = f.tarea;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => onEditar(t)}
                  className="absolute z-[2] rounded-sm text-left overflow-hidden text-[10px] leading-none px-1.5 text-[var(--c-on-accent)] font-semibold hover:brightness-110 focus-visible:ring-2 ring-[var(--c-text)]"
                  style={{ left, width: w, top: top + (ALTO_FILA - 16) / 2, height: 16, background: color(t), opacity: t.completada ? 0.6 : 0.9 }}
                  title={`${t.titulo} · ${diaCorto(f.inicio)} – ${diaCorto(f.fin)} · ${nombreMiembro(t.responsable_id)}`}
                >
                  {w > 120 ? t.titulo : ''}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
