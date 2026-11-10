import React from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { Oportunidad, Empresa } from '../../types/crm';
import { formatMoneda } from '../../lib/formatters';

interface ConfirmWonModalProps {
  isOpen: boolean;
  oportunidad: Oportunidad | null;
  empresa?: Empresa;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmWonModal: React.FC<ConfirmWonModalProps> = ({
  isOpen,
  oportunidad,
  empresa,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen || !oportunidad) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[var(--c-surface)] border border-[var(--c-line)] rounded-lg max-w-md w-full p-6 shadow-2xl relative">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-[var(--c-muted)] hover:text-[var(--c-text)] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[var(--c-accent)]/15 flex items-center justify-center text-[var(--c-accent)]">
            <CheckCircle2 className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[var(--c-text)]">
              ¿Marcar oportunidad como Ganada?
            </h3>
            <p className="text-xs text-[var(--c-muted)]">Confirmación de cierre comercial</p>
          </div>
        </div>

        <div className="bg-[var(--c-surface-2)] p-3 rounded border border-[var(--c-surface-3)] mb-4 space-y-1">
          <p className="text-xs text-[var(--c-line)] font-medium truncate">{oportunidad.nombre}</p>
          <p className="text-xs text-[var(--c-muted)]">
            Empresa: <span className="text-[var(--c-text)] font-medium">{empresa?.nombre ?? 'Sin empresa'}</span>
          </p>
          <p className="text-xs text-[var(--c-muted)]">
            Monto a ganar:{' '}
            <span className="font-mono text-[var(--c-accent)] font-bold">
              {formatMoneda(oportunidad.valor_neto, oportunidad.moneda)}
            </span>
          </p>
        </div>

        {/* Aviso de regla de negocio obligatorio */}
        <div className="bg-[var(--c-surface-2)] border border-[var(--c-line)] text-[var(--c-muted-2)] p-3 rounded mb-5 text-xs flex gap-2.5 items-start">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[var(--c-accent)]" />
          <div>
            <p className="font-semibold text-[var(--c-text)]">Acción irreversible en la base de datos:</p>
            <p className="mt-0.5 text-[var(--c-text-2)]">
              Al pasar a <strong>Ganado</strong>, la empresa{' '}
              <span className="text-[var(--c-text)] font-medium">{empresa?.nombre}</span> pasará automáticamente a estado{' '}
              <strong>Cliente</strong> en Supabase y se registrará el hito en su historial.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-2 text-xs text-[var(--c-muted)] hover:text-[var(--c-on-accent)] hover:bg-[var(--c-surface-3)] rounded transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-semibold bg-[var(--c-accent)] hover:bg-[var(--c-accent-hover)] text-[var(--c-on-accent)] rounded transition-colors"
          >
            Confirmar y Ganar Negocio
          </button>
        </div>
      </div>
    </div>
  );
};
