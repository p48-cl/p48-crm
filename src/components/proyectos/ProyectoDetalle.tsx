import React, { useMemo, useState } from 'react';
import { ArrowLeft, Lock, Plus, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { parseSupabaseError } from '../../lib/errorHandler';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMContext';
import { ChipSenal } from '../common/ChipSenal';
import type { EstadoProyecto, Proyecto, ProyectoFase, ProyectoMiembro, Tarea, TareaDependencia } from '../../types/crm';
import { Gantt } from './Gantt';
import { TareaProyectoModal } from './TareaProyectoModal';
import { diaCorto, hoyIso } from './fechas';

const ESTADOS: { v: EstadoProyecto; t: string }[] = [
  { v: 'planificado', t: 'Planificado' },
  { v: 'en_curso', t: 'En curso' },
  { v: 'pausado', t: 'Pausado' },
  { v: 'finalizado', t: 'Finalizado' },
];
const campo = 'px-2.5 py-1.5 text-xs bg-[var(--c-field)] border border-[var(--c-line)] rounded text-[var(--c-text)]';

interface Props {
  proyecto: Proyecto;
  fases: ProyectoFase[];
  miembrosProyecto: ProyectoMiembro[];
  dependencias: TareaDependencia[];
  onVolver: () => void;
  onCambio: () => Promise<void>;
}

export const ProyectoDetalle: React.FC<Props> = ({ proyecto, fases, miembrosProyecto, dependencias, onVolver, onCambio }) => {
  const { currentUser, isAdmin } = useAuth();
  const { tareas, empresas, miembros, toggleTareaCompletada } = useCRM();
  const [modal, setModal] = useState<{ tarea?: Tarea; fase?: string } | null>(null);
  const [nuevaFase, setNuevaFase] = useState('');
  const [agregando, setAgregando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const puedeGestionar = isAdmin || proyecto.responsable_id === currentUser?.id;
  const tareasProyecto = useMemo(() => tareas.filter((t) => t.proyecto_id === proyecto.id), [tareas, proyecto.id]);
  const fasesProyecto = useMemo(() => fases.filter((f) => f.proyecto_id === proyecto.id), [fases, proyecto.id]);
  const depsProyecto = useMemo(() => {
    const ids = new Set(tareasProyecto.map((t) => t.id));
    return dependencias.filter((d) => ids.has(d.tarea_id));
  }, [dependencias, tareasProyecto]);
  const cliente = proyecto.empresa_id ? empresas.find((e) => e.id === proyecto.empresa_id) : undefined;
  const nombreMiembro = (id?: string | null) => miembros.find((m) => m.id === id)?.nombre ?? 'Sin asignar';

  const idsEquipo = useMemo(() => {
    const ids = new Set(miembrosProyecto.filter((m) => m.proyecto_id === proyecto.id).map((m) => m.miembro_id));
    if (proyecto.responsable_id) ids.add(proyecto.responsable_id);
    return [...ids];
  }, [miembrosProyecto, proyecto]);
  const equipo = idsEquipo.map((id) => miembros.find((m) => m.id === id)).filter((m): m is NonNullable<typeof m> => Boolean(m));
  const disponibles = miembros.filter((m) => m.activo && !idsEquipo.includes(m.id));
  // Quienes pueden recibir tareas: el equipo (los admin ven todo, pero se asignan solo a quien trabaja en el proyecto)
  const asignables = equipo.filter((m) => m.activo);

  const hechas = tareasProyecto.filter((t) => t.completada).length;
  const atrasadas = tareasProyecto.filter((t) => !t.completada && t.fecha_vencimiento < hoyIso()).length;
  const pct = tareasProyecto.length ? Math.round((hechas / tareasProyecto.length) * 100) : 0;

  const ejecutar = async (fn: () => PromiseLike<{ error: unknown }>) => {
    setError(null);
    const { error: e } = await fn();
    if (e) setError(parseSupabaseError(e));
    await onCambio();
  };

  const cambiarEstado = (estado: EstadoProyecto) => ejecutar(() => supabase!.from('proyectos').update({ estado }).eq('id', proyecto.id));
  const cambiarVisible = (visible: boolean) => ejecutar(() => supabase!.from('proyectos').update({ visible_cliente: visible }).eq('id', proyecto.id));
  const agregarMiembro = (id: string) => ejecutar(() => supabase!.from('proyecto_miembros').insert({ proyecto_id: proyecto.id, miembro_id: id, rol: 'colaborador' }));
  const quitarMiembro = (id: string) => ejecutar(() => supabase!.from('proyecto_miembros').delete().eq('proyecto_id', proyecto.id).eq('miembro_id', id));
  const crearFase = async () => {
    if (!nuevaFase.trim()) return;
    await ejecutar(() => supabase!.from('proyecto_fases').insert({ proyecto_id: proyecto.id, nombre: nuevaFase.trim(), orden: fasesProyecto.length }));
    setNuevaFase('');
    setAgregando(false);
  };
  const borrarFase = async (f: ProyectoFase) => {
    if (!window.confirm(`¿Eliminar la fase «${f.nombre}»? Sus tareas quedan en el proyecto, sin fase.`)) return;
    await ejecutar(() => supabase!.from('proyecto_fases').delete().eq('id', f.id));
  };
  const archivar = async () => {
    if (!window.confirm('¿Archivar este proyecto? Deja de verse en la lista; sus tareas se conservan.')) return;
    await ejecutar(() => supabase!.from('proyectos').update({ archivado: true }).eq('id', proyecto.id));
    onVolver();
  };

  return (
    <div className="space-y-4">
      <button onClick={onVolver} className="inline-flex items-center gap-1.5 text-xs text-[var(--c-muted)] hover:text-[var(--c-text)]"><ArrowLeft className="w-3.5 h-3.5" />Proyectos</button>

      <div className="surface p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--c-text)]">{proyecto.nombre}</h1>
              <ChipSenal tono="neutro">{proyecto.tipo === 'interno' ? 'Interno' : cliente?.nombre ?? 'Cliente'}</ChipSenal>
              {atrasadas > 0 && <ChipSenal tono="danger">{atrasadas} atrasada{atrasadas > 1 ? 's' : ''}</ChipSenal>}
            </div>
            {proyecto.descripcion && <p className="text-xs text-[var(--c-muted)] mt-1 max-w-2xl">{proyecto.descripcion}</p>}
            <p className="text-[11px] font-mono text-[var(--c-muted)] mt-1">
              {proyecto.fecha_inicio ? diaCorto(proyecto.fecha_inicio) : 'Sin inicio'} → {proyecto.fecha_fin ? diaCorto(proyecto.fecha_fin) : 'Sin entrega'} · {hechas}/{tareasProyecto.length} tareas
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select className={campo} value={proyecto.estado} onChange={(e) => cambiarEstado(e.target.value as EstadoProyecto)} aria-label="Estado">
              {ESTADOS.map((e) => <option key={e.v} value={e.v}>{e.t}</option>)}
            </select>
            {puedeGestionar && <button onClick={archivar} className="px-2.5 py-1.5 text-xs rounded border border-[var(--c-line)] text-[var(--c-muted)] hover:text-[var(--c-text)]">Archivar</button>}
          </div>
        </div>

        <div className="h-1.5 rounded-full bg-[var(--c-surface-3)] overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Avance">
          <div className="h-full bg-[var(--c-ok)]" style={{ width: `${pct}%` }} />
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--c-muted)] mr-1 inline-flex items-center gap-1"><Lock className="w-3 h-3" />Acceso</span>
            {equipo.map((m) => (
              <span key={m.id} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded border border-[var(--c-line)] text-[var(--c-text-2)]">
                {m.nombre}{m.id === proyecto.responsable_id && <em className="not-italic text-[10px] text-[var(--c-accent)]">resp.</em>}
                {puedeGestionar && m.id !== proyecto.responsable_id && <button onClick={() => quitarMiembro(m.id)} aria-label={`Quitar a ${m.nombre}`} className="text-[var(--c-muted)] hover:text-[var(--c-danger)]"><X className="w-3 h-3" /></button>}
              </span>
            ))}
            {puedeGestionar && disponibles.length > 0 && (
              <select className={campo} value="" onChange={(e) => e.target.value && agregarMiembro(e.target.value)} aria-label="Dar acceso a">
                <option value="">+ Dar acceso…</option>
                {disponibles.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
            )}
          </div>
          {proyecto.tipo === 'cliente' && puedeGestionar && (
            <label className="flex items-center gap-1.5 text-xs text-[var(--c-text-2)]">
              <input type="checkbox" checked={proyecto.visible_cliente} onChange={(e) => cambiarVisible(e.target.checked)} />
              Visible en el portal del cliente
            </label>
          )}
        </div>
        <p className="text-[11px] text-[var(--c-muted)]">Los admin ven todos los proyectos. Las tareas de este proyecto solo las ven quienes tienen acceso.</p>
      </div>

      {error && <p className="text-xs text-[var(--c-danger)] border border-[var(--c-danger)]/40 rounded p-2">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setModal({})} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-[var(--c-accent)] text-[var(--c-on-accent)]"><Plus className="w-3.5 h-3.5" />Tarea</button>
        {agregando ? (
          <span className="inline-flex items-center gap-1">
            <input autoFocus className={campo} value={nuevaFase} onChange={(e) => setNuevaFase(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') crearFase(); if (e.key === 'Escape') setAgregando(false); }} placeholder="Nombre de la fase" aria-label="Nombre de la fase" />
            <button onClick={crearFase} className="px-2.5 py-1.5 text-xs rounded border border-[var(--c-line)] text-[var(--c-text)]">Agregar</button>
          </span>
        ) : (
          <button onClick={() => setAgregando(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-[var(--c-line)] text-[var(--c-text-2)] hover:bg-[var(--c-surface-2)]"><Plus className="w-3.5 h-3.5" />Fase</button>
        )}
        {fasesProyecto.length > 0 && puedeGestionar && (
          <div className="flex flex-wrap gap-1 ml-auto">
            {fasesProyecto.map((f) => (
              <span key={f.id} className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded bg-[var(--c-surface-2)] text-[var(--c-text-2)]">
                {f.nombre}
                <button onClick={() => borrarFase(f)} aria-label={`Eliminar fase ${f.nombre}`} className="text-[var(--c-muted)] hover:text-[var(--c-danger)]"><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
        )}
      </div>

      <Gantt
        tareas={tareasProyecto}
        fases={fasesProyecto}
        dependencias={depsProyecto}
        nombreMiembro={nombreMiembro}
        onToggle={(t) => toggleTareaCompletada(t.id, t.completada)}
        onEditar={(t) => setModal({ tarea: t })}
      />

      {modal && (
        <TareaProyectoModal
          proyecto={proyecto}
          fases={fasesProyecto}
          tareasProyecto={tareasProyecto}
          dependencias={depsProyecto}
          miembros={asignables}
          tarea={modal.tarea}
          faseInicial={modal.fase}
          onCerrar={() => setModal(null)}
          onGuardado={async () => {
            setModal(null);
            await onCambio();
          }}
        />
      )}
    </div>
  );
};
