import React, { useState } from 'react';
import { CheckSquare, X } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  empresaIdInicial?: string;
  oportunidadIdInicial?: string;
}

export const NewTaskModal: React.FC<NewTaskModalProps> = ({
  isOpen,
  onClose,
  empresaIdInicial,
  oportunidadIdInicial,
}) => {
  const { empresas, oportunidades, miembros, crearTarea } = useCRM();
  const { currentUser } = useAuth();

  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [empresaId, setEmpresaId] = useState(empresaIdInicial || '');
  const [oportunidadId, setOportunidadId] = useState(oportunidadIdInicial || '');
  const [responsableId, setResponsableId] = useState(currentUser?.id || miembros[0]?.id || 'm-1');
  const [fechaVencimiento, setFechaVencimiento] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [prioridad, setPrioridad] = useState<'alta' | 'media' | 'baja'>('media');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;

    await crearTarea({
      titulo,
      descripcion,
      empresa_id: empresaId || undefined,
      oportunidad_id: oportunidadId || undefined,
      responsable_id: responsableId,
      fecha_vencimiento: fechaVencimiento,
      prioridad,
      completada: false,
    });

    onClose();
    setTitulo('');
    setDescripcion('');
  };

  const oportunidadesFiltradas = empresaId
    ? oportunidades.filter((o) => o.empresa_id === empresaId && !o.archivado)
    : oportunidades.filter((o) => !o.archivado);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#141414] border border-[#2E2E2E] rounded-xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[#BEFF00]/15 flex items-center justify-center text-[#BEFF00]">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#F5F5F5]">Nueva Tarea</h2>
              <p className="text-xs text-[#8E8E93]">Compromiso comercial u operativo</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#888] hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-[#EEE] mb-1">
              Título de la tarea <span className="text-[#BEFF00]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Enviar propuesta de inversión en medios revisada"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full bg-[#1C1C1C] border border-[#2E2E2E] rounded px-3 py-2 text-xs text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#CCC] mb-1">Empresa</label>
              <select
                value={empresaId}
                onChange={(e) => setEmpresaId(e.target.value)}
                className="w-full bg-[#1C1C1C] border border-[#2E2E2E] rounded px-3 py-2 text-xs text-white"
              >
                <option value="">(Opcional) Empresa...</option>
                {empresas.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#CCC] mb-1">Negocio</label>
              <select
                value={oportunidadId}
                onChange={(e) => setOportunidadId(e.target.value)}
                className="w-full bg-[#1C1C1C] border border-[#2E2E2E] rounded px-3 py-2 text-xs text-white"
              >
                <option value="">(Opcional) Negocio...</option>
                {oportunidadesFiltradas.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#CCC] mb-1">Responsable</label>
              <select
                value={responsableId}
                onChange={(e) => setResponsableId(e.target.value)}
                className="w-full bg-[#1C1C1C] border border-[#2E2E2E] rounded px-3 py-2 text-xs text-white"
              >
                {miembros.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#CCC] mb-1">Prioridad</label>
              <select
                value={prioridad}
                onChange={(e) => setPrioridad(e.target.value as any)}
                className="w-full bg-[#1C1C1C] border border-[#2E2E2E] rounded px-3 py-2 text-xs text-white"
              >
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#CCC] mb-1">
              Fecha de Vencimiento <span className="text-[#BEFF00]">*</span>
            </label>
            <input
              type="date"
              required
              value={fechaVencimiento}
              onChange={(e) => setFechaVencimiento(e.target.value)}
              className="w-full bg-[#1C1C1C] border border-[#2E2E2E] rounded px-3 py-1.5 text-xs text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#CCC] mb-1">
              Instrucciones / Notas adicionales
            </label>
            <textarea
              rows={2}
              placeholder="Detalle o enlaces de referencia..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full bg-[#1C1C1C] border border-[#2E2E2E] rounded p-2 text-xs text-white"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-[#262626]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs text-[#888] hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold bg-[#BEFF00] text-black rounded"
            >
              Guardar Tarea
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
