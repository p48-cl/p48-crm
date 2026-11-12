import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, CheckSquare, Pencil, ExternalLink, Square } from 'lucide-react';
import type { EstadoProyecto, Proyecto, ProyectoFase, Tarea } from '../../types/crm';
import { ChipSenal } from '../common/ChipSenal';
import { diaCorto, hoyIso } from './fechas';

const ESTADO: Record<EstadoProyecto, string> = { planificado: 'Planificado', en_curso: 'En curso', pausado: 'Pausado', finalizado: 'Finalizado' };
const TONO_ESTADO: Record<EstadoProyecto, 'ok' | 'warn' | 'neutro' | 'danger'> = {
  planificado: 'neutro',
  en_curso: 'ok',
  pausado: 'warn',
  finalizado: 'ok',
};

// Anillo de avance: verde completo, rojo si hay tareas atrasadas, acento en curso
export const Anillo: React.FC<{ pct: number; atrasado?: boolean; size?: number }> = ({ pct, atrasado = false, size = 34 }) => {
  const r = 12;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct));
  const color = atrasado ? 'var(--c-danger)' : p >= 100 ? 'var(--c-ok)' : 'var(--c-accent)';
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className="shrink-0" role="img" aria-label={`Avance ${Math.round(p)}%`}>
      <circle cx="16" cy="16" r={r} fill="none" stroke="var(--c-surface-3)" strokeWidth="4" />
      <circle
        cx="16"
        cy="16"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - p / 100)}
        transform="rotate(-90 16 16)"
      />
      <text x="16" y="19" textAnchor="middle" fontSize="8" fontFamily="monospace" fill="var(--c-text)">
        {Math.round(p)}
      </text>
    </svg>
  );
};

interface Props {
  proyectos: Proyecto[];
  fases: ProyectoFase[];
  tareas: Tarea[];
  clienteDe: (p: Proyecto) => string | undefined;
  responsableDe: (p: Proyecto) => string | undefined;
  nombreMiembro: (id?: string | null) => string;
  onAbrir: (id: string) => void;
  onEditarProyecto: (p: Proyecto) => void;
  onEditarTarea: (t: Tarea) => void;
  onToggleTarea: (t: Tarea) => void;
}

const celda = 'py-2 px-3 align-middle';

export const ProyectosArbol: React.FC<Props> = ({
  proyectos,
  fases,
  tareas,
  clienteDe,
  responsableDe,
  nombreMiembro,
  onAbrir,
  onEditarProyecto,
  onEditarTarea,
  onToggleTarea,
}) => {
  const hoy = hoyIso();
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());
  const [fasesAbiertas, setFasesAbiertas] = useState<Set<string>>(new Set());

  const alternar = (set: Set<string>, id: string, fijar: (s: Set<string>) => void) => {
    const nuevo = new Set(set);
    if (nuevo.has(id)) nuevo.delete(id);
    else nuevo.add(id);
    fijar(nuevo);
  };

  // Agrupa proyectos por cliente (internos aparte) y calcula avance por proyecto y por fase
  const grupos = useMemo(() => {
    const porCliente = new Map<string, { nombre: string; items: Proyecto[] }>();
    for (const p of proyectos) {
      const nombre = p.tipo === 'interno' ? 'Interno de la agencia' : clienteDe(p) ?? 'Sin cliente';
      const clave = p.tipo === 'interno' ? '__interno' : p.empresa_id ?? '__sin';
      if (!porCliente.has(clave)) porCliente.set(clave, { nombre, items: [] });
      porCliente.get(clave)!.items.push(p);
    }
    return [...porCliente.entries()]
      .map(([clave, g]) => ({ clave, nombre: g.nombre, items: g.items.sort((a, b) => a.nombre.localeCompare(b.nombre)) }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [proyectos, clienteDe]);

  const resumen = (tts: Tarea[]) => {
    const hechas = tts.filter((t) => t.completada).length;
    const atrasadas = tts.filter((t) => !t.completada && t.fecha_vencimiento < hoy).length;
    return { total: tts.length, hechas, atrasadas, pct: tts.length ? (hechas / tts.length) * 100 : 0 };
  };

  const filaAtributos = 'text-xs';

  if (proyectos.length === 0) return null;

  return (
    <div className="bg-[var(--c-surface)] border border-[var(--c-line)] rounded-lg overflow-hidden">
      <div className="flex items-center justify-end px-3 py-2 border-b border-[var(--c-line)]">
        <button
          type="button"
          onClick={() => {
            const todos = new Set(proyectos.map((p) => p.id));
            setAbiertos(abiertos.size === todos.size ? new Set() : todos);
          }}
          className="text-[11px] font-mono text-[var(--c-muted)] hover:text-[var(--c-text)]"
        >
          {abiertos.size === proyectos.length ? 'Contraer todo' : 'Expandir todo'}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[var(--c-surface-2)] border-b border-[var(--c-line)] text-[var(--c-muted)] uppercase font-mono text-[11px]">
            <tr>
              <th className="py-2.5 px-3 font-medium">Cliente · Proyecto</th>
              <th className="py-2.5 px-3 font-medium">Estado</th>
              <th className="py-2.5 px-3 font-medium">Fase actual</th>
              <th className="py-2.5 px-3 font-medium text-center">Avance</th>
              <th className="py-2.5 px-3 font-medium">Responsable</th>
              <th className="py-2.5 px-3 font-medium">Fechas</th>
              <th className="py-2.5 px-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--c-line)]">
            {grupos.map((g) => (
              <React.Fragment key={g.clave}>
                <tr className="bg-[var(--c-surface-2)]/60">
                  <td colSpan={7} className="py-1.5 px-3 font-mono text-[11px] uppercase text-[var(--c-text-2)] tracking-wide">
                    {g.nombre}{' '}
                    <span className="text-[var(--c-muted)] normal-case">
                      · {g.items.length} proyecto{g.items.length === 1 ? '' : 's'}
                    </span>
                    {g.items.some((p) => p.estado === 'en_curso') && (
                      <span className="ml-2 text-[var(--c-ok)] normal-case">
                        · {g.items.filter((p) => p.estado === 'en_curso').length} en curso
                      </span>
                    )}
                  </td>
                </tr>
                {g.items.map((p) => {
                  const tts = tareas.filter((t) => t.proyecto_id === p.id);
                  const r = resumen(tts);
                  const abierto = abiertos.has(p.id);
                  const fasesReales = fases.filter((f) => f.proyecto_id === p.id).sort((a, b) => a.orden - b.orden);
                  const hayHuerfanas = tts.some((t) => !t.fase_id);
                  // Tareas sin fase se agrupan en una fase virtual para que sigan siendo navegables
                  const fasesP = hayHuerfanas ? [...fasesReales, { id: '__sin_fase', proyecto_id: p.id, nombre: 'Sin fase', orden: 9999, visible_cliente: false, fecha_inicio: null, fecha_fin: null } as ProyectoFase] : fasesReales;
                  const vencido = !!p.fecha_fin && p.fecha_fin < hoy && p.estado !== 'finalizado';
                  const fase = fasesP.find((f) => f.fecha_inicio && f.fecha_fin && f.fecha_inicio <= hoy && f.fecha_fin >= hoy) ?? fasesP.find((f) => !f.fecha_fin || f.fecha_fin >= hoy) ?? fasesP[fasesP.length - 1];
                  return (
                    <React.Fragment key={p.id}>
                      <tr className="hover:bg-[var(--c-surface-2)] transition-colors">
                        <td className={`${celda} ${filaAtributos}`}>
                          <button type="button" onClick={() => alternar(abiertos, p.id, setAbiertos)} className="inline-flex items-center gap-1.5 text-left font-semibold text-[var(--c-text)]">
                            {abierto ? <ChevronDown className="w-3.5 h-3.5 text-[var(--c-muted)]" /> : <ChevronRight className="w-3.5 h-3.5 text-[var(--c-muted)]" />}
                            <span className={vencido ? 'text-[var(--c-danger)]' : ''}>{p.nombre}</span>
                          </button>
                        </td>
                        <td className={celda}>
                          <span className="inline-flex flex-wrap items-center gap-1">
                            <ChipSenal tono={TONO_ESTADO[p.estado]}>{ESTADO[p.estado]}</ChipSenal>
                            {vencido && <ChipSenal tono="danger">Vencido</ChipSenal>}
                          </span>
                        </td>
                        <td className={`${celda} text-[var(--c-text-2)]`}>{fase?.nombre ?? <span className="text-[var(--c-muted-2)]">Sin fases</span>}</td>
                        <td className={`${celda}`}>
                          <div className="flex items-center justify-center gap-2">
                            <Anillo pct={r.pct} atrasado={r.atrasadas > 0} />
                            <div className="font-mono text-[11px] text-[var(--c-muted)] leading-tight">
                              <div>{r.hechas}/{r.total} tareas</div>
                              {r.atrasadas > 0 && <div className="text-[var(--c-danger)]">{r.atrasadas} atrasada{r.atrasadas > 1 ? 's' : ''}</div>}
                            </div>
                          </div>
                        </td>
                        <td className={`${celda} text-[var(--c-text-2)]`}>{responsableDe(p) ?? <span className="text-[var(--c-muted-2)]">Sin asignar</span>}</td>
                        <td className={`${celda} font-mono text-[11px] text-[var(--c-muted)] whitespace-nowrap`}>
                          {p.fecha_inicio ? diaCorto(p.fecha_inicio) : '—'} → {p.fecha_fin ? diaCorto(p.fecha_fin) : '—'}
                        </td>
                        <td className={`${celda} text-right whitespace-nowrap`}>
                          <button type="button" onClick={() => onEditarProyecto(p)} title="Editar proyecto" className="p-1.5 text-[var(--c-muted)] hover:text-[var(--c-accent)]"><Pencil className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={() => onAbrir(p.id)} title="Abrir proyecto" className="p-1.5 text-[var(--c-muted)] hover:text-[var(--c-accent)]"><ExternalLink className="w-3.5 h-3.5" /></button>
                        </td>
                      </tr>

                      {abierto && fasesP.map((f) => {
                        const tf = tts.filter((t) => (f.id === '__sin_fase' ? !t.fase_id : t.fase_id === f.id));
                        const rf = resumen(tf);
                        const claveFase = `${p.id}:${f.id}`;
                        const fasAbierta = fasesAbiertas.has(claveFase);
                        return (
                          <React.Fragment key={f.id}>
                            <tr className="bg-[var(--c-surface)]">
                              <td className={`${celda} pl-9 ${filaAtributos}`}>
                                <button type="button" onClick={() => alternar(fasesAbiertas, claveFase, setFasesAbiertas)} className="inline-flex items-center gap-1.5 text-[var(--c-text-2)] font-medium">
                                  {fasAbierta ? <ChevronDown className="w-3 h-3 text-[var(--c-muted)]" /> : <ChevronRight className="w-3 h-3 text-[var(--c-muted)]" />}
                                  Fase · {f.nombre}
                                </button>
                              </td>
                              <td className={celda} />
                              <td className={celda} />
                              <td className={celda}>
                                <div className="flex items-center justify-center gap-2 font-mono text-[11px] text-[var(--c-muted)]">
                                  <div className="h-1.5 w-20 rounded-full bg-[var(--c-surface-3)] overflow-hidden">
                                    <div className={`h-full ${rf.atrasadas > 0 ? 'bg-[var(--c-danger)]' : 'bg-[var(--c-accent)]'}`} style={{ width: `${rf.pct}%` }} />
                                  </div>
                                  <span>{rf.hechas}/{rf.total}</span>
                                </div>
                              </td>
                              <td className={celda} />
                              <td className={`${celda} font-mono text-[11px] text-[var(--c-muted)] whitespace-nowrap`}>
                                {f.fecha_inicio ? diaCorto(f.fecha_inicio) : '—'} → {f.fecha_fin ? diaCorto(f.fecha_fin) : '—'}
                              </td>
                              <td className={celda} />
                            </tr>

                            {fasAbierta && tf.map((t) => {
                              const atrasada = !t.completada && t.fecha_vencimiento < hoy;
                              return (
                                <tr key={t.id} onClick={() => onEditarTarea(t)} className="cursor-pointer hover:bg-[var(--c-surface-2)]">
                                  <td className={`${celda} pl-16`}>
                                    <span className="inline-flex items-center gap-2">
                                      <button type="button" onClick={(e) => { e.stopPropagation(); onToggleTarea(t); }} aria-label={t.completada ? 'Marcar pendiente' : 'Marcar completada'} className="text-[var(--c-muted)] hover:text-[var(--c-accent)]">
                                        {t.completada ? <CheckSquare className="w-3.5 h-3.5 text-[var(--c-accent)]" /> : <Square className="w-3.5 h-3.5" />}
                                      </button>
                                      <span className={`${t.completada ? 'line-through text-[var(--c-muted-2)]' : 'text-[var(--c-text)]'}`}>{t.titulo}</span>
                                    </span>
                                  </td>
                                  <td className={celda}>
                                    {atrasada && <ChipSenal tono="danger">Atrasada</ChipSenal>}
                                  </td>
                                  <td className={celda} />
                                  <td className={celda} />
                                  <td className={`${celda} text-[var(--c-text-2)]`}>{nombreMiembro(t.responsable_id)}</td>
                                  <td className={`${celda} font-mono text-[11px] whitespace-nowrap ${atrasada ? 'text-[var(--c-danger)]' : 'text-[var(--c-muted)]'}`}>
                                    {diaCorto(t.fecha_vencimiento)}
                                  </td>
                                  <td className={celda} />
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}

                    </React.Fragment>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
