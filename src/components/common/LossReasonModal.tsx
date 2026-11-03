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
      <div className="bg-[var(--c-surface)] dark:bg-[var(--c-surface)] light:bg-white border border-[var(--c-line)] dark:border-[var(--c-line)] light:border-[var(--c-line)] rounded-lg max-w-md w-full p-6 shadow-2xl relative">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-[var(--c-muted)] hover:text-[var(--c-text)] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[var(--c-danger)]/15 flex items-center justify-center text-[var(--c-danger)]">
            <AlertCircle className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[var(--c-text)] dark:text-[var(--c-text)] light:text-[var(--c-text)]">
              Registrar Negocio como Perdido
            </h3>
            <p className="text-xs text-[var(--c-muted)]">Requisito obligatorio para el análisis comercial</p>
          </div>
        </div>

        <p className="text-xs text-[var(--c-text-2)] mb-3">
          Oportunidad: <span className="text-[var(--c-on-accent)] font-medium">{oportunidad.nombre}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--c-text)] mb-1.5">
              Motivo de pérdida <span className="text-[var(--c-danger)]">*</span>
            </label>
            <select
              value={selectedMotivoId}
              onChange={(e) => {
                setSelectedMotivoId(e.target.value);
                if (errorValidacion) setErrorValidacion('');
              }}
              className="w-full bg-[var(--c-surface-2)] dark:bg-[var(--c-surface-2)] light:bg-[var(--c-bg)] border border-[var(--c-line)] rounded px-3 py-2 text-xs text-[var(--c-text)] dark:text-[var(--c-text)] light:text-[var(--c-text)] focus:outline-none focus:border-[var(--c-danger)]"
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
            <label className="block text-xs font-medium text-[var(--c-text-2)] mb-1.5">
              Detalle o aprendizaje (opcional)
            </label>
            <textarea
              rows={3}
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
              placeholder="Ej: El cliente optó por agencia tradicional con fee más bajo sin foco en ROAS..."
              className="w-full bg-[var(--c-surface-2)] dark:bg-[var(--c-surface-2)] light:bg-[var(--c-bg)] border border-[var(--c-line)] rounded p-2.5 text-xs text-[var(--c-text)] dark:text-[var(--c-text)] light:text-[var(--c-text)] placeholder:text-[var(--c-muted-2)] focus:outline-none focus:border-[var(--c-muted)]"
            />
          </div>

          {errorValidacion && (
            <p className="text-xs text-[var(--c-danger)] font-medium">{errorValidacion}</p>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-2 text-xs text-[var(--c-muted)] hover:text-[var(--c-on-accent)] rounded hover:bg-[var(--c-surface-3)] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold bg-[var(--c-danger)] hover:bg-[var(--c-danger)] text-[var(--c-on-accent)] rounded transition-colors"
            >
              Guardar como Perdido
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
