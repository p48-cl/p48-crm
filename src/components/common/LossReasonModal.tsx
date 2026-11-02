import React, { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { Oportunidad, CatalogoItem } from '../../types/crm';

interface LossReasonModalProps {
  isOpen: boolean;
  oportunidad: Oportunidad | null;
  motivosPerdida: CatalogoItem[];
  onConfirm: (motivoId: string, detalle: string) => void;
  onCancel: () => void;
}

export const LossReasonModal: React.FC<LossReasonModalProps> = ({
  isOpen,
  oportunidad,
  motivosPerdida,
  onConfirm,
  onCancel,
}) => {
  const [selectedMotivoId, setSelectedMotivoId] = useState<string>('');
  const [detalle, setDetalle] = useState<string>('');
  const [errorValidacion, setErrorValidacion] = useState<string>('');

  if (!isOpen || !oportunidad) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMotivoId) {
      setErrorValidacion('Debes seleccionar obligatoriamente un motivo de pérdida.');
      return;
    }
    setErrorValidacion('');
    onConfirm(selectedMotivoId, detalle);
    setSelectedMotivoId('');
    setDetalle('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#141414] dark:bg-[#141414] light:bg-white border border-[#2E2E2E] dark:border-[#2E2E2E] light:border-[#DDD] rounded-lg max-w-md w-full p-6 shadow-2xl relative">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-[#8E8E93] hover:text-[#F5F5F5] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[#E8005A]/15 flex items-center justify-center text-[#E8005A]">
            <AlertCircle className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[#F5F5F5] dark:text-[#F5F5F5] light:text-[#111]">
              Registrar Negocio como Perdido
            </h3>
            <p className="text-xs text-[#8E8E93]">Requisito obligatorio para el análisis comercial</p>
          </div>
        </div>

        <p className="text-xs text-[#BBB] mb-3">
          Oportunidad: <span className="text-[#FFF] font-medium">{oportunidad.nombre}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#F5F5F5] mb-1.5">
              Motivo de pérdida <span className="text-[#E8005A]">*</span>
            </label>
            <select
              value={selectedMotivoId}
              onChange={(e) => {
                setSelectedMotivoId(e.target.value);
                if (errorValidacion) setErrorValidacion('');
              }}
              className="w-full bg-[#1C1C1C] dark:bg-[#1C1C1C] light:bg-[#FAFAFA] border border-[#333] rounded px-3 py-2 text-xs text-[#F5F5F5] dark:text-[#F5F5F5] light:text-[#111] focus:outline-none focus:border-[#E8005A]"
            >
              <option value="">Selecciona el motivo...</option>
              {motivosPerdida
                .filter((m) => m.activo)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#CCC] mb-1.5">
              Detalle o aprendizaje (opcional)
            </label>
            <textarea
              rows={3}
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
              placeholder="Ej: El cliente optó por agencia tradicional con fee más bajo sin foco en ROAS..."
              className="w-full bg-[#1C1C1C] dark:bg-[#1C1C1C] light:bg-[#FAFAFA] border border-[#333] rounded p-2.5 text-xs text-[#F5F5F5] dark:text-[#F5F5F5] light:text-[#111] placeholder:text-[#666] focus:outline-none focus:border-[#888]"
            />
          </div>

          {errorValidacion && (
            <p className="text-xs text-[#E8005A] font-medium">{errorValidacion}</p>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-2 text-xs text-[#8E8E93] hover:text-[#FFF] rounded hover:bg-[#202020] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold bg-[#E8005A] hover:bg-[#c9004d] text-white rounded transition-colors"
            >
              Guardar como Perdido
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
