import React, { useMemo, useState } from 'react';
import { CalendarDays, FolderKanban, Plus, GanttChart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCRM } from '../context/CRMContext';
import { ChipSenal } from '../components/common/ChipSenal';
import { Calendario } from '../components/proyectos/Calendario';
import { Gantt } from '../components/proyectos/Gantt';
import { NuevoProyectoModal } from '../components/proyectos/NuevoProyectoModal';
import { ProyectoDetalle } from '../components/proyectos/ProyectoDetalle';
import { useProyectos } from '../components/proyectos/useProyectos';
import { diaCorto, hoyIso } from '../components/proyectos/fechas';
import type { EstadoProyecto, Tarea } from '../types/crm';

const ESTADO: Record<EstadoProyecto, string> = { planificado: 'Planificado', en_curso: 'En curso', pausado: 'Pausado', finalizado: 'Finalizado' };
const select = 'px-2.5 py-1.5 text-xs bg-[var(--c-surface)] border border-[var(--c-line)] rounded text-[var(--c-text)]';

interface Props {
  onEditTask: (t: Tarea) => void;
  /** 'agencia': solo proyectos internos de la agencia (sin selector de tipo). */
  ambito?: 'agencia';
}

export const ProjectsView: React.FC<Props> = ({ onEditTask, ambito }) => {
  const { isAdmin } = useAuth();
  const { tareas, empresasTodas: empresas, miembros, refetchTodo, toggleTareaCompletada } = useCRM();
  const { proyectos, fases, miembrosProyecto, dependencias, cargando, error, recargar } = useProyectos();
  const [pestana, setPestana] = useState<'proyectos' | 'calendario' | 'gantt'>('proyectos');
  const [proyGantt, setProyGantt] = useState<string>('');
  const [abierto, setAbierto] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState(false);
  const [tipo, setTipo] = useState<'todos' | 'interno' | 'cliente'>(ambito === 'agencia' ? 'interno' : 'todos');
  const [estado, setEstado] = useState<'activos' | EstadoProyecto | 'todos'>('activos');
  const hoy = hoyIso();

  const cambio = async () => {
    await Promise.all([recargar(), refetchTodo()]);
  };

  const lista = useMemo(
    () =>
      proyectos
        .filter((p) => (tipo === 'todos' || (p.tipo ?? 'cliente') === tipo) && (estado === 'todos' ? true : estado === 'activos' ? p.estado !== 'finalizado' : p.estado === estado))
        .map((p) => {
          const ts = tareas.filter((t) => t.proyecto_id === p.id);
          return {
            p,
            total: ts.length,
            hechas: ts.filter((t) => t.completada).length,
            atrasadas: ts.filter((t) => !t.completada && t.fecha_vencimiento < hoy).length,
            cliente: p.empresa_id ? empresas.find((e) => e.id === p.empresa_id)?.nombre : undefined,
            responsable: miembros.find((m) => m.id === p.responsable_id)?.nombre,
          };
        }),
    [proyectos, tareas, empresas, miembros, tipo, estado, hoy],
  );

  const seleccionado = abierto ? proyectos.find((p) => p.id === abierto) : undefined;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
      {seleccionado ? (
        <ProyectoDetalle proyecto={seleccionado} fases={fases} miembrosProyecto={miembrosProyecto} dependencias={dependencias} onVolver={() => setAbierto(null)} onCambio={cambio} />
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--c-text)]">Proyectos</h1>
              <p className="text-xs text-[var(--c-muted)] mt-0.5">
                Proyectos internos y de clientes, con Gantt y calendario. {isAdmin ? 'Como admin ves todos.' : 'Ves solo los proyectos a los que tienes acceso.'}
              </p>
            </div>
            <button onClick={() => setNuevo(true)} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded bg-[var(--c-accent)] text-[var(--c-on-accent)]"><Plus className="w-3.5 h-3.5" />Nuevo proyecto</button>
          </div>

          <div role="tablist" aria-label="Vista" className="inline-flex gap-1 p-0.5 rounded-md bg-[var(--c-surface-2)]">
            {([['proyectos', 'Proyectos', FolderKanban], ['calendario', 'Calendario', CalendarDays], ['gantt', 'Gantt', GanttChart]] as const).map(([k, t, Icono]) => (
              <button key={k} role="tab" aria-selected={pestana === k} onClick={() => setPestana(k)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded ${pestana === k ? 'bg-[var(--c-surface)] text-[var(--c-text)] font-semibold ring-1 ring-[var(--module)]' : 'text-[var(--c-muted)]'}`}>
                <Icono className="w-3.5 h-3.5" />{t}
              </button>
            ))}
          </div>

          {error && <p className="text-xs text-[var(--c-danger)] border border-[var(--c-danger)]/40 rounded p-2">{error}</p>}

          {pestana === 'gantt' ? (() => {
            const visibles = proyectos.filter((p) => (tipo === 'todos' || (p.tipo ?? 'cliente') === tipo) && (estado === 'todos' ? true : estado === 'activos' ? p.estado !== 'finalizado' : p.estado === estado));
            const idG = visibles.some((p) => p.id === proyGantt) ? proyGantt : (visibles[0]?.id ?? '');
            const tareasG = tareas.filter((t) => t.proyecto_id === idG);
            const idsG = new Set(tareasG.map((t) => t.id));
            const fasesG = fases.filter((f) => f.proyecto_id === idG);
            const depsG = dependencias.filter((d) => idsG.has(d.tarea_id));
            const nombreMiembro = (id?: string | null) => miembros.find((m) => m.id === id)?.nombre ?? 'Sin asignar';
            return (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <select className={select} value={idG} onChange={(e) => setProyGantt(e.target.value)} aria-label="Proyecto">
                    {visibles.length === 0 && <option value="">Sin proyectos</option>}
                    {visibles.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                  {idG && <button type="button" onClick={() => { setAbierto(idG); setPestana('proyectos'); }} className="text-xs text-[var(--c-accent)] hover:underline">Abrir proyecto</button>}
                </div>
                {idG ? (
                  <Gantt tareas={tareasG} fases={fasesG} dependencias={depsG} nombreMiembro={nombreMiembro} onToggle={(t) => toggleTareaCompletada(t.id, t.completada)} onEditar={(t) => onEditTask(t)} />
                ) : (
                  <p className="text-xs text-[var(--c-muted)]">No hay proyectos con estos filtros.</p>
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
                {ambito !== 'agencia' && (
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
                  {lista.map(({ p, total, hechas, atrasadas, cliente, responsable }) => {
                    const pct = total ? Math.round((hechas / total) * 100) : 0;
                    return (
                      <button key={p.id} onClick={() => setAbierto(p.id)} className="surface p-4 text-left space-y-3 hover:ring-1 hover:ring-[var(--module)] transition">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-[var(--c-text)] min-w-0 break-words">{p.nombre}</p>
                          <ChipSenal tono={p.estado === 'finalizado' ? 'ok' : p.estado === 'pausado' ? 'warn' : 'neutro'}>{ESTADO[p.estado]}</ChipSenal>
                        </div>
                        <p className="text-[11px] text-[var(--c-muted)]">{p.tipo === 'interno' ? 'Interno de la agencia' : cliente ?? 'Cliente'}{responsable ? ` · ${responsable}` : ''}</p>
                        <div className="h-1.5 rounded-full bg-[var(--c-surface-3)] overflow-hidden"><div className="h-full bg-[var(--c-ok)]" style={{ width: `${pct}%` }} /></div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-[var(--c-muted)]">
                          <span>{hechas}/{total} tareas</span>
                          <span>·</span>
                          <span>{p.fecha_inicio ? diaCorto(p.fecha_inicio) : '—'} → {p.fecha_fin ? diaCorto(p.fecha_fin) : '—'}</span>
                          {atrasadas > 0 && <ChipSenal tono="danger">{atrasadas} atrasada{atrasadas > 1 ? 's' : ''}</ChipSenal>}
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

      {nuevo && <NuevoProyectoModal tipoFijo={ambito === 'agencia' ? 'interno' : undefined} onCerrar={() => setNuevo(false)} onCreado={async (id) => { setNuevo(false); await cambio(); setAbierto(id); setPestana('proyectos'); }} />}
    </div>
  );
};
