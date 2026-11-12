import { LogoEmpresa } from '../components/clientes/Logo';
import React, { useState, useMemo } from 'react';
import {
  Kanban,
  Table as TableIcon,
  Plus,
  AlertCircle,
  Filter,
  Calendar,
} from 'lucide-react';
import { VOportunidad } from '../types/crm';
import { useCRM } from '../context/CRMContext';
import { PipelineKpis } from '../components/crm/PipelineKpis';
import { formatMoneda, formatFecha, esFechaAtrasada, formatCorrelativo, codigoNegocio, diasHastaFecha } from '../lib/formatters';
import { ConfirmWonModal } from '../components/common/ConfirmWonModal';
import { LossReasonModal } from '../components/common/LossReasonModal';
import { ChipSenal, TonoChip } from '../components/common/ChipSenal';

const SEGUIMIENTO_UI: Record<string, { label: string; tono: TonoChip }> = {
  atrasado: { label: 'Atrasado', tono: 'danger' },
  sin_accion: { label: 'Sin acción', tono: 'warn' },
  por_vencer: { label: 'Vence hoy', tono: 'warn' },
  al_dia: { label: 'Al día', tono: 'ok' },
};

const iniciales = (nombre?: string | null): string => {
  if (!nombre) return '—';
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
};

interface KanbanViewProps {
  // 'captacion' = Leads (Centro de mando) · 'expansion' = Negocios (Operaciones)
  pipeline: 'captacion' | 'expansion';
  onSelectOportunidad: (id: string) => void;
  onOpenNewDeal: () => void;
}

export const KanbanView: React.FC<KanbanViewProps> = ({
  pipeline,
  onSelectOportunidad,
  onOpenNewDeal,
}) => {
  const {
    oportunidades,
    etapas,
    empresas,
    miembros,
    fuentes,
    motivosPerdida,
    moverOportunidadEtapa,
    actualizarEmpresa,
    calificaciones,
  } = useCRM();

  const [vistaModo, setVistaModo] = useState<'kanban' | 'tabla'>('kanban');

  // Filtros
  const [filtroResponsable, setFiltroResponsable] = useState<string>('todos');
  const [filtroFuente, setFiltroFuente] = useState<string>('todos');
  const [filtroEtapa] = useState<string>('todos');
  const pipelineSel = pipeline;
  const pipelineDe = (etapaId: string) => etapas.find((e) => e.id === etapaId)?.pipeline ?? 'captacion';
  const [filtroSeguimiento, setFiltroSeguimiento] = useState<string>('todos');

  // Drag and Drop
  const [draggedOpId, setDraggedOpId] = useState<string | null>(null);
  const [dragOverEtapaId, setDragOverEtapaId] = useState<string | null>(null);

  // Modales
  const [opParaGanar, setOpParaGanar] = useState<VOportunidad | null>(null);
  const [opParaPerder, setOpParaPerder] = useState<VOportunidad | null>(null);

  // Filtrado de v_oportunidades
  const filteredOportunidades = useMemo(() => {
    return oportunidades.filter((op) => {
      if (op.archivado) return false;
      if (pipelineDe(op.etapa_id) !== pipelineSel) return false;

      if (filtroResponsable !== 'todos' && op.responsable_id !== filtroResponsable) return false;
      if (filtroFuente !== 'todos' && op.fuente_id !== filtroFuente) return false;
      if (filtroEtapa !== 'todos' && op.etapa_id !== filtroEtapa) return false;

      if (filtroSeguimiento !== 'todos') {
        if (filtroSeguimiento === 'atrasado' && op.estado_seguimiento !== 'atrasado') return false;
        if (filtroSeguimiento === 'sin_accion' && op.estado_seguimiento !== 'sin_accion') return false;
        if (filtroSeguimiento === 'al_dia' && op.estado_seguimiento !== 'al_dia') return false;
        if (filtroSeguimiento === 'por_vencer' && op.estado_seguimiento !== 'por_vencer') return false;
      }

      return true;
    });
  }, [oportunidades, etapas, pipelineSel, filtroResponsable, filtroFuente, filtroEtapa, filtroSeguimiento]);

  const handleDragStart = (e: React.DragEvent, opId: string) => {
    e.dataTransfer.setData('text/plain', opId);
    setDraggedOpId(opId);
  };

  const handleDragOver = (e: React.DragEvent, etapaId: string) => {
    e.preventDefault();
    if (dragOverEtapaId !== etapaId) setDragOverEtapaId(etapaId);
  };

  const handleDrop = async (e: React.DragEvent, nuevaEtapaId: string) => {
    e.preventDefault();
    setDragOverEtapaId(null);
    const opId = e.dataTransfer.getData('text/plain') || draggedOpId;
    if (!opId) return;
    await moverAEtapa(opId, nuevaEtapaId);
  };

  // Lógica común de cambio de etapa (arrastrar o menú táctil)
  const moverAEtapa = async (opId: string, nuevaEtapaId: string) => {
    const op = oportunidades.find((o) => o.id === opId);
    if (!op || op.etapa_id === nuevaEtapaId) return;

    const etapaDestino = etapas.find((et) => et.id === nuevaEtapaId);

    // Si es etapa ganada: pedir confirmación y avisar que la empresa pasará a cliente
    if (etapaDestino?.es_ganada) {
      setOpParaGanar(op);
      return;
    }

    // Si es etapa perdida: exigir motivo antes de enviar
    if (etapaDestino?.es_perdida) {
      setOpParaPerder(op);
      return;
    }

    await moverOportunidadEtapa(opId, nuevaEtapaId);
  };

  const handleConfirmWon = async () => {
    if (!opParaGanar) return;
    const etapaGanada = etapas.find((e) => e.es_ganada && e.pipeline === pipelineDe(opParaGanar.etapa_id));
    if (etapaGanada) {
      await moverOportunidadEtapa(opParaGanar.id, etapaGanada.id);
    }
    // Lead ganado: el cliente queda con su origen (sin duplicar la empresa) si aún no tiene uno
    const emp = empresas.find((e) => e.id === opParaGanar.empresa_id);
    if (emp && !emp.origen && pipelineDe(opParaGanar.etapa_id) === 'captacion') {
      await actualizarEmpresa(emp.id, { origen: 'lead', origen_oportunidad_id: opParaGanar.id });
    }
    setOpParaGanar(null);
  };

  const handleConfirmLoss = async (motivoId: string, detalle: string) => {
    if (!opParaPerder) return;
    const etapaPerdida = etapas.find((e) => e.es_perdida && e.pipeline === pipelineDe(opParaPerder.etapa_id));
    if (etapaPerdida) {
      await moverOportunidadEtapa(opParaPerder.id, etapaPerdida.id, motivoId, detalle);
    }
    setOpParaPerder(null);
  };

  const empresaDeOpParaGanar = empresas.find((e) => e.id === opParaGanar?.empresa_id);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <PipelineKpis pipeline={pipelineSel} />
      {/* Header del CRM */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-sans text-[var(--c-text)]">
            {pipeline === 'captacion' ? 'Pipeline de Leads' : 'Negocios'}
          </h1>
          <p className="text-xs text-[var(--c-muted)] mt-0.5">
            Gestión comercial basada en vista calculada de Supabase
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center p-0.5 bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded text-xs">
            <button
              onClick={() => setVistaModo('kanban')}
              className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors ${
                vistaModo === 'kanban'
                  ? 'bg-[var(--c-surface-3)] text-[var(--c-text)] font-medium shadow-sm'
                  : 'text-[var(--c-muted)] hover:text-[var(--c-text-2)]'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Tablero<span className="hidden sm:inline"> Kanban</span></span>
            </button>
            <button
              onClick={() => setVistaModo('tabla')}
              className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors ${
                vistaModo === 'tabla'
                  ? 'bg-[var(--c-surface-3)] text-[var(--c-text)] font-medium shadow-sm'
                  : 'text-[var(--c-muted)] hover:text-[var(--c-text-2)]'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span><span className="hidden sm:inline">Vista </span>Tabla</span>
            </button>
          </div>

          {/* Botón Principal (ÚNICO Lima #BEFF00) */}
          <button
            onClick={onOpenNewDeal}
            className="bg-[var(--c-accent)] hover:bg-[var(--c-accent-hover)] active:scale-[0.98] text-[var(--c-on-accent)] font-semibold text-xs py-2 px-3.5 rounded flex items-center gap-1.5 transition-all shadow-sm font-sans"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Nueva Oportunidad</span><span className="sm:hidden">Nueva</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3 bg-[var(--c-surface)] p-3 rounded-lg border border-[var(--c-line)]">
        <div className="col-span-2 sm:col-span-1 flex items-center gap-1.5 text-xs text-[var(--c-muted)]">
          <Filter className="w-3.5 h-3.5 text-[var(--c-muted)]" />
          <span>Filtros:</span>
        </div>

        <select
          value={filtroResponsable}
          onChange={(e) => setFiltroResponsable(e.target.value)}
          className="w-full sm:w-auto min-w-0 bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)] focus:outline-none"
        >
          <option value="todos">Todos los responsables</option>
          {miembros.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}
            </option>
          ))}
        </select>

        <select
          value={filtroFuente}
          onChange={(e) => setFiltroFuente(e.target.value)}
          className="w-full sm:w-auto min-w-0 bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)] focus:outline-none"
        >
          <option value="todos">Todas las fuentes</option>
          {fuentes.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nombre}
            </option>
          ))}
        </select>

        <select
          value={filtroSeguimiento}
          onChange={(e) => setFiltroSeguimiento(e.target.value)}
          className="w-full sm:w-auto min-w-0 bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)] focus:outline-none"
        >
          <option value="todos">Todos los seguimientos</option>
          <option value="al_dia">Al día</option>
          <option value="por_vencer">Por vencer hoy</option>
          <option value="atrasado">Atrasados</option>
          <option value="sin_accion">Sin próxima acción</option>
        </select>

        <div className="ml-auto text-xs text-[var(--c-muted)] font-mono">
          Mostrando {filteredOportunidades.length} negocios
        </div>
      </div>

      {/* VISTA KANBAN */}
      {vistaModo === 'kanban' && (
        <div className="flex md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 overflow-x-auto snap-x snap-mandatory pb-6">
          {etapas.filter((e) => e.activa && e.pipeline === pipelineSel).map((etapa) => {
            const opsEtapa = filteredOportunidades.filter((o) => o.etapa_id === etapa.id);
            const totalEtapaCLP = opsEtapa
              .filter((o) => o.moneda === 'CLP')
              .reduce((sum, o) => sum + (o.valor_ponderado || 0), 0);
            const hayUSD = opsEtapa.some((o) => o.moneda !== 'CLP');
            const isDropTarget = dragOverEtapaId === etapa.id;

            return (
              <div
                key={etapa.id}
                onDragOver={(e) => handleDragOver(e, etapa.id)}
                onDrop={(e) => handleDrop(e, etapa.id)}
                className={`snap-start shrink-0 w-[85vw] sm:w-[60vw] md:w-auto flex flex-col bg-[var(--c-surface)] border rounded-lg min-w-[240px] transition-colors ${
                  isDropTarget
                    ? 'border-[var(--c-muted)] bg-[var(--c-surface-2)]'
                    : 'border-[var(--c-line)]'
                }`}
              >
                {/* Cabecera */}
                <div
                  className="p-3 border-b border-[var(--c-line)] flex items-center justify-between rounded-t-lg"
                  style={{ borderTop: `3px solid ${etapa.color || 'var(--c-line)'}` }}
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: etapa.color || 'var(--c-muted-2)' }}
                        aria-hidden
                      />
                      <span className="font-semibold text-xs text-[var(--c-text)]">
                        {etapa.nombre}
                      </span>
                      <span className="font-mono text-[10px] text-[var(--c-muted)]">
                        ({opsEtapa.length})
                      </span>
                    </div>
                    {/* Cifras en blanco aire */}
                    <p className="font-mono text-[11px] text-[var(--c-text)] font-semibold mt-0.5">
                      {formatMoneda(totalEtapaCLP, 'CLP')}
                    </p>
                    {hayUSD && (
                      <span className="text-[9px] text-[var(--c-muted)] font-mono block">
                        + montos en US$ aparte
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[10px] text-[var(--c-muted-2)]">
                    {etapa.probabilidad_default}%
                  </span>
                </div>

                {/* Tarjetas */}
                <div className="p-2 space-y-2.5 flex-1 min-h-[400px]">
                  {opsEtapa.length === 0 ? (
                    <div className="h-24 border border-dashed border-[var(--c-line)] rounded flex items-center justify-center text-[10px] text-[var(--c-muted-2)] font-mono">
                      Soltar aquí
                    </div>
                  ) : (
                    opsEtapa.map((op) => {
                      const emp = empresas.find((e) => e.id === op.empresa_id);
                      const resp = miembros.find((m) => m.id === op.responsable_id);
                      const fuente = fuentes.find((f) => f.id === op.fuente_id);
                      const calificacion = calificaciones[op.id];
                      const tieneCalificacion = Boolean(calificacion && calificacion.puntaje_maximo > 0);
                      const pctCalificacion = tieneCalificacion
                        ? Math.round((calificacion!.puntaje_total / calificacion!.puntaje_maximo) * 100)
                        : 0;
                      const atrasada =
                        op.estado_seguimiento === 'atrasado' ||
                        (op.proxima_accion_fecha && esFechaAtrasada(op.proxima_accion_fecha));
                      const sinAccion =
                        op.estado_seguimiento === 'sin_accion' ||
                        (!op.proxima_accion_texto?.trim() && !op.proxima_accion_fecha);
                      const esUSD = op.moneda !== 'CLP';
                      const seguimiento = op.estado_seguimiento ? SEGUIMIENTO_UI[op.estado_seguimiento] : undefined;
                      // En ganadas/perdidas el cierre ya ocurrió: no se muestra "vencido".
                      const cerrada = Boolean(etapa.es_ganada || etapa.es_perdida);
                      const diasCierre = cerrada ? null : diasHastaFecha(op.fecha_cierre_estimada);
                      const cierreTexto =
                        diasCierre === null
                          ? null
                          : diasCierre < 0
                            ? `Cierre vencido hace ${-diasCierre} d`
                            : diasCierre === 0
                              ? 'Cierra hoy'
                              : `Faltan ${diasCierre} d`;
                      const cierreTono =
                        diasCierre !== null && diasCierre < 0
                          ? 'text-[var(--c-danger)]'
                          : diasCierre !== null && diasCierre <= 14
                            ? 'text-[var(--c-warn)]'
                            : 'text-[var(--c-muted)]';

                      return (
                        <div
                          key={op.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, op.id)}
                          onClick={() => onSelectOportunidad(op.id)}
                          className={`p-3 rounded-lg border text-left cursor-grab active:cursor-grabbing hover:border-[var(--c-muted)] transition-all bg-[var(--c-surface)] shadow-sm space-y-2.5 ${
                            atrasada
                              ? 'border-[var(--c-danger)] ring-1 ring-[var(--c-danger)]/40'
                              : 'border-[var(--c-line)]'
                          }`}
                        >
                          {/* Cabecera: cliente, correlativo y nombre */}
                          <div className="flex items-start gap-2">
                            {emp && (
                              <LogoEmpresa nombre={emp.nombre} logoPath={emp.logo_path} size={28} className="mt-0.5 shrink-0" />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[10px] text-[var(--c-muted)] font-medium truncate uppercase tracking-wide">
                                  {emp?.nombre ?? 'Sin empresa'}
                                </p>
                                {op.numero ? (
                                  <span className="font-mono text-[10px] text-[var(--c-muted)] shrink-0">
                                    {codigoNegocio(op)}
                                  </span>
                                ) : null}
                              </div>
                              <h4 className="text-xs font-semibold text-[var(--c-text)] leading-snug line-clamp-2">
                                {op.nombre}
                              </h4>
                            </div>
                          </div>

                          {/* Valor neto, ponderado, probabilidad y responsable */}
                          <div className="flex items-end justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-mono text-sm font-bold text-[var(--c-text)] leading-none">
                                {formatMoneda(op.valor_neto, op.moneda)}
                              </p>
                              <p className="font-mono text-[10px] text-[var(--c-muted)] mt-1">
                                Pond. {formatMoneda(op.valor_ponderado, op.moneda)} · {op.probabilidad}%
                              </p>
                              {esUSD && (
                                <p className="text-[9px] text-[var(--c-muted)] font-mono leading-none mt-0.5">
                                  No incluido en totales CLP
                                </p>
                              )}
                            </div>
                            <span className="flex items-center gap-1.5 text-[11px] text-[var(--c-text-2)] shrink-0" title={resp?.nombre ?? 'Equipo'}>
                              <span className="grid place-items-center w-5 h-5 rounded bg-[var(--c-surface-3)] text-[9px] font-bold text-[var(--c-text)]">
                                {iniciales(resp?.nombre)}
                              </span>
                              <span className="truncate max-w-[72px]">{resp?.nombre.split(' ')[0] ?? 'Equipo'}</span>
                            </span>
                          </div>

                          {/* Calificación (vista v_calificacion_oportunidad) */}
                          {tieneCalificacion && calificacion && (
                            <div>
                              <div className="flex items-center justify-between text-[10px] font-mono text-[var(--c-muted)] mb-1">
                                <span>Calificación</span>
                                {calificacion.falla_eliminatorio ? (
                                  <span className="text-[var(--c-danger)] font-semibold">Falla criterio eliminatorio</span>
                                ) : (
                                  <span>{calificacion.puntaje_total}/{calificacion.puntaje_maximo}</span>
                                )}
                              </div>
                              <div className="h-1 rounded-full bg-[var(--c-line)] overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    calificacion.falla_eliminatorio
                                      ? 'bg-[var(--c-danger)]'
                                      : pctCalificacion >= 60
                                        ? 'bg-[var(--c-ok)]'
                                        : 'bg-[var(--c-warn)]'
                                  }`}
                                  style={{ width: `${Math.min(100, Math.max(0, pctCalificacion))}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Señales: seguimiento, cierre y fuente */}
                          {(seguimiento || cierreTexto || fuente) && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {seguimiento && (
                                <ChipSenal tono={seguimiento.tono}>{seguimiento.label}</ChipSenal>
                              )}
                              {cierreTexto && (
                                <span className={`font-mono text-[10px] ${cierreTono}`}>{cierreTexto}</span>
                              )}
                              {fuente && (
                                <ChipSenal tono="neutro" className="ml-auto truncate max-w-[100px] font-normal">
                                  {fuente.nombre}
                                </ChipSenal>
                              )}
                            </div>
                          )}

                          {/* Mover etapa sin arrastrar (móvil) */}
                          <div className="md:hidden" onClick={(ev) => ev.stopPropagation()}>
                            <label className="sr-only" htmlFor={`mover-${op.id}`}>Mover a otra etapa</label>
                            <select
                              id={`mover-${op.id}`}
                              value={op.etapa_id}
                              onChange={(ev) => moverAEtapa(op.id, ev.target.value)}
                              className="w-full min-h-[44px] px-2 text-xs bg-[var(--c-surface)] border border-[var(--c-line)] rounded text-[var(--c-text)]"
                            >
                              {etapas.filter((et) => et.pipeline === pipelineDe(op.etapa_id)).map((et) => (
                                <option key={et.id} value={et.id}>{et.nombre}</option>
                              ))}
                            </select>
                          </div>

                          {/* Siguiente movimiento */}
                          <div
                            className={`rounded-md border px-2 py-1.5 ${
                              atrasada
                                ? 'border-[var(--c-danger)]/50 bg-[var(--c-danger)]/10'
                                : 'border-[var(--c-line)] bg-[var(--c-surface-2)]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--c-muted)]">
                                Siguiente movimiento
                              </span>
                              {op.proxima_accion_fecha && (
                                <span
                                  className={`font-mono text-[10px] flex items-center gap-1 ${
                                    atrasada ? 'text-[var(--c-danger)] font-semibold' : 'text-[var(--c-muted)]'
                                  }`}
                                >
                                  {atrasada ? <AlertCircle className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                                  {formatFecha(op.proxima_accion_fecha)}
                                </span>
                              )}
                            </div>
                            <p
                              className={`text-[11px] truncate mt-0.5 ${
                                sinAccion ? 'text-[var(--c-muted)] italic' : 'text-[var(--c-text)]'
                              }`}
                            >
                              {op.proxima_accion_texto?.trim() || 'Sin próxima acción'}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VISTA TABLA */}
      {vistaModo === 'tabla' && (
        <div className="bg-[var(--c-surface)] border border-[var(--c-line)] rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--c-surface-2)] border-b border-[var(--c-line)] text-[var(--c-muted)] uppercase font-mono text-[11px]">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Oportunidad</th>
                  <th className="py-2.5 px-3 font-medium">Cliente</th>
                  <th className="py-2.5 px-3 font-medium">Etapa</th>
                  <th className="py-2.5 px-3 font-medium text-right">Valor Neto</th>
                  <th className="py-2.5 px-3 font-medium text-right">Ponderado (Base)</th>
                  <th className="py-2.5 px-3 font-medium">Responsable</th>
                  <th className="py-2.5 px-3 font-medium">Próxima Acción</th>
                  <th className="py-2.5 px-4 font-medium text-right">Cierre Est.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--c-line)]">
                {filteredOportunidades.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs text-[var(--c-muted)]">
                      No hay negocios que cumplan con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredOportunidades.map((op) => {
                    const emp = empresas.find((e) => e.id === op.empresa_id);
                    const resp = miembros.find((m) => m.id === op.responsable_id);
                    const et = etapas.find((e) => e.id === op.etapa_id);
                    const atrasada =
                      op.estado_seguimiento === 'atrasado' ||
                      (op.proxima_accion_fecha && esFechaAtrasada(op.proxima_accion_fecha));

                    return (
                      <tr
                        key={op.id}
                        onClick={() => onSelectOportunidad(op.id)}
                        className={`hover:bg-[var(--c-surface-2)] cursor-pointer transition-colors ${
                          atrasada ? 'bg-[var(--c-surface-2)]/40' : ''
                        }`}
                      >
                        <td className="py-2.5 px-4 font-semibold text-[var(--c-text)]">
                          <div className="flex items-center gap-1.5">
                            {atrasada && <AlertCircle className="w-3.5 h-3.5 text-[var(--c-danger)] shrink-0" />}
                            <span className="truncate max-w-[200px]">{op.nombre}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-[var(--c-text-2)]">{emp?.nombre ?? '—'}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-[var(--c-text-2)]">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: et?.color || 'var(--c-muted-2)' }} aria-hidden />
                            {et?.nombre ?? '—'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-xs font-bold text-[var(--c-text)] text-right">
                          {formatMoneda(op.valor_neto, op.moneda)}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-xs text-[var(--c-text)] text-right">
                          {formatMoneda(op.valor_ponderado, op.moneda)}
                        </td>
                        <td className="py-2.5 px-3 text-[var(--c-text-2)]">{resp?.nombre ?? '—'}</td>
                        <td className="py-2.5 px-3 text-[var(--c-text-2)] truncate max-w-[180px]">
                          {op.proxima_accion_texto || <span className="text-[var(--c-muted-2)]">Sin definir</span>}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-[var(--c-muted)] text-right">
                          {formatFecha(op.fecha_cierre_estimada)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Ganado */}
      <ConfirmWonModal
        isOpen={Boolean(opParaGanar)}
        oportunidad={opParaGanar}
        empresa={empresaDeOpParaGanar}
        onConfirm={handleConfirmWon}
        onCancel={() => setOpParaGanar(null)}
      />

      {/* Modal Perdido */}
      <LossReasonModal
        isOpen={Boolean(opParaPerder)}
        oportunidad={opParaPerder}
        motivosPerdida={motivosPerdida}
        onConfirm={handleConfirmLoss}
        onCancel={() => setOpParaPerder(null)}
      />
    </div>
  );
};
