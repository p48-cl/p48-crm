import React, { useState, useMemo } from 'react';
import { ChipSenal } from '../components/common/ChipSenal';
import {
  CheckSquare,
  Plus,
  Calendar,
  Building2,
  FolderKanban,
  Kanban,
} from 'lucide-react';
import { Tarea } from '../types/crm';
import { useCRM } from '../context/CRMContext';
import { useProyectos } from '../components/proyectos/useProyectos';
import { formatFecha, esFechaAtrasada, esFechaHoy } from '../lib/formatters';
import { Kpi } from '../components/dashboard/ui';
import { Archive, ArchiveRestore } from 'lucide-react';

interface TasksViewProps {
  onOpenNewTask: () => void;
  onEditTask: (t: Tarea) => void;
  onSelectEmpresa: (id: string) => void;
  onSelectOportunidad: (id: string) => void;
  onSelectProyecto?: (id: string) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  onOpenNewTask,
  onEditTask,
  onSelectEmpresa,
  onSelectOportunidad,
  onSelectProyecto,
}) => {
  const { tareas, empresasTodas: empresas, oportunidades, toggleTareaCompletada, actualizarTarea } = useCRM();
  const { proyectos } = useProyectos();

  const [tab, setTab] = useState<'todas' | 'atrasadas' | 'hoy' | 'semana'>('todas');
  const [verArchivadas, setVerArchivadas] = useState(false);

  // Solo tareas vigentes en indicadores y pestañas; con el toggle se ven las archivadas
  const tareasVigentes = useMemo(() => tareas.filter((t) => !t.archivado), [tareas]);
  const base = useMemo(() => tareas.filter((t) => !!t.archivado === verArchivadas), [tareas, verArchivadas]);

  // Cálculos de fecha para tabs
  const tareasFiltradas = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const proximaSemana = new Date(hoy);
    proximaSemana.setDate(proximaSemana.getDate() + 7);

    return base.filter((t) => {
      const f = new Date(t.fecha_vencimiento);
      f.setHours(0, 0, 0, 0);

      if (tab === 'hoy') {
        return esFechaHoy(t.fecha_vencimiento) && !t.completada;
      }

      if (tab === 'semana') {
        return f >= hoy && f <= proximaSemana && !t.completada;
      }

      if (tab === 'atrasadas') {
        return esFechaAtrasada(t.fecha_vencimiento) && !t.completada;
      }

      return true; // 'todas'
    });
  }, [base, tab]);

  // Indicadores de estado (primera fila) y de gestión (segunda fila). Sin responsables: operación de una sola persona.
  const indicadores = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const en7 = new Date(hoy);
    en7.setDate(en7.getDate() + 7);
    const fechaLocal = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00`);

    const abiertas = tareasVigentes.filter((t) => !t.completada);
    const atrasadas = abiertas.filter((t) => esFechaAtrasada(t.fecha_vencimiento));
    const diasAtrasoProm = atrasadas.length
      ? Math.round(atrasadas.reduce((n, t) => n + (hoy.getTime() - fechaLocal(t.fecha_vencimiento).getTime()) / 86400000, 0) / atrasadas.length)
      : 0;

    const hace7 = Date.now() - 7 * 86400000;
    const hace30 = Date.now() - 30 * 86400000;
    const completadas = tareasVigentes.filter((t) => t.completada && t.fecha_completada);
    const completadas7 = completadas.filter((t) => new Date(t.fecha_completada as string).getTime() >= hace7).length;
    const completadas30 = completadas.filter((t) => new Date(t.fecha_completada as string).getTime() >= hace30);
    const aTiempo30 = completadas30.filter((t) => (t.fecha_completada as string).slice(0, 10) <= t.fecha_vencimiento.slice(0, 10)).length;

    return {
      abiertas: abiertas.length,
      atrasadas: atrasadas.length,
      diasAtrasoProm,
      hoy: abiertas.filter((t) => esFechaHoy(t.fecha_vencimiento)).length,
      proximas: abiertas.filter((t) => {
        const f = fechaLocal(t.fecha_vencimiento);
        return f >= hoy && f <= en7;
      }).length,
      completadas7,
      completadas30: completadas30.length,
      aTiempoPct: completadas30.length ? Math.round((aTiempo30 / completadas30.length) * 100) : null,
      altaAbiertas: abiertas.filter((t) => t.prioridad === 'alta').length,
      sinVinculo: abiertas.filter((t) => !t.empresa_id && !t.oportunidad_id && !t.proyecto_id).length,
    };
  }, [tareasVigentes]);

  // Contadores para pestañas
  const counts = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const proximaSemana = new Date(hoy);
    proximaSemana.setDate(proximaSemana.getDate() + 7);

    const hoyCount = tareasVigentes.filter((t) => esFechaHoy(t.fecha_vencimiento) && !t.completada).length;
    const semanaCount = tareasVigentes.filter((t) => {
      const f = new Date(t.fecha_vencimiento);
      f.setHours(0, 0, 0, 0);
      return f >= hoy && f <= proximaSemana && !t.completada;
    }).length;
    const atrasadasCount = tareasVigentes.filter(
      (t) => esFechaAtrasada(t.fecha_vencimiento) && !t.completada
    ).length;

    return { hoyCount, semanaCount, atrasadasCount, todasCount: tareasVigentes.length };
  }, [tareasVigentes]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-sans text-[var(--c-text)]">
            Gestión de Tareas
          </h1>
          <p className="text-xs text-[var(--c-muted)] mt-0.5">
            Compromisos comerciales y entregables operativos del equipo
          </p>
        </div>

        <button
          onClick={onOpenNewTask}
          className="bg-[var(--c-accent)] hover:bg-[var(--c-accent-hover)] active:scale-[0.98] text-[var(--c-on-accent)] font-semibold text-xs py-2 px-3.5 rounded flex items-center gap-1.5 transition-all shadow-sm font-sans"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Nueva Tarea</span>
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi etiqueta="Abiertas" acento="var(--c-accent)" valor={indicadores.abiertas} nota="pendientes en total" onClick={() => setTab('todas')} />
        <Kpi etiqueta="Atrasadas" acento="var(--c-danger)" tono={indicadores.atrasadas > 0 ? 'peligro' : 'normal'} valor={indicadores.atrasadas} nota={indicadores.atrasadas > 0 ? `${indicadores.diasAtrasoProm} días de atraso en promedio` : 'al día'} onClick={() => setTab('atrasadas')} />
        <Kpi etiqueta="Vencen hoy" acento="var(--c-warn)" tono={indicadores.hoy > 0 ? 'aviso' : 'normal'} valor={indicadores.hoy} nota="con vencimiento hoy" onClick={() => setTab('hoy')} />
        <Kpi etiqueta="Próximas 7 días" acento="var(--c-info)" valor={indicadores.proximas} nota="vencen en la próxima semana" onClick={() => setTab('semana')} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi etiqueta="Completadas" acento="var(--c-ok)" valor={indicadores.completadas7} nota={`últimos 7 días · ${indicadores.completadas30} en 30 días`} />
        <Kpi etiqueta="Cumplimiento a tiempo" acento="var(--c-ok)" valor={indicadores.aTiempoPct != null ? `${indicadores.aTiempoPct}%` : '—'} progreso={indicadores.aTiempoPct} nota="completadas antes o el día del vencimiento (30 días)" />
        <Kpi etiqueta="Alta prioridad abiertas" acento="var(--c-danger)" tono={indicadores.altaAbiertas > 0 ? 'aviso' : 'normal'} valor={indicadores.altaAbiertas} nota="prioridad alta sin completar" />
        <Kpi etiqueta="Sin vínculo" acento="var(--c-muted)" tono={indicadores.sinVinculo > 0 ? 'aviso' : 'normal'} valor={indicadores.sinVinculo} nota="sin cliente, negocio ni proyecto" />
      </div>

      {/* Pestañas: Hoy, Esta semana, Atrasadas (resaltadas en Magenta), Todas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--c-line)] pb-1">
        <div className="flex gap-2 text-xs font-medium overflow-x-auto">
          {[
            { id: 'todas' as const, label: 'Todas', count: counts.todasCount },
            {
              id: 'atrasadas' as const,
              label: 'Atrasadas',
              count: counts.atrasadasCount,
              alert: counts.atrasadasCount > 0,
            },
            { id: 'hoy' as const, label: 'Hoy', count: counts.hoyCount },
            { id: 'semana' as const, label: 'Esta semana', count: counts.semanaCount },
          ].map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`py-2 px-3 rounded-t border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  active
                    ? 'border-[var(--c-accent)] text-[var(--c-accent)] font-semibold'
                    : 'border-transparent text-[var(--c-muted)] hover:text-[var(--c-text)]'
                }`}
              >
                <span>{item.label}</span>
                <span
                  className={`font-mono text-[10px] px-1.5 py-0.2 rounded font-bold ${
                    item.alert
                      ? 'bg-[var(--c-danger)]/20 text-[var(--c-danger)]'
                      : active
                      ? 'bg-[var(--c-surface-2)] text-[var(--c-accent)]'
                      : 'bg-[var(--c-surface-2)] text-[var(--c-muted)]'
                  }`}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-xs text-[var(--c-muted)] shrink-0">
          <button onClick={() => setVerArchivadas((v) => !v)} className="font-mono text-[11px] hover:text-[var(--c-text)]">
            {verArchivadas ? 'Ver activas' : 'Ver archivadas'}
          </button>
        </div>
      </div>

      {/* Lista de Tareas */}
      <div className="space-y-2">
        {tareasFiltradas.length === 0 ? (
          <div className="p-12 text-center text-xs text-[var(--c-muted)] bg-[var(--c-surface)] rounded-lg border border-[var(--c-line)]">
            No tienes tareas pendientes en esta vista.
          </div>
        ) : (
          tareasFiltradas.map((t) => {
            const emp = empresas.find((e) => e.id === t.empresa_id);
            const op = oportunidades.find((o) => o.id === t.oportunidad_id);
            const proy = t.proyecto_id ? proyectos.find((p) => p.id === t.proyecto_id) : undefined;
            const atrasada = esFechaAtrasada(t.fecha_vencimiento) && !t.completada;

            return (
              <div
                key={t.id}
                onClick={() => onEditTask(t)}
                className={`p-3.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors cursor-pointer ${
                  t.completada
                    ? 'bg-[var(--c-surface)] border-[var(--c-line)] opacity-60'
                    : atrasada
                    ? 'bg-[var(--c-surface-2)] border-[var(--c-danger)]/50 ring-1 ring-[var(--c-danger)]/20'
                    : 'bg-[var(--c-surface)] border-[var(--c-line)] hover:border-[var(--c-line)]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleTareaCompletada(t.id, t.completada); }}
                    aria-label={t.completada ? 'Marcar como pendiente' : 'Marcar como completada'}
                    className="mt-0.5 text-[var(--c-muted)] hover:text-[var(--c-accent)] transition-colors"
                  >
                    <CheckSquare
                      className={`w-4 h-4 ${
                        t.completada ? 'text-[var(--c-accent)]' : 'text-[var(--c-muted-2)]'
                      }`}
                    />
                  </button>

                  <div>
                    <span
                      className={`block text-left text-xs font-semibold ${
                        t.completada
                          ? 'line-through text-[var(--c-muted-2)]'
                          : 'text-[var(--c-text)]'
                      }`}
                    >
                      {t.titulo}
                    </span>

                    {t.descripcion && (
                      <p className="text-[11px] text-[var(--c-muted)] mt-0.5 line-clamp-1">
                        {t.descripcion}
                      </p>
                    )}

                    {/* Vínculos */}
                    <div className="flex flex-wrap items-center gap-3 text-[10px] text-[var(--c-muted)] font-mono mt-1.5">
                      {emp && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onSelectEmpresa(emp.id); }}
                          className="hover:text-[var(--c-accent)] flex items-center gap-1 font-sans"
                        >
                          <Building2 className="w-3 h-3 text-[var(--c-muted-2)]" />
                          <span>{emp.nombre}</span>
                        </button>
                      )}
                      {op && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onSelectOportunidad(op.id); }}
                          className="hover:text-[var(--c-accent)] flex items-center gap-1 font-sans"
                        >
                          <Kanban className="w-3 h-3 text-[var(--c-muted-2)]" />
                          <span>{op.nombre}</span>
                        </button>
                      )}
                      {proy && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onSelectProyecto?.(proy.id); }}
                          className="hover:text-[var(--c-accent)] flex items-center gap-1 font-sans"
                          title="Ver proyecto"
                        >
                          <FolderKanban className="w-3 h-3 text-[var(--c-muted-2)]" />
                          <span>{proy.nombre}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); actualizarTarea(t.id, { archivado: !t.archivado }); }}
                    title={t.archivado ? 'Restaurar' : 'Archivar'}
                    className="p-1 text-[var(--c-muted)] hover:text-[var(--c-text)]"
                  >
                    {t.archivado ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                  </button>
                  <span
                    className={`font-mono text-[10px] font-semibold ${
                      t.prioridad === 'alta'
                        ? 'text-[var(--c-danger)]'
                        : t.prioridad === 'media'
                        ? 'text-[var(--c-warn)]'
                        : 'text-[var(--c-muted)]'
                    }`}
                  >
                    {t.prioridad.toUpperCase()}
                  </span>

                  <span
                    className={`font-mono text-xs flex items-center gap-1 ${
                      atrasada ? 'text-[var(--c-danger)] font-bold' : 'text-[var(--c-muted)]'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5 text-[var(--c-muted-2)]" />
                    <span>{formatFecha(t.fecha_vencimiento)}</span>
                  </span>
                  {atrasada && <ChipSenal tono="danger">Atrasada</ChipSenal>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
