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
      <div className="bg-[#141414] dark:bg-[#141414] light:bg-white border border-[#2E2E2E] dark:border-[#2E2E2E] light:border-[#DDD] rounded-lg max-w-md w-full p-6 shadow-2xl relative">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-[#8E8E93] hover:text-[#F5F5F5] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[#BEFF00]/15 flex items-center justify-center text-[#BEFF00]">
            <CheckCircle2 className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[#F5F5F5] dark:text-[#F5F5F5] light:text-[#111]">
              ¿Marcar oportunidad como Ganada?
            </h3>
            <p className="text-xs text-[#8E8E93]">Confirmación de cierre comercial</p>
          </div>
        </div>

        <div className="bg-[#1A1A1A] dark:bg-[#1A1A1A] light:bg-[#F7F7F7] p-3 rounded border border-[#2A2A2A] dark:border-[#2A2A2A] light:border-[#EEE] mb-4 space-y-1">
          <p className="text-xs text-[#DDD] font-medium truncate">{oportunidad.nombre}</p>
          <p className="text-xs text-[#8E8E93]">
            Empresa: <span className="text-[#F5F5F5] font-medium">{empresa?.nombre ?? 'Sin empresa'}</span>
          </p>
          <p className="text-xs text-[#8E8E93]">
            Monto a ganar:{' '}
            <span className="font-mono text-[#BEFF00] font-bold">
              {formatMoneda(oportunidad.valor_neto, oportunidad.moneda)}
            </span>
          </p>
        </div>

        {/* Aviso de regla de negocio obligatorio */}
        <div className="bg-[#242010] border border-[#665510] text-[#E5C158] p-3 rounded mb-5 text-xs flex gap-2.5 items-start">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#BEFF00]" />
          <div>
            <p className="font-semibold text-[#F5F5F5]">Acción irreversible en la base de datos:</p>
            <p className="mt-0.5 text-[#CCC]">
              Al pasar a <strong>Ganado</strong>, la empresa{' '}
              <span className="text-white font-medium">{empresa?.nombre}</span> pasará automáticamente a estado{' '}
              <strong>Cliente</strong> en Supabase y se registrará el hito en su historial.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-2 text-xs text-[#8E8E93] hover:text-[#FFF] hover:bg-[#202020] rounded transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-semibold bg-[#BEFF00] hover:bg-[#aee600] text-[#0A0A0A] rounded transition-colors"
          >
            Confirmar y Ganar Negocio
          </button>
        </div>
      </div>
    </div>
  );
};
