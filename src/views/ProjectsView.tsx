import React, { useMemo, useState } from 'react';
import { CalendarDays, FolderKanban, Plus, GanttChart, Pencil } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCRM } from '../context/CRMContext';
import { ChipSenal } from '../components/common/ChipSenal';
import { Kpi } from '../components/dashboard/ui';
import { metricasProyectos, faseActual } from '../components/dashboard/metricas';
import { Calendario } from '../components/proyectos/Calendario';
import { EditarProyectoModal } from '../components/proyectos/EditarProyectoModal';
import { Gantt } from '../components/proyectos/Gantt';
import { NuevoProyectoModal } from '../components/proyectos/NuevoProyectoModal';
import { ProyectoDetalle } from '../components/proyectos/ProyectoDetalle';
import { useProyectos } from '../components/proyectos/useProyectos';
import { diaCorto, hoyIso } from '../components/proyectos/fechas';
import type { EstadoProyecto, Proyecto, Tarea } from '../types/crm';

const ESTADO: Record<EstadoProyecto, string> = { planificado: 'Planificado', en_curso: 'En curso', pausado: 'Pausado', finalizado: 'Finalizado' };
const select = 'px-2.5 py-1.5 text-xs bg-[var(--c-surface)] border border-[var(--c-line)] rounded text-[var(--c-text)]';

type Pestana = 'gantt' | 'proyectos' | 'calendario';

interface Props {
  onEditTask: (t: Tarea) => void;
  /** 'agencia': solo proyectos internos de la agencia (sin selector de tipo). */
  ambito?: 'agencia' | 'clientes';
}

export const ProjectsView: React.FC<Props> = ({ onEditTask, ambito }) => {
  const { isAdmin } = useAuth();
  const { tareas, empresasTodas: empresas, miembros, refetchTodo, toggleTareaCompletada } = useCRM();
  const { proyectos, fases, miembrosProyecto, dependencias, cargando, error, recargar } = useProyectos();
  const [pestana, setPestana] = useState<Pestana>('gantt');
  const [proyGantt, setProyGantt] = useState<string>('todos');
  const [abierto, setAbierto] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState(false);
  const [editando, setEditando] = useState<Proyecto | null>(null);
  const [tipo, setTipo] = useState<'todos' | 'interno' | 'cliente'>(ambito === 'agencia' ? 'interno' : ambito === 'clientes' ? 'cliente' : 'todos');
  const [estado, setEstado] = useState<'activos' | EstadoProyecto | 'todos'>('activos');
  const hoy = hoyIso();

  const cambio = async () => {
    await Promise.all([recargar(), refetchTodo()]);
  };

  const visibles = useMemo(
    () => proyectos.filter((p) => (tipo === 'todos' || (p.tipo ?? 'cliente') === tipo) && (estado === 'todos' ? true : estado === 'activos' ? p.estado !== 'finalizado' : p.estado === estado)),
    [proyectos, tipo, estado],
  );

  const indicadores = useMemo(() => {
    const idsVisibles = new Set(visibles.map((p) => p.id));
    const tareasVis = tareas.filter((t) => !!t.proyecto_id && idsVisibles.has(t.proyecto_id));
    const met = metricasProyectos(visibles, tareas);
    const avance = met.activos.length ? Math.round(met.activos.reduce((s, f) => s + f.avance, 0) / met.activos.length) : 0;
    return {
      activos: met.activos.length,
      enCurso: visibles.filter((p) => p.estado === 'en_curso').length,
      vencidos: met.vencidos,
      conTareasAtrasadas: met.conTareasAtrasadas,
      atrasadas: tareasVis.filter((t) => !t.completada && t.fecha_vencimiento < hoy).length,
      hoy: tareasVis.filter((t) => !t.completada && t.fecha_vencimiento === hoy).length,
      avance,
    };
  }, [visibles, tareas, hoy]);

  const lista = useMemo(
    () =>
      visibles.map((p) => {
        const ts = tareas.filter((t) => t.proyecto_id === p.id);
        const fasesP = fases.filter((f) => f.proyecto_id === p.id);
        return {
          p,
          fase: fasesP.length ? faseActual(fasesP)?.nombre : undefined,
          total: ts.length,
          hechas: ts.filter((t) => t.completada).length,
          atrasadas: ts.filter((t) => !t.completada && t.fecha_vencimiento < hoy).length,
          cliente: p.empresa_id ? empresas.find((e) => e.id === p.empresa_id)?.nombre : undefined,
          responsable: miembros.find((m) => m.id === p.responsable_id)?.nombre,
        };
      }),
    [visibles, tareas, fases, empresas, miembros, hoy],
  );

  const seleccionado = abierto ? proyectos.find((p) => p.id === abierto) : undefined;

  const pestanas: [Pestana, string, typeof GanttChart][] = [
    ['gantt', 'Gantt', GanttChart],
    ['proyectos', 'Proyectos', FolderKanban],
    ['calendario', 'Calendario', CalendarDays],
  ];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
      {seleccionado ? (
        <ProyectoDetalle proyecto={seleccionado} fases={fases} miembrosProyecto={miembrosProyecto} dependencias={dependencias} onVolver={() => setAbierto(null)} onCambio={cambio} />
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold font-sans text-[var(--c-text)]">Proyectos</h1>
              <p className="text-xs text-[var(--c-muted)] mt-0.5">
                Proyectos internos y de clientes, con Gantt y calendario. {isAdmin ? 'Como admin ves todos.' : 'Ves solo los proyectos a los que tienes acceso.'}
              </p>
            </div>
            <button onClick={() => setNuevo(true)} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded bg-[var(--c-accent)] text-[var(--c-on-accent)]"><Plus className="w-3.5 h-3.5" />Nuevo proyecto</button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-6 gap-2">
            <Kpi etiqueta="Activos" valor={indicadores.activos} nota={`${indicadores.enCurso} en curso`} />
            <Kpi etiqueta="Proyectos vencidos" valor={indicadores.vencidos} tono={indicadores.vencidos > 0 ? 'peligro' : 'normal'} nota="fecha de término pasada sin finalizar" />
            <Kpi etiqueta="Con tareas atrasadas" valor={indicadores.conTareasAtrasadas} tono={indicadores.conTareasAtrasadas > 0 ? 'aviso' : 'normal'} nota="al menos una tarea vencida" />
            <Kpi etiqueta="Tareas atrasadas" valor={indicadores.atrasadas} tono={indicadores.atrasadas > 0 ? 'peligro' : 'normal'} />
            <Kpi etiqueta="Vencen hoy" valor={indicadores.hoy} tono={indicadores.hoy > 0 ? 'aviso' : 'normal'} />
            <Kpi etiqueta="Avance promedio" valor={`${indicadores.avance}%`} progreso={indicadores.avance} />
            <Kpi etiqueta="Visibles" valor={visibles.length} nota={tipo === 'todos' ? 'internos y clientes' : tipo === 'interno' ? 'internos' : 'de clientes'} />
          </div>

          <div role="tablist" aria-label="Vista" className="inline-flex gap-1 p-0.5 rounded-md bg-[var(--c-surface-2)]">
            {pestanas.map(([k, t, Icono]) => (
              <button key={k} role="tab" aria-selected={pestana === k} onClick={() => setPestana(k)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded ${pestana === k ? 'bg-[var(--c-surface)] text-[var(--c-text)] font-semibold ring-1 ring-[var(--module)]' : 'text-[var(--c-muted)]'}`}>
                <Icono className="w-3.5 h-3.5" />{t}
              </button>
            ))}
          </div>

          {error && <p className="text-xs text-[var(--c-danger)] border border-[var(--c-danger)]/40 rounded p-2">{error}</p>}

          {pestana === 'gantt' ? (() => {
            const todos = proyGantt === 'todos' || !visibles.some((p) => p.id === proyGantt);
            const idG = todos ? '' : proyGantt;
            const idsVisibles = new Set(visibles.map((p) => p.id));
            const tareasG = tareas.filter((t) => (todos ? !!t.proyecto_id && idsVisibles.has(t.proyecto_id) : t.proyecto_id === idG));
            const idsG = new Set(tareasG.map((t) => t.id));
            const fasesG = fases.filter((f) => (todos ? idsVisibles.has(f.proyecto_id) : f.proyecto_id === idG));
            const depsG = dependencias.filter((d) => idsG.has(d.tarea_id));
            const nombreMiembro = (id?: string | null) => miembros.find((m) => m.id === id)?.nombre ?? 'Sin asignar';
            const proyectoG = todos ? undefined : visibles.find((p) => p.id === idG);
            return (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <select className={select} value={todos ? 'todos' : idG} onChange={(e) => setProyGantt(e.target.value)} aria-label="Proyecto">
                    <option value="todos">Todos los proyectos</option>
                    {visibles.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                  {proyectoG && (
                    <>
                      <button type="button" onClick={() => setEditando(proyectoG)} className="inline-flex items-center gap-1 text-xs text-[var(--c-muted)] hover:text-[var(--c-accent)]"><Pencil className="w-3 h-3" />Editar</button>
                      <button type="button" onClick={() => { setAbierto(idG); setPestana('proyectos'); }} className="text-xs text-[var(--c-accent)] hover:underline">Abrir proyecto</button>
                    </>
                  )}
                </div>
                {tareasG.length === 0 && fasesG.length === 0 ? (
                  <p className="text-xs text-[var(--c-muted)]">No hay tareas en {todos ? 'estos proyectos' : 'este proyecto'}.</p>
                ) : (
                  <Gantt
                    tareas={tareasG}
                    fases={fasesG}
                    dependencias={depsG}
                    nombreMiembro={nombreMiembro}
                    onToggle={(t) => toggleTareaCompletada(t.id, t.completada)}
                    onEditar={(t) => onEditTask(t)}
                    proyectos={todos ? visibles.map((p) => ({ id: p.id, nombre: p.nombre, cliente: p.empresa_id ? empresas.find((e) => e.id === p.empresa_id)?.nombre ?? 'Sin cliente' : undefined })) : undefined}
                    onEditarProyecto={(id) => setEditando(proyectos.find((p) => p.id === id) ?? null)}
                  />
                )}
              </div>
            );
          })() : pestana === 'calendario' ? (
            <Calendario tareas={tareas} proyectos={proyectos} fases={fases} empresas={empresas} onAbrirProyecto={(id) => { setAbierto(id); setPestana('proyectos'); }} onEditarTarea={onEditTask} />
          ) : cargando ? (
            <p className="text-sm text-[var(--c-muted)]">Cargando...</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {!ambito && (
                  <select className={select} value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)} aria-label="Tipo">
                    <option value="todos">Internos y de clientes</option>
                    <option value="interno">Internos</option>
                    <option value="cliente">De clientes</option>
                  </select>
                )}
                <select className={select} value={estado} onChange={(e) => setEstado(e.target.value as typeof estado)} aria-label="Estado">
                  <option value="activos">Activos</option>
                  <option value="todos">Todos</option>
                  {(Object.keys(ESTADO) as EstadoProyecto[]).map((k) => <option key={k} value={k}>{ESTADO[k]}</option>)}
                </select>
                <span className="text-[11px] text-[var(--c-muted)] ml-auto">{lista.length} proyecto{lista.length === 1 ? '' : 's'}</span>
              </div>

              {lista.length === 0 ? (
                <div className="surface p-8 text-center space-y-2">
                  <p className="text-sm text-[var(--c-text)]">No hay proyectos para este filtro.</p>
                  <p className="text-xs text-[var(--c-muted)]">Crea uno desde una plantilla (Implementar GA4, Remodelar sitio web, Desplegar ecosistema) o vacío.</p>
                </div>
              ) : (
                <div className="grid grid-cols-[minmax(0,1fr)] md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {lista.map(({ p, fase, total, hechas, atrasadas, cliente, responsable }) => {
                    const pct = total ? Math.round((hechas / total) * 100) : 0;
                    return (
                      <button key={p.id} onClick={() => setAbierto(p.id)} className="surface p-4 text-left space-y-3 hover:ring-1 hover:ring-[var(--module)] transition">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-[var(--c-text)] min-w-0 break-words">{p.nombre}</p>
                          <ChipSenal tono={p.estado === 'finalizado' ? 'ok' : p.estado === 'pausado' ? 'warn' : 'neutro'}>{ESTADO[p.estado]}</ChipSenal>
                        </div>
                        <p className="text-[11px] text-[var(--c-muted)]">{p.tipo === 'interno' ? 'Interno de la agencia' : cliente ?? 'Cliente'}{responsable ? ` · ${responsable}` : ''}</p>
                        {fase && <p className="text-[11px] text-[var(--c-text-2)]">Fase actual: <span className="font-medium">{fase}</span></p>}
                        <div className="h-1.5 rounded-full bg-[var(--c-surface-3)] overflow-hidden"><div className="h-full bg-[var(--c-ok)]" style={{ width: `${pct}%` }} /></div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-[var(--c-muted)]">
                          <span>{hechas}/{total} tareas</span>
                          <span>·</span>
                          <span>{p.fecha_inicio ? diaCorto(p.fecha_inicio) : '—'} → {p.fecha_fin ? diaCorto(p.fecha_fin) : '—'}</span>
                          {p.fecha_fin && p.fecha_fin < hoy && p.estado !== 'finalizado' && <ChipSenal tono="danger">Vencido</ChipSenal>}
                          {atrasadas > 0 && <ChipSenal tono="warn">{atrasadas} tarea{atrasadas > 1 ? 's' : ''} atrasada{atrasadas > 1 ? 's' : ''}</ChipSenal>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}

      {nuevo && <NuevoProyectoModal tipoFijo={ambito === 'agencia' ? 'interno' : ambito === 'clientes' ? 'cliente' : undefined} onCerrar={() => setNuevo(false)} onCreado={async (id) => { setNuevo(false); await cambio(); setAbierto(id); setPestana('proyectos'); }} />}
      {editando && <EditarProyectoModal proyecto={editando} onCerrar={() => setEditando(null)} onGuardado={cambio} />}
    </div>
  );
};
