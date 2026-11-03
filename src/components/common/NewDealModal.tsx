import React, { useState } from 'react';
import { X, Kanban } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { Moneda, PlanEmpresa } from '../../types/crm';

interface NewDealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}

export const NewDealModal: React.FC<NewDealModalProps> = ({ isOpen, onClose, onCreated }) => {
  const { empresas, etapas, miembros, fuentes, crearOportunidad } = useCRM();

  const [nombre, setNombre] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const [plan, setPlan] = useState<PlanEmpresa | ''>('A');
  const [moneda, setMoneda] = useState<Moneda>('CLP');
  const [valorNeto, setValorNeto] = useState<number>(15000000);
  const [setupNeto, setSetupNeto] = useState<number>(0);
  const [probabilidad, setProbabilidad] = useState<number>(20);
  const [etapaId, setEtapaId] = useState(etapas[0]?.id || '');
  const [fuenteId, setFuenteId] = useState(fuentes[0]?.id || '');
  const [responsableId, setResponsableId] = useState(miembros[0]?.id || '');
  const [fechaCierreEstimada, setFechaCierreEstimada] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  );
  const [proximaAccionTexto, setProximaAccionTexto] = useState('');
  const [proximaAccionFecha, setProximaAccionFecha] = useState(
    new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)
  );

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !empresaId) return;

    const creada = await crearOportunidad({
      nombre: nombre.trim(),
      empresa_id: empresaId,
      etapa_id: etapaId || etapas[0]?.id,
      responsable_id: responsableId || null,
      fuente_id: fuenteId || null,
      plan: plan || null,
      moneda,
      valor_neto: Number(valorNeto) || 0,
      setup_neto: Number(setupNeto) || 0,
      probabilidad: Number(probabilidad) || 0,
      fecha_cierre_estimada: fechaCierreEstimada || null,
      proxima_accion_texto: proximaAccionTexto.trim() || null,
      proxima_accion_fecha: proximaAccionFecha || null,
    });

    onClose();
    if (creada) {
      onCreated(creada.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[var(--c-surface)] border border-[var(--c-line)] rounded-xl max-w-lg w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[var(--c-surface-2)] flex items-center justify-center text-[var(--c-text)]">
              <Kanban className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--c-text)]">Nueva Oportunidad</h2>
              <p className="text-xs text-[var(--c-muted)]">Pipeline comercial de performance marketing</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[var(--c-muted)] hover:text-[var(--c-text)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[var(--c-text)] mb-1">
              Nombre de la Oportunidad <span className="text-[var(--c-accent)]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Escalamiento PMax & Search B2B"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-3 py-1.5 text-xs text-[var(--c-text)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--c-text-2)] mb-1">Empresa *</label>
              <select
                required
                value={empresaId}
                onChange={(e) => setEmpresaId(e.target.value)}
                className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)]"
              >
                <option value="">Selecciona empresa...</option>
                {empresas.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--c-text-2)] mb-1">Plan</label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value as any)}
                className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)] font-mono"
              >
                <option value="A">Plan A</option>
                <option value="B">Plan B</option>
                <option value="C">Plan C</option>
                <option value="D">Plan D</option>
                <option value="E">Plan E</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--c-text-2)] mb-1">Moneda</label>
              <select
                value={moneda}
                onChange={(e) => setMoneda(e.target.value as Moneda)}
                className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)] font-mono"
              >
                <option value="CLP">CLP</option>
                <option value="USD">USD</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--c-text-2)] mb-1">Valor Neto *</label>
              <input
                type="number"
                required
                min={0}
                value={valorNeto}
                onChange={(e) => setValorNeto(Number(e.target.value))}
                className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--c-text-2)] mb-1">Setup Neto</label>
              <input
                type="number"
                min={0}
                value={setupNeto}
                onChange={(e) => setSetupNeto(Number(e.target.value))}
                className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)] font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--c-text-2)] mb-1">Probabilidad (0-100%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={probabilidad}
                onChange={(e) => setProbabilidad(Number(e.target.value))}
                className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--c-text-2)] mb-1">Fuente</label>
              <select
                value={fuenteId}
                onChange={(e) => setFuenteId(e.target.value)}
                className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)]"
              >
                <option value="">Selecciona...</option>
                {fuentes.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--c-text-2)] mb-1">Cierre Estimado</label>
              <input
                type="date"
                value={fechaCierreEstimada}
                onChange={(e) => setFechaCierreEstimada(e.target.value)}
                className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-2 py-1.5 text-xs text-[var(--c-text)] font-mono"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-[var(--c-line)] space-y-2">
            <label className="block text-xs font-medium text-[var(--c-text-2)]">Próxima Acción y Fecha</label>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Ej: Enviar auditoría técnica..."
                value={proximaAccionTexto}
                onChange={(e) => setProximaAccionTexto(e.target.value)}
                className="col-span-2 bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)]"
              />
              <input
                type="date"
                value={proximaAccionFecha}
                onChange={(e) => setProximaAccionFecha(e.target.value)}
                className="bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-2 py-1.5 text-xs text-[var(--c-text)] font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--c-line)]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-[var(--c-muted)] hover:text-[var(--c-text)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold bg-[var(--c-accent)] hover:bg-[var(--c-accent-hover)] text-[var(--c-on-accent)] rounded transition-colors"
            >
              Crear Oportunidad
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
