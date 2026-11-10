import React, { useMemo, useState } from 'react';
import { Building, Plus } from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { ChipSenal } from '../components/common/ChipSenal';
import { Kpi } from '../components/dashboard/ui';
import { ProjectsView } from './ProjectsView';
import { CotizacionesCliente } from '../components/clientes/CotizacionesCliente';
import { CuentasCliente } from '../components/clientes/CuentasCliente';
import { FichaMarketing } from '../components/marketing/FichaMarketing';
import { EstrategiaEditor } from '../components/clientes/EstrategiaCliente';
import { DatosFacturacion } from '../components/clientes/DatosFacturacion';
import { useProyectos } from '../components/proyectos/useProyectos';
import { hoyIso, diaCorto } from '../components/proyectos/fechas';
import { formatFecha } from '../lib/formatters';
import type { Tarea } from '../types/crm';

type Seccion = 'resumen' | 'proyectos' | 'tareas' | 'cotizaciones' | 'estrategia' | 'marketing' | 'datos';

const SECCIONES: { id: Seccion; label: string }[] = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'proyectos', label: 'Proyectos' },
  { id: 'tareas', label: 'Tareas' },
  { id: 'cotizaciones', label: 'Cotizaciones' },
  { id: 'estrategia', label: 'Estrategia' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'datos', label: 'Datos y carpeta' },
];

interface Props {
  onNuevaTarea: (empresaId: string) => void;
  onEditTask: (t: Tarea) => void;
}

// Espacio interno de la agencia (P48): separado de clientes, sin sumar a sus métricas.
export const AgenciaView: React.FC<Props> = ({ onNuevaTarea, onEditTask }) => {
  const { agencia, tareas, miembros, accesosAdmin, toggleTareaCompletada, actualizarAccesosAdmin, actualizarEmpresa } = useCRM();
  const { proyectos } = useProyectos();
  const [seccion, setSeccion] = useState<Seccion>('resumen');
  const hoy = hoyIso();

  // Proyectos internos y tareas propias de la agencia (con empresa interna o dentro de un proyecto interno).
  const idsInternos = useMemo(() => new Set(proyectos.filter((p) => (p.tipo ?? 'cliente') === 'interno').map((p) => p.id)), [proyectos]);
  const propios = useMemo(() => proyectos.filter((p) => (p.tipo ?? 'cliente') === 'interno'), [proyectos]);
  const misTareas = useMemo(
    () =>
      tareas
        .filter((t) => (agencia && t.empresa_id === agencia.id) || (t.proyecto_id && idsInternos.has(t.proyecto_id)))
        .sort((a, b) => Number(a.completada) - Number(b.completada) || a.fecha_vencimiento.localeCompare(b.fecha_vencimiento)),
    [tareas, agencia, idsInternos],
  );

  if (!agencia) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="surface p-8 text-center space-y-2">
          <p className="text-sm text-[var(--c-text)]">Aún no existe la cuenta interna de la agencia.</p>
          <p className="text-xs text-[var(--c-muted)]">Se crea como una empresa con estado «interno».</p>
        </div>
      </div>
    );
  }

  const activos = propios.filter((p) => p.estado !== 'finalizado');
  const pendientes = misTareas.filter((t) => !t.completada);
  const vencidas = pendientes.filter((t) => t.fecha_vencimiento.slice(0, 10) < hoy);
  const nombreResp = (id?: string | null) => miembros.find((m) => m.id === id)?.nombre ?? '—';
  const accesos = accesosAdmin[agencia.id];

  return (
    <div data-module="organic" className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      <div className="surface p-4 flex flex-wrap items-center gap-3 border-l-4" style={{ borderLeftColor: 'var(--module)' }}>
        <Building className="w-5 h-5 text-[var(--module)]" />
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-[var(--c-text)]">{agencia.nombre}</h1>
          <p className="text-xs text-[var(--c-muted)]">Gestión propia de la agencia. No suma a clientes, MRR, pipeline ni cotizaciones de clientes.</p>
        </div>
        <span className="ml-auto text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded bg-[var(--c-surface-3)] text-[var(--module)]">Interno</span>
      </div>

      <nav className="surface p-1 flex overflow-x-auto gap-1 max-w-full" aria-label="Secciones de la agencia">
        {SECCIONES.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={seccion === s.id}
            onClick={() => setSeccion(s.id)}
            className={`px-3 py-1.5 text-xs rounded whitespace-nowrap ${seccion === s.id ? 'bg-[var(--c-surface-3)] text-[var(--c-text)] font-semibold' : 'text-[var(--c-muted)] hover:text-[var(--c-text-2)]'}`}
          >
            {s.label}
          </button>
        ))}
      </nav>

      {seccion === 'resumen' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi etiqueta="Proyectos internos" valor={activos.length} nota={`${propios.length} en total`} onClick={() => setSeccion('proyectos')} />
            <Kpi etiqueta="Tareas pendientes" valor={pendientes.length} nota={`${misTareas.length - pendientes.length} completadas`} onClick={() => setSeccion('tareas')} />
            <Kpi etiqueta="Tareas vencidas" valor={vencidas.length} tono={vencidas.length > 0 ? 'peligro' : 'normal'} nota={vencidas.length > 0 ? 'Requieren atención' : 'Todo al día'} onClick={() => setSeccion('tareas')} />
            <Kpi etiqueta="Responsable" valor={nombreResp(agencia.responsable_id)} nota="Cuenta interna" />
          </div>
          <div className="surface p-4 space-y-2">
            <h3 className="text-xs font-semibold text-[var(--c-text)]">Próximas tareas de la agencia</h3>
            {pendientes.length === 0 ? (
              <p className="text-xs text-[var(--c-muted)]">No hay tareas pendientes.</p>
            ) : (
              <ul className="divide-y divide-[var(--c-line)]">
                {pendientes.slice(0, 5).map((t) => (
                  <li key={t.id} className="py-2 flex items-center justify-between gap-3 text-xs">
                    <span className="text-[var(--c-text)] truncate">{t.titulo}</span>
                    <span className={`font-mono shrink-0 ${t.fecha_vencimiento.slice(0, 10) < hoy ? 'text-[var(--c-danger)]' : 'text-[var(--c-muted)]'}`}>{diaCorto(t.fecha_vencimiento.slice(0, 10))}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {seccion === 'proyectos' && <ProjectsView ambito="agencia" onEditTask={onEditTask} />}

      {seccion === 'tareas' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-[var(--c-muted)]">{pendientes.length} pendiente{pendientes.length === 1 ? '' : 's'} · {vencidas.length} vencida{vencidas.length === 1 ? '' : 's'}</p>
            <button onClick={() => onNuevaTarea(agencia.id)} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded bg-[var(--c-accent)] text-[var(--c-on-accent)]">
              <Plus className="w-3.5 h-3.5" />Nueva tarea
            </button>
          </div>
          {misTareas.length === 0 ? (
            <div className="surface p-8 text-center text-xs text-[var(--c-muted)]">No hay tareas de la agencia. Crea una o agrégalas desde un proyecto interno.</div>
          ) : (
            <ul className="surface divide-y divide-[var(--c-line)]">
              {misTareas.map((t) => (
                <li key={t.id} className="p-3 flex items-center gap-3 text-xs">
                  <input type="checkbox" checked={t.completada} onChange={() => toggleTareaCompletada(t.id, t.completada)} aria-label={`Completar ${t.titulo}`} />
                  <button onClick={() => onEditTask(t)} className={`text-left min-w-0 flex-1 truncate ${t.completada ? 'line-through text-[var(--c-muted)]' : 'text-[var(--c-text)]'}`}>{t.titulo}</button>
                  <span className="text-[var(--c-muted)] hidden sm:inline">{nombreResp(t.responsable_id)}</span>
                  {!t.completada && t.fecha_vencimiento.slice(0, 10) < hoy && <ChipSenal tono="danger">Vencida</ChipSenal>}
                  <span className="font-mono text-[var(--c-muted)] shrink-0">{formatFecha(t.fecha_vencimiento)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {seccion === 'cotizaciones' && <CotizacionesCliente empresa={agencia} />}

      {seccion === 'estrategia' && <EstrategiaEditor empresaId={agencia.id} nombreCliente={agencia.nombre} />}

      {seccion === 'datos' && (
        <div className="space-y-4">
          <p className="text-[11px] text-[var(--c-muted)]">Datos legales de la agencia: se usan como emisor en cotizaciones. Sin contrato, plan ni fee, porque la agencia no se factura a sí misma.</p>
          <DatosFacturacion empresa={agencia} onGuardar={(c) => actualizarEmpresa(agencia.id, c)} />
          <div className="ficha-card p-4 space-y-2">
            <label className="block text-[11px] text-[var(--c-muted)]" htmlFor="agencia-drive">Carpeta de Drive de la agencia</label>
            <input
              id="agencia-drive"
              type="url"
              defaultValue={agencia.drive_folder_url ?? ''}
              placeholder="https://drive.google.com/..."
              onBlur={(e) => {
                const v = e.target.value.trim() || null;
                if (v !== (agencia.drive_folder_url ?? null)) actualizarEmpresa(agencia.id, { drive_folder_url: v });
              }}
              className="w-full bg-[var(--c-field)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)]"
            />
          </div>
        </div>
      )}

      {seccion === 'marketing' && (
        <div className="space-y-6">
          <FichaMarketing empresaId={agencia.id} />
          <CuentasCliente
            empresaId={agencia.id}
            notas={accesos?.notas_accesos || ''}
            onNotas={(v) => actualizarAccesosAdmin(agencia.id, { notas_accesos: v })}
          />
        </div>
      )}
    </div>
  );
};
