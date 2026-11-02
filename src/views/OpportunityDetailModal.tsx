import React, { useState, useEffect } from 'react';
import {
  X,
  Kanban,
  Building2,
  Calendar,
  AlertTriangle,
  Clock,
  CheckSquare,
  ShieldAlert,
  Plus,
  Archive,
} from 'lucide-react';
import { CriterioCalificacion } from '../types/crm';
import { useCRM } from '../context/CRMContext';
import { formatFecha, formatMoneda, esFechaAtrasada } from '../lib/formatters';

interface OpportunityDetailModalProps {
  oportunidadId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectEmpresa: (id: string) => void;
  onOpenNewActivity: (empresaId?: string, oportunidadId?: string) => void;
  onOpenNewTask: (empresaId?: string, oportunidadId?: string) => void;
}

export const OpportunityDetailModal: React.FC<OpportunityDetailModalProps> = ({
  oportunidadId,
  isOpen,
  onClose,
  onSelectEmpresa,
  onOpenNewActivity,
  onOpenNewTask,
}) => {
  const {
    oportunidades,
    empresas,
    contactos,
    etapas,
    miembros,
    plantilla,
    criterios,
    calificaciones,
    actividades,
    tareas,
    evaluarCriterio,
    cargarCalificacionOportunidad,
    actualizarProximaAccion,
    moverOportunidadEtapa,
    archivarOportunidad,
    toggleTareaCompletada,
  } = useCRM();

  const oportunidad = oportunidades.find((o) => o.id === oportunidadId);

  // Cargar calificación desde la vista v_calificacion_oportunidad al abrir
  useEffect(() => {
    if (oportunidadId && isOpen) {
      cargarCalificacionOportunidad(oportunidadId);
    }
  }, [oportunidadId, isOpen, cargarCalificacionOportunidad]);

  const [editingAccion, setEditingAccion] = useState(false);
  const [accionTexto, setAccionTexto] = useState('');
  const [accionFecha, setAccionFecha] = useState('');

  // Excepción en criterio eliminatorio
  const [excepcionCriterio, setExcepcionCriterio] = useState<{
    criterio: CriterioCalificacion;
    valor: string;
  } | null>(null);
  const [motivoExcepcion, setMotivoExcepcion] = useState('');
  const [fechaRevisionExcepcion, setFechaRevisionExcepcion] = useState('');
  const [errorExcepcion, setErrorExcepcion] = useState('');

  if (!isOpen || !oportunidad) return null;

  const empresa = empresas.find((e) => e.id === oportunidad.empresa_id);
  const responsable = miembros.find((m) => m.id === oportunidad.responsable_id);
  const actividadesOp = actividades.filter((a) => a.oportunidad_id === oportunidad.id);
  const tareasOp = tareas.filter((t) => t.oportunidad_id === oportunidad.id);

  // Calificación desde vista v_calificacion_oportunidad
  const calificacion = calificaciones[oportunidad.id];
  const fallaEliminatorio = Boolean(calificacion?.falla_eliminatorio);

  const criteriosOrdenados = [...criterios].sort((a, b) => a.orden - b.orden);

  const handleSaveProximaAccion = async () => {
    await actualizarProximaAccion(oportunidad.id, accionTexto, accionFecha);
    setEditingAccion(false);
  };

  const handleStartEditAccion = () => {
    setAccionTexto(oportunidad.proxima_accion_texto || '');
    setAccionFecha(oportunidad.proxima_accion_fecha || '');
    setEditingAccion(true);
  };

  const handleRespuestaCriterio = async (criterio: CriterioCalificacion, valor: string) => {
    // Si es criterio eliminatorio y no cumple ('no' o '1'/'2'), requiere excepción
    const noCumple = criterio.es_eliminatorio && (valor === 'no' || Number(valor) <= 2);

    if (noCumple) {
      setExcepcionCriterio({ criterio, valor });
      setMotivoExcepcion('');
      setFechaRevisionExcepcion(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
      return;
    }

    await evaluarCriterio(oportunidad.id, criterio.id, valor);
  };

  const handleGuardarExcepcion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivoExcepcion.trim() || !fechaRevisionExcepcion) {
      setErrorExcepcion('Debes ingresar obligatoriamente el motivo y la fecha de revisión.');
      return;
    }

    if (!excepcionCriterio) return;

    await evaluarCriterio(oportunidad.id, excepcionCriterio.criterio.id, excepcionCriterio.valor, {
      motivo: motivoExcepcion,
      fechaRevision: fechaRevisionExcepcion,
    });

    setExcepcionCriterio(null);
    setErrorExcepcion('');
  };

  const handleArchive = async () => {
    if (window.confirm('¿Deseas archivar esta oportunidad?')) {
      await archivarOportunidad(oportunidad.id);
      onClose();
    }
  };

  const atrasada =
    oportunidad.estado_seguimiento === 'atrasado' ||
    (oportunidad.proxima_accion_fecha && esFechaAtrasada(oportunidad.proxima_accion_fecha));

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#121212] dark:bg-[#121212] light:bg-white border border-[#262626] rounded-xl max-w-4xl w-full h-[90vh] shadow-2xl flex flex-col justify-between overflow-hidden">
        {/* Header Ficha */}
        <div className="p-5 border-b border-[#262626] flex items-start justify-between bg-[#0E0E0E]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded bg-[#1C1C1C] border border-[#2A2A2A] flex items-center justify-center text-[#F5F5F5]">
              <Kanban className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#F5F5F5]">{oportunidad.nombre}</h2>
                <span className="font-mono text-xs text-[#F5F5F5] font-bold">
                  {formatMoneda(oportunidad.valor_neto, oportunidad.moneda)}
                </span>
                {oportunidad.moneda === 'USD' && (
                  <span className="text-[10px] text-[#888] font-mono">(No suma a CLP)</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-[#8E8E93] mt-1 font-mono">
                {empresa && (
                  <button
                    onClick={() => {
                      onClose();
                      onSelectEmpresa(empresa.id);
                    }}
                    className="hover:text-white flex items-center gap-1 font-sans"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{empresa.nombre}</span>
                  </button>
                )}
                <span>·</span>
                <span>Responsable: {responsable?.nombre ?? 'Sin asignar'}</span>
                <span>·</span>
                <span>Cierre est: {formatFecha(oportunidad.fecha_cierre_estimada)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleArchive}
              className="p-1.5 text-[#8E8E93] hover:text-[#E8005A] rounded transition-colors"
              title="Archivar"
            >
              <Archive className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-1.5 text-[#8E8E93] hover:text-white rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Alerta de Criterio Eliminatorio (v_calificacion_oportunidad.falla_eliminatorio) */}
        {fallaEliminatorio && (
          <div className="px-5 py-3 bg-[#241015] border-b border-[#E8005A]/40 text-[#FFA0B5] text-xs flex items-center justify-between">
            <div className="flex items-center gap-2 font-medium">
              <ShieldAlert className="w-4 h-4 text-[#E8005A]" />
              <span>
                Fallo de criterio eliminatorio: la oportunidad no cumple los requisitos base de P48.
                Se requiere registrar una excepción para continuar.
              </span>
            </div>
          </div>
        )}

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Próxima Acción */}
            <div
              className={`p-4 rounded-lg border transition-colors ${
                atrasada ? 'bg-[#1C1115] border-[#E8005A]' : 'bg-[#161616] border-[#262626]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clock className={`w-4 h-4 ${atrasada ? 'text-[#E8005A]' : 'text-[#888]'}`} />
                  <h3 className="text-xs font-semibold text-[#F5F5F5]">Próxima Acción Comercial</h3>
                </div>

                {!editingAccion && (
                  <button
                    onClick={handleStartEditAccion}
                    className="text-xs text-[#AAA] hover:underline font-mono"
                  >
                    Actualizar
                  </button>
                )}
              </div>

              {editingAccion ? (
                <div className="space-y-2 pt-1">
                  <input
                    type="text"
                    value={accionTexto}
                    onChange={(e) => setAccionTexto(e.target.value)}
                    placeholder="Próxima acción comercial..."
                    className="w-full bg-[#111] border border-[#333] rounded px-3 py-1.5 text-xs text-white"
                  />
                  <div className="flex items-center justify-between gap-3">
                    <input
                      type="date"
                      value={accionFecha}
                      onChange={(e) => setAccionFecha(e.target.value)}
                      className="bg-[#111] border border-[#333] rounded px-3 py-1.5 text-xs text-white font-mono"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingAccion(false)}
                        className="px-2.5 py-1 text-xs text-[#888] hover:text-white"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSaveProximaAccion}
                        className="px-3 py-1 text-xs font-semibold bg-[#BEFF00] text-black rounded"
                      >
                        Guardar
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs space-y-1">
                  <p className="text-[#DDD] font-medium">
                    {oportunidad.proxima_accion_texto || 'Sin próxima acción definida.'}
                  </p>
                  <p className="text-[11px] font-mono text-[#8E8E93] flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#666]" />
                    <span>Fecha: {formatFecha(oportunidad.proxima_accion_fecha)}</span>
                    {atrasada && <span className="text-[#E8005A] font-bold ml-2">¡ATRASADO!</span>}
                  </p>
                </div>
              )}
            </div>

            {/* Calificación según plantilla activa (criterios en orden) */}
            <div className="bg-[#161616] p-4 rounded-lg border border-[#262626] space-y-4">
              <div className="flex items-center justify-between border-b border-[#262626] pb-3">
                <div>
                  <h3 className="text-xs font-semibold text-[#F5F5F5]">
                    {plantilla?.nombre || 'Calificación de Oportunidad'}
                  </h3>
                  <p className="text-[11px] text-[#8E8E93]">
                    {plantilla?.descripcion || 'Validación según criterios de la plantilla activa'}
                  </p>
                </div>

                {/* Puntaje desde v_calificacion_oportunidad */}
                <div className="text-right">
                  <p className="text-[10px] text-[#8E8E93] font-mono uppercase">Puntaje Base</p>
                  <p className="font-mono text-sm font-bold text-[#F5F5F5]">
                    {calificacion?.puntaje_total ?? 0}{' '}
                    <span className="text-xs text-[#666]">
                      / {calificacion?.puntaje_maximo ?? 100} pts
                    </span>
                  </p>
                </div>
              </div>

              {/* Lista de criterios ordenados */}
              <div className="space-y-3">
                {criteriosOrdenados.map((crit, idx) => (
                  <div
                    key={crit.id}
                    className="p-3 rounded border border-[#262626] bg-[#111111] text-xs space-y-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-[#777]">0{idx + 1}.</span>
                          <span className="font-medium text-[#EEE]">{crit.pregunta}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-[#8E8E93] mt-0.5">
                          <span>Peso: {crit.peso} pts</span>
                          {crit.es_eliminatorio && (
                            <span className="text-[#E8005A] font-semibold">
                              · Criterio Eliminatorio
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Botones de respuesta (guarda sin puntaje_obtenido) */}
                      <div className="shrink-0 flex items-center gap-1">
                        {crit.tipo === 'si_no' ? (
                          <div className="flex items-center gap-1 bg-[#1C1C1C] p-0.5 rounded border border-[#2E2E2E]">
                            <button
                              onClick={() => handleRespuestaCriterio(crit, 'si')}
                              className="px-2.5 py-1 rounded font-mono text-xs text-[#BBB] hover:text-white hover:bg-[#333]"
                            >
                              Sí
                            </button>
                            <button
                              onClick={() => handleRespuestaCriterio(crit, 'no')}
                              className="px-2.5 py-1 rounded font-mono text-xs text-[#BBB] hover:text-white hover:bg-[#333]"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 bg-[#1C1C1C] p-0.5 rounded border border-[#2E2E2E]">
                            {['1', '2', '3', '4', '5'].map((num) => (
                              <button
                                key={num}
                                onClick={() => handleRespuestaCriterio(crit, num)}
                                className="w-6 h-6 rounded font-mono text-xs flex items-center justify-center text-[#BBB] hover:text-white hover:bg-[#333]"
                              >
                                {num}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Columna Derecha */}
          <div className="space-y-6">
            {/* Etapa */}
            <div className="p-4 bg-[#161616] rounded-lg border border-[#262626] space-y-3">
              <h3 className="text-xs font-semibold text-[#F5F5F5]">Etapa Comercial</h3>
              <select
                value={oportunidad.etapa_id}
                onChange={(e) => moverOportunidadEtapa(oportunidad.id, e.target.value)}
                className="w-full bg-[#111] border border-[#2E2E2E] rounded px-3 py-2 text-xs text-white font-mono"
              >
                {etapas.map((et) => (
                  <option key={et.id} value={et.id}>
                    {et.nombre} ({et.probabilidad_default}%)
                  </option>
                ))}
              </select>

              <div className="text-[11px] font-mono text-[#8E8E93] pt-1">
                <p>
                  Ponderado (Base): {formatMoneda(oportunidad.valor_ponderado, oportunidad.moneda)}
                </p>
              </div>
            </div>

            {/* Tareas */}
            <div className="p-4 bg-[#161616] rounded-lg border border-[#262626] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-[#F5F5F5]">Tareas ({tareasOp.length})</h3>
                <button
                  onClick={() => onOpenNewTask(oportunidad.empresa_id, oportunidad.id)}
                  className="text-xs text-[#0A0A0A] bg-[#BEFF00] hover:bg-[#aee600] px-2 py-0.5 rounded font-medium flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Tarea</span>
                </button>
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto">
                {tareasOp.length === 0 ? (
                  <p className="text-[11px] text-[#777] text-center py-2">Sin tareas asociadas.</p>
                ) : (
                  tareasOp.map((t) => (
                    <div
                      key={t.id}
                      className="p-2 bg-[#111] rounded border border-[#262626] flex items-center justify-between text-xs"
                    >
                      <button
                        onClick={() => toggleTareaCompletada(t.id!, t.completada)}
                        className="flex items-center gap-2 text-left"
                      >
                        <CheckSquare
                          className={`w-3.5 h-3.5 ${t.completada ? 'text-white' : 'text-[#666]'}`}
                        />
                        <span
                          className={`text-[11px] ${
                            t.completada ? 'line-through text-[#666]' : 'text-[#DDD]'
                          }`}
                        >
                          {t.titulo}
                        </span>
                      </button>
                      <span className="font-mono text-[10px] text-[#888]">
                        {formatFecha(t.fecha_vencimiento)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Actividades */}
            <div className="p-4 bg-[#161616] rounded-lg border border-[#262626] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-[#F5F5F5]">
                  Actividades ({actividadesOp.length})
                </h3>
                <button
                  onClick={() => onOpenNewActivity(oportunidad.empresa_id, oportunidad.id)}
                  className="text-xs text-[#0A0A0A] bg-[#BEFF00] hover:bg-[#aee600] px-2 py-0.5 rounded font-medium flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Actividad</span>
                </button>
              </div>

              <div className="space-y-2 max-h-44 overflow-y-auto">
                {actividadesOp.length === 0 ? (
                  <p className="text-[11px] text-[#777] text-center py-2">Sin actividades aún.</p>
                ) : (
                  actividadesOp.map((act) => (
                    <div
                      key={act.id}
                      className="p-2 bg-[#111] rounded border border-[#262626] text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-medium text-[#EEE] capitalize">{act.tipo}</span>
                        <span className="font-mono text-[10px] text-[#777]">
                          {formatFecha(act.fecha_actividad)}
                        </span>
                      </div>
                      <p className="text-[#AAA] text-[11px]">{act.titulo}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal de Excepción */}
        {excepcionCriterio && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#141414] border border-[#E8005A] rounded-lg max-w-md w-full p-6 shadow-2xl">
              <div className="flex items-center gap-2 mb-3 text-[#E8005A]">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="text-sm font-bold text-white">Excepción a Criterio Eliminatorio</h3>
              </div>

              <p className="text-xs text-[#CCC] mb-3">
                Criterio: &quot;{excepcionCriterio.criterio.pregunta}&quot;
              </p>

              <form onSubmit={handleGuardarExcepcion} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[#EEE] mb-1">
                    Motivo justificado de la excepción <span className="text-[#E8005A]">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Fundamento obligatorio para autorizar el avance..."
                    value={motivoExcepcion}
                    onChange={(e) => setMotivoExcepcion(e.target.value)}
                    className="w-full bg-[#1C1C1C] border border-[#333] rounded p-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#EEE] mb-1">
                    Fecha de revisión obligatoria <span className="text-[#E8005A]">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={fechaRevisionExcepcion}
                    onChange={(e) => setFechaRevisionExcepcion(e.target.value)}
                    className="w-full bg-[#1C1C1C] border border-[#333] rounded px-3 py-1.5 text-xs text-white font-mono"
                  />
                </div>

                {errorExcepcion && (
                  <p className="text-xs text-[#E8005A] font-medium">{errorExcepcion}</p>
                )}

                <div className="flex justify-end gap-2 pt-3 border-t border-[#222]">
                  <button
                    type="button"
                    onClick={() => setExcepcionCriterio(null)}
                    className="px-3 py-1.5 text-xs text-[#888] hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 text-xs font-semibold bg-[#BEFF00] text-black rounded"
                  >
                    Guardar Excepción
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-[#262626] bg-[#0E0E0E] flex items-center justify-between text-xs text-[#8E8E93]">
          <span className="font-mono text-[11px]">ID: {oportunidad.id}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#222] hover:bg-[#2E2E2E] text-white rounded transition-colors"
          >
            Cerrar Ficha
          </button>
        </div>
      </div>
    </div>
  );
};
