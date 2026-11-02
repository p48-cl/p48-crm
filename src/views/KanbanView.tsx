import React, { useState, useMemo } from 'react';
import {
  Kanban,
  Table as TableIcon,
  Plus,
  AlertCircle,
  Clock,
  User,
  Filter,
  Calendar,
} from 'lucide-react';
import { VOportunidad } from '../types/crm';
import { useCRM } from '../context/CRMContext';
import { formatMoneda, formatFecha, esFechaAtrasada } from '../lib/formatters';
import { ConfirmWonModal } from '../components/common/ConfirmWonModal';
import { LossReasonModal } from '../components/common/LossReasonModal';

interface KanbanViewProps {
  onSelectOportunidad: (id: string) => void;
  onOpenNewDeal: () => void;
}

export const KanbanView: React.FC<KanbanViewProps> = ({
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
  } = useCRM();

  const [vistaModo, setVistaModo] = useState<'kanban' | 'tabla'>('kanban');

  // Filtros
  const [filtroResponsable, setFiltroResponsable] = useState<string>('todos');
  const [filtroFuente, setFiltroFuente] = useState<string>('todos');
  const [filtroEtapa, setFiltroEtapa] = useState<string>('todos');
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
  }, [oportunidades, filtroResponsable, filtroFuente, filtroEtapa, filtroSeguimiento]);

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
    const etapaGanada = etapas.find((e) => e.es_ganada);
    if (etapaGanada) {
      await moverOportunidadEtapa(opParaGanar.id, etapaGanada.id);
    }
    setOpParaGanar(null);
  };

  const handleConfirmLoss = async (motivoId: string, detalle: string) => {
    if (!opParaPerder) return;
    const etapaPerdida = etapas.find((e) => e.es_perdida);
    if (etapaPerdida) {
      await moverOportunidadEtapa(opParaPerder.id, etapaPerdida.id, motivoId, detalle);
    }
    setOpParaPerder(null);
  };

  const empresaDeOpParaGanar = empresas.find((e) => e.id === opParaGanar?.empresa_id);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Header del CRM */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-sans text-[#F5F5F5] dark:text-[#F5F5F5] light:text-[#111]">
            Pipeline de Negocios
          </h1>
          <p className="text-xs text-[#8E8E93] mt-0.5">
            Gestión comercial basada en vista calculada de Supabase
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center p-0.5 bg-[#161616] dark:bg-[#161616] light:bg-[#EAEAEA] border border-[#2E2E2E] rounded text-xs">
            <button
              onClick={() => setVistaModo('kanban')}
              className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors ${
                vistaModo === 'kanban'
                  ? 'bg-[#2A2A2A] text-[#F5F5F5] font-medium shadow-sm'
                  : 'text-[#8E8E93] hover:text-[#CCC]'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Tablero Kanban</span>
            </button>
            <button
              onClick={() => setVistaModo('tabla')}
              className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors ${
                vistaModo === 'tabla'
                  ? 'bg-[#2A2A2A] text-[#F5F5F5] font-medium shadow-sm'
                  : 'text-[#8E8E93] hover:text-[#CCC]'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Vista Tabla</span>
            </button>
          </div>

          {/* Botón Principal (ÚNICO Lima #BEFF00) */}
          <button
            onClick={onOpenNewDeal}
            className="bg-[#BEFF00] hover:bg-[#aee600] active:scale-[0.98] text-[#0A0A0A] font-semibold text-xs py-2 px-3.5 rounded flex items-center gap-1.5 transition-all shadow-sm font-sans"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nueva Oportunidad</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-wrap items-center gap-3 bg-[#141414] dark:bg-[#141414] light:bg-[#FAFAFA] p-3 rounded-lg border border-[#262626]">
        <div className="flex items-center gap-1.5 text-xs text-[#8E8E93]">
          <Filter className="w-3.5 h-3.5 text-[#777]" />
          <span>Filtros:</span>
        </div>

        <select
          value={filtroResponsable}
          onChange={(e) => setFiltroResponsable(e.target.value)}
          className="bg-[#1C1C1C] border border-[#2E2E2E] rounded px-2.5 py-1.5 text-xs text-[#EEE] focus:outline-none"
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
          className="bg-[#1C1C1C] border border-[#2E2E2E] rounded px-2.5 py-1.5 text-xs text-[#EEE] focus:outline-none"
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
          className="bg-[#1C1C1C] border border-[#2E2E2E] rounded px-2.5 py-1.5 text-xs text-[#EEE] focus:outline-none"
        >
          <option value="todos">Todos los seguimientos</option>
          <option value="al_dia">Al día</option>
          <option value="por_vencer">Por vencer hoy</option>
          <option value="atrasado">Atrasados</option>
          <option value="sin_accion">Sin próxima acción</option>
        </select>

        <div className="ml-auto text-xs text-[#8E8E93] font-mono">
          Mostrando {filteredOportunidades.length} negocios
        </div>
      </div>

      {/* VISTA KANBAN */}
      {vistaModo === 'kanban' && (
        <div className="flex md:grid md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto snap-x snap-mandatory pb-6">
          {etapas.map((etapa) => {
            const opsEtapa = filteredOportunidades.filter((o) => o.etapa_id === etapa.id);
            const totalEtapaCLP = opsEtapa
              .filter((o) => o.moneda === 'CLP')
              .reduce((sum, o) => sum + (o.valor_ponderado || 0), 0);
            const hayUSD = opsEtapa.some((o) => o.moneda === 'USD');
            const isDropTarget = dragOverEtapaId === etapa.id;

            return (
              <div
                key={etapa.id}
                onDragOver={(e) => handleDragOver(e, etapa.id)}
                onDrop={(e) => handleDrop(e, etapa.id)}
                className={`snap-start shrink-0 w-[85vw] sm:w-[60vw] md:w-auto flex flex-col bg-[#111111] dark:bg-[#111111] light:bg-[#F5F5F5] border rounded-lg min-w-[240px] transition-colors ${
                  isDropTarget
                    ? 'border-[#888] bg-[#1A1A1A]'
                    : 'border-[#262626] dark:border-[#262626] light:border-[#DDD]'
                }`}
              >
                {/* Cabecera */}
                <div className="p-3 border-b border-[#222] dark:border-[#222] light:border-[#DDD] flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs text-[#F5F5F5] dark:text-[#F5F5F5] light:text-[#111]">
                        {etapa.nombre}
                      </span>
                      <span className="font-mono text-[10px] text-[#8E8E93]">
                        ({opsEtapa.length})
                      </span>
                    </div>
                    {/* Cifras en blanco aire */}
                    <p className="font-mono text-[11px] text-[#F5F5F5] font-semibold mt-0.5">
                      {formatMoneda(totalEtapaCLP, 'CLP')}
                    </p>
                    {hayUSD && (
                      <span className="text-[9px] text-[#8E8E93] font-mono block">
                        + montos en US$ aparte
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[10px] text-[#666]">
                    {etapa.probabilidad_default}%
                  </span>
                </div>

                {/* Tarjetas */}
                <div className="p-2 space-y-2.5 flex-1 min-h-[400px]">
                  {opsEtapa.length === 0 ? (
                    <div className="h-24 border border-dashed border-[#222] rounded flex items-center justify-center text-[10px] text-[#555] font-mono">
                      Soltar aquí
                    </div>
                  ) : (
                    opsEtapa.map((op) => {
                      const emp = empresas.find((e) => e.id === op.empresa_id);
                      const resp = miembros.find((m) => m.id === op.responsable_id);
                      const atrasada =
                        op.estado_seguimiento === 'atrasado' ||
                        (op.proxima_accion_fecha && esFechaAtrasada(op.proxima_accion_fecha));
                      const sinAccion =
                        op.estado_seguimiento === 'sin_accion' ||
                        (!op.proxima_accion_texto?.trim() && !op.proxima_accion_fecha);
                      const esUSD = op.moneda === 'USD';

                      return (
                        <div
                          key={op.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, op.id)}
                          onClick={() => onSelectOportunidad(op.id)}
                          className={`p-3 rounded-lg border text-left cursor-grab active:cursor-grabbing hover:border-[#444] transition-all bg-[#171717] dark:bg-[#171717] light:bg-white shadow-sm ${
                            atrasada
                              ? 'border-[#E8005A] ring-1 ring-[#E8005A]/40'
                              : 'border-[#262626] dark:border-[#262626] light:border-[#E5E5E5]'
                          }`}
                        >
                          <div className="mb-2">
                            <p className="text-[11px] text-[#8E8E93] font-medium truncate">
                              {emp?.nombre ?? 'Sin empresa'}
                            </p>
                            <h4 className="text-xs font-semibold text-[#F5F5F5] dark:text-[#F5F5F5] light:text-[#111] hover:text-[#FFF] transition-colors leading-snug line-clamp-2">
                              {op.nombre}
                            </h4>
                          </div>

                          {/* Valor neto en Blanco Aire #F5F5F5 & Aviso USD */}
                          <div className="flex items-center justify-between mb-2 pt-1 border-t border-[#222] dark:border-[#222] light:border-[#EEE]">
                            <div>
                              <span className="font-mono text-xs font-bold text-[#F5F5F5]">
                                {formatMoneda(op.valor_neto, op.moneda)}
                              </span>
                              {esUSD && (
                                <p className="text-[9px] text-[#888] font-mono leading-none mt-0.5">
                                  No incluido en totales CLP
                                </p>
                              )}
                            </div>

                            <span className="text-[11px] text-[#BBB] flex items-center gap-1">
                              <User className="w-3 h-3 text-[#777]" />
                              <span className="truncate max-w-[80px]">
                                {resp?.nombre.split(' ')[0] ?? 'Equipo'}
                              </span>
                            </span>
                          </div>

                          {/* Próxima Acción */}
                          <div className="pt-1.5 border-t border-[#222] text-[11px]">
                            {atrasada ? (
                              <div className="text-[#E8005A] space-y-0.5">
                                <div className="flex items-center gap-1 font-semibold text-[10px] font-mono">
                                  <AlertCircle className="w-3 h-3 text-[#E8005A]" />
                                  <span>ACCIÓN ATRASADA ({formatFecha(op.proxima_accion_fecha)})</span>
                                </div>
                                <p className="text-[#F5F5F5] text-[11px] truncate">
                                  {op.proxima_accion_texto || 'Revisar seguimiento'}
                                </p>
                              </div>
                            ) : sinAccion ? (
                              <div className="text-[#888] flex items-center gap-1 text-[10px] font-mono">
                                <Clock className="w-3 h-3 shrink-0" />
                                <span>Sin próxima acción</span>
                              </div>
                            ) : (
                              <div className="text-[#AAA] space-y-0.5">
                                <p className="text-[#8E8E93] font-mono text-[10px] flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-[#666]" />
                                  <span>{formatFecha(op.proxima_accion_fecha)}</span>
                                </p>
                                <p className="truncate text-[#DDD]">{op.proxima_accion_texto}</p>
                              </div>
                            )}
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
        <div className="bg-[#141414] dark:bg-[#141414] light:bg-white border border-[#262626] rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0E0E0E] dark:bg-[#0E0E0E] light:bg-[#F2F2F2] border-b border-[#262626] text-[#8E8E93] uppercase font-mono text-[11px]">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Oportunidad</th>
                  <th className="py-2.5 px-3 font-medium">Empresa</th>
                  <th className="py-2.5 px-3 font-medium">Etapa</th>
                  <th className="py-2.5 px-3 font-medium text-right">Valor Neto</th>
                  <th className="py-2.5 px-3 font-medium text-right">Ponderado (Base)</th>
                  <th className="py-2.5 px-3 font-medium">Responsable</th>
                  <th className="py-2.5 px-3 font-medium">Próxima Acción</th>
                  <th className="py-2.5 px-4 font-medium text-right">Cierre Est.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222]">
                {filteredOportunidades.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs text-[#777]">
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
                        className={`hover:bg-[#1C1C1C] cursor-pointer transition-colors ${
                          atrasada ? 'bg-[#1D1014]/40' : ''
                        }`}
                      >
                        <td className="py-2.5 px-4 font-semibold text-[#F5F5F5]">
                          <div className="flex items-center gap-1.5">
                            {atrasada && <AlertCircle className="w-3.5 h-3.5 text-[#E8005A] shrink-0" />}
                            <span className="truncate max-w-[200px]">{op.nombre}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-[#CCC]">{emp?.nombre ?? '—'}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-[#DDD]">{et?.nombre ?? '—'}</td>
                        <td className="py-2.5 px-3 font-mono text-xs font-bold text-[#F5F5F5] text-right">
                          {formatMoneda(op.valor_neto, op.moneda)}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-xs text-[#F5F5F5] text-right">
                          {formatMoneda(op.valor_ponderado, op.moneda)}
                        </td>
                        <td className="py-2.5 px-3 text-[#AAA]">{resp?.nombre ?? '—'}</td>
                        <td className="py-2.5 px-3 text-[#CCC] truncate max-w-[180px]">
                          {op.proxima_accion_texto || <span className="text-[#666]">Sin definir</span>}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-[#777] text-right">
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
