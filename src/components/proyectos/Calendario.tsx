import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Empresa, Proyecto, ProyectoFase, Tarea } from '../../types/crm';
import { aFecha, aIso, diaCorto, hoyIso, mesLargo, sumarDias } from './fechas';

type Tipo = 'tarea' | 'proyecto' | 'renovacion';
interface Evento {
  id: string;
  fecha: string;
  tipo: Tipo;
  texto: string;
  detalle?: string;
  tono: 'accent' | 'ok' | 'danger' | 'warn' | 'neutro';
  proyectoId?: string | null;
}

interface Props {
  tareas: Tarea[];
  proyectos: Proyecto[];
  fases: ProyectoFase[];
  empresas: Empresa[];
  onAbrirProyecto: (id: string) => void;
  onEditarTarea: (t: Tarea) => void;
}

const TONO: Record<Evento['tono'], string> = {
  accent: 'bg-[var(--c-accent)]/15 text-[var(--c-text)] border-l-2 border-[var(--c-accent)]',
  ok: 'bg-[var(--c-ok)]/15 text-[var(--c-muted)] line-through border-l-2 border-[var(--c-ok)]',
  danger: 'bg-[var(--c-danger)]/15 text-[var(--c-text)] border-l-2 border-[var(--c-danger)]',
  warn: 'bg-[var(--c-warn)]/15 text-[var(--c-text)] border-l-2 border-[var(--c-warn)]',
  neutro: 'bg-[var(--c-surface-2)] text-[var(--c-text-2)] border-l-2 border-[var(--c-muted)]',
};
const NOMBRE_TIPO: Record<Tipo, string> = { tarea: 'Tareas', proyecto: 'Proyectos e hitos', renovacion: 'Renovaciones' };
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const lunesDe = (iso: string) => {
  const d = aFecha(iso);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return aIso(d);
};

export const Calendario: React.FC<Props> = ({ tareas, proyectos, fases, empresas, onAbrirProyecto, onEditarTarea }) => {
  const hoy = hoyIso();
  const [vista, setVista] = useState<'mes' | 'semana'>('mes');
  const [ancla, setAncla] = useState(hoy);
  const [seleccion, setSeleccion] = useState<string | null>(hoy);
  const [ver, setVer] = useState<Record<Tipo, boolean>>({ tarea: true, proyecto: true, renovacion: true });

  const nombreProyecto = useMemo(() => new Map(proyectos.map((p) => [p.id, p.nombre])), [proyectos]);

  const eventos = useMemo(() => {
    const out: Evento[] = [];
    for (const t of tareas) {
      const proy = t.proyecto_id ? nombreProyecto.get(t.proyecto_id) : undefined;
      out.push({
        id: `t-${t.id}`, fecha: t.fecha_vencimiento, tipo: 'tarea', texto: t.titulo, detalle: proy,
        tono: t.completada ? 'ok' : t.fecha_vencimiento < hoy ? 'danger' : 'accent', proyectoId: t.proyecto_id,
      });
    }
    for (const p of proyectos) {
      if (p.fecha_inicio) out.push({ id: `pi-${p.id}`, fecha: p.fecha_inicio, tipo: 'proyecto', texto: `Inicio: ${p.nombre}`, tono: 'neutro', proyectoId: p.id });
      if (p.fecha_fin) out.push({ id: `pf-${p.id}`, fecha: p.fecha_fin, tipo: 'proyecto', texto: `Entrega: ${p.nombre}`, tono: p.estado !== 'finalizado' && p.fecha_fin < hoy ? 'danger' : 'neutro', proyectoId: p.id });
    }
    for (const f of fases) {
      if (f.fecha_fin) out.push({ id: `fa-${f.id}`, fecha: f.fecha_fin, tipo: 'proyecto', texto: `Fin fase: ${f.nombre}`, detalle: nombreProyecto.get(f.proyecto_id), tono: 'neutro', proyectoId: f.proyecto_id });
    }
    for (const e of empresas) {
      if (e.estado === 'cliente' && !e.archivado && e.fecha_renovacion)
        out.push({ id: `r-${e.id}`, fecha: e.fecha_renovacion, tipo: 'renovacion', texto: `Renueva ${e.nombre}`, tono: 'warn' });
    }
    return out.filter((e) => ver[e.tipo]);
  }, [tareas, proyectos, fases, empresas, ver, hoy, nombreProyecto]);

  const porDia = useMemo(() => {
    const m = new Map<string, Evento[]>();
    for (const e of eventos) m.set(e.fecha, [...(m.get(e.fecha) ?? []), e]);
    return m;
  }, [eventos]);

  const dias = useMemo(() => {
    const base = aFecha(ancla);
    const inicio = vista === 'semana' ? lunesDe(ancla) : lunesDe(aIso(new Date(base.getFullYear(), base.getMonth(), 1)));
    const cantidad = vista === 'semana' ? 7 : 42;
    return Array.from({ length: cantidad }, (_, i) => sumarDias(inicio, i));
  }, [ancla, vista]);

  const mover = (dir: 1 | -1) => {
    const d = aFecha(ancla);
    if (vista === 'semana') d.setDate(d.getDate() + 7 * dir);
    else d.setMonth(d.getMonth() + dir, 1);
    setAncla(aIso(d));
  };

  const titulo = vista === 'mes' ? mesLargo(aFecha(ancla)) : `Semana del ${diaCorto(dias[0])} al ${diaCorto(dias[6])}`;
  const mesAncla = aFecha(ancla).getMonth();
  const delDia = seleccion ? porDia.get(seleccion) ?? [] : [];
  const abrir = (e: Evento) => {
    if (e.tipo === 'tarea') {
      const t = tareas.find((x) => `t-${x.id}` === e.id);
      if (t) onEditarTarea(t);
    } else if (e.proyectoId) onAbrirProyecto(e.proyectoId);
  };
  const maxPorDia = vista === 'semana' ? 12 : 3;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-1">
          <button type="button" onClick={() => mover(-1)} aria-label="Anterior" className="p-1.5 rounded border border-[var(--c-line)] text-[var(--c-text-2)] hover:bg-[var(--c-surface-2)]"><ChevronLeft className="w-4 h-4" /></button>
          <button type="button" onClick={() => { setAncla(hoy); setSeleccion(hoy); }} className="px-2.5 py-1.5 text-xs rounded border border-[var(--c-line)] text-[var(--c-text-2)] hover:bg-[var(--c-surface-2)]">Hoy</button>
          <button type="button" onClick={() => mover(1)} aria-label="Siguiente" className="p-1.5 rounded border border-[var(--c-line)] text-[var(--c-text-2)] hover:bg-[var(--c-surface-2)]"><ChevronRight className="w-4 h-4" /></button>
        </div>
        <h2 className="text-sm font-semibold text-[var(--c-text)] capitalize">{titulo}</h2>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          {(Object.keys(NOMBRE_TIPO) as Tipo[]).map((k) => (
            <label key={k} className="flex items-center gap-1.5 text-xs text-[var(--c-text-2)]">
              <input type="checkbox" checked={ver[k]} onChange={(e) => setVer({ ...ver, [k]: e.target.checked })} />
              {NOMBRE_TIPO[k]}
            </label>
          ))}
          <div role="group" aria-label="Vista" className="inline-flex gap-1 p-0.5 rounded-md bg-[var(--c-surface-2)]">
            {(['mes', 'semana'] as const).map((k) => (
              <button key={k} type="button" aria-pressed={vista === k} onClick={() => setVista(k)} className={`px-2.5 py-1 text-xs rounded capitalize ${vista === k ? 'bg-[var(--c-surface)] text-[var(--c-text)] font-semibold ring-1 ring-[var(--module)]' : 'text-[var(--c-muted)]'}`}>{k}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="surface overflow-hidden">
        <div className="grid grid-cols-7 border-b border-[var(--c-line)]">
          {DIAS.map((d) => <div key={d} className="px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider text-[var(--c-muted)]">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {dias.map((d) => {
            const evs = porDia.get(d) ?? [];
            const fuera = vista === 'mes' && aFecha(d).getMonth() !== mesAncla;
            const esHoy = d === hoy;
            return (
              <div
                key={d}
                role="button"
                tabIndex={0}
                onClick={() => setSeleccion(d)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSeleccion(d)}
                className={`border-b border-r border-[var(--c-line)] p-1 cursor-pointer min-w-0 ${vista === 'semana' ? 'min-h-[220px]' : 'min-h-[92px]'} ${fuera ? 'bg-[var(--c-surface-2)]/40' : ''} ${seleccion === d ? 'ring-1 ring-inset ring-[var(--module)]' : ''}`}
              >
                <span className={`inline-grid place-items-center w-5 h-5 text-[11px] rounded-full ${esHoy ? 'bg-[var(--c-accent)] text-[var(--c-on-accent)] font-bold' : fuera ? 'text-[var(--c-muted-2)]' : 'text-[var(--c-text-2)]'}`}>{aFecha(d).getDate()}</span>
                <div className="mt-0.5 space-y-0.5">
                  {evs.slice(0, maxPorDia).map((e) => (
                    <div key={e.id} className={`px-1 py-0.5 text-[10px] leading-tight rounded-sm truncate ${TONO[e.tono]}`} title={e.texto}>{e.texto}</div>
                  ))}
                  {evs.length > maxPorDia && <p className="text-[10px] text-[var(--c-muted)] px-1">+{evs.length - maxPorDia} más</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {seleccion && (
        <div className="surface p-4 space-y-2">
          <p className="text-sm font-semibold text-[var(--c-text)] capitalize">{aFecha(seleccion).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          {delDia.length === 0 ? (
            <p className="text-xs text-[var(--c-muted)]">Nada programado este día.</p>
          ) : (
            <ul className="space-y-1.5">
              {delDia.map((e) => (
                <li key={e.id}>
                  <button type="button" onClick={() => abrir(e)} disabled={e.tipo === 'renovacion'} className={`w-full text-left px-2 py-1.5 text-xs rounded-sm ${TONO[e.tono]} ${e.tipo === 'renovacion' ? 'cursor-default' : 'hover:brightness-110'}`}>
                    <span className="font-medium">{e.texto}</span>
                    {e.detalle && <span className="text-[var(--c-muted)]"> · {e.detalle}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
