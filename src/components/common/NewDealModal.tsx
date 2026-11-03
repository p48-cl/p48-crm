import React, { useState } from 'react';
import { X, Kanban, Plus } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { Moneda, PlanEmpresa } from '../../types/crm';
import { PLANES, SETUP_LISTA } from '../../lib/planes';

interface NewDealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}

const input =
  'w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)]';
const label = 'block text-xs font-medium text-[var(--c-text-2)] mb-1';

export const NewDealModal: React.FC<NewDealModalProps> = ({ isOpen, onClose, onCreated }) => {
  const { empresas, etapas, miembros, fuentes, crearOportunidad, crearEmpresa } = useCRM();
  const { currentUser } = useAuth();

  const [nombre, setNombre] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const [altaEmpresa, setAltaEmpresa] = useState(false);
  const [nuevaEmpresa, setNuevaEmpresa] = useState({ nombre: '', dominio: '' });
  const [plan, setPlan] = useState<PlanEmpresa | ''>('A');
  const [moneda, setMoneda] = useState<Moneda>('CLP');
  const [valorNeto, setValorNeto] = useState<number>(PLANES.A.valor);
  const [setupNeto, setSetupNeto] = useState<number>(SETUP_LISTA);
  const [probabilidad, setProbabilidad] = useState<number>(20);
  const [etapaId] = useState(etapas[0]?.id || '');
  const [fuenteId, setFuenteId] = useState(fuentes[0]?.id || '');
  const [responsableId, setResponsableId] = useState(currentUser?.id || miembros[0]?.id || '');
  const [utm, setUtm] = useState({ fuente: '', campana: '', medio: '' });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fechaCierreEstimada, setFechaCierreEstimada] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  );
  const [proximaAccionTexto, setProximaAccionTexto] = useState('');
  const [proximaAccionFecha, setProximaAccionFecha] = useState(
    new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
  );

  if (!isOpen) return null;

  // Al elegir plan, se sugiere su precio de lista. El valor sigue siendo editable.
  const elegirPlan = (p: PlanEmpresa | '') => {
    setPlan(p);
    if (p) {
      setValorNeto(PLANES[p].valor);
      setSetupNeto(SETUP_LISTA);
    }
  };

  const listaPlan = plan ? PLANES[plan].valor : null;
  const difiere = listaPlan !== null && Number(valorNeto) !== listaPlan;

  const crearEmpresaRapida = async (): Promise<string | null> => {
    if (!nuevaEmpresa.nombre.trim()) {
      setError('Pon el nombre de la empresa.');
      return null;
    }
    const creada = await crearEmpresa({
      nombre: nuevaEmpresa.nombre.trim(),
      dominio_web: nuevaEmpresa.dominio.trim() || null,
      estado: 'prospecto',
    });
    if (!creada) {
      setError('No se pudo crear la empresa.');
      return null;
    }
    return creada.id;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      let idEmpresa = empresaId;
      if (altaEmpresa) {
        const nueva = await crearEmpresaRapida();
        if (!nueva) return;
        idEmpresa = nueva;
      }
      if (!nombre.trim() || !idEmpresa) {
        setError('Falta el nombre de la oportunidad o la empresa.');
        return;
      }
      const creada = await crearOportunidad({
        nombre: nombre.trim(),
        empresa_id: idEmpresa,
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
        utm_fuente: utm.fuente.trim() || null,
        utm_campana: utm.campana.trim() || null,
        utm_medio: utm.medio.trim() || null,
      });
      onClose();
      if (creada) onCreated(creada.id);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[var(--c-surface)] border border-[var(--c-line)] rounded-xl max-w-lg w-full p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
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
          <button onClick={onClose} className="text-[var(--c-muted)] hover:text-[var(--c-text)]" aria-label="Cerrar">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[var(--c-text)] mb-1">
              Nombre de la oportunidad <span className="text-[var(--c-accent)]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Escalamiento PMax & Search B2B"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={input}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className={label}>Empresa *</label>
              <button
                type="button"
                onClick={() => setAltaEmpresa(!altaEmpresa)}
                className="flex items-center gap-1 text-[11px] text-[var(--c-accent)] hover:underline"
              >
                <Plus className="w-3 h-3" /> {altaEmpresa ? 'Elegir existente' : 'Crear empresa nueva'}
              </button>
            </div>
            {altaEmpresa ? (
              <div className="grid grid-cols-2 gap-2">
                <input
                  className={input}
                  placeholder="Nombre de la empresa"
                  value={nuevaEmpresa.nombre}
                  onChange={(e) => setNuevaEmpresa({ ...nuevaEmpresa, nombre: e.target.value })}
                />
                <input
                  className={input}
                  placeholder="Dominio (ej: cliente.cl)"
                  value={nuevaEmpresa.dominio}
                  onChange={(e) => setNuevaEmpresa({ ...nuevaEmpresa, dominio: e.target.value })}
                />
                <p className="col-span-2 text-[10px] text-[var(--c-muted)]">
                  Se crea como prospecto. La ficha completa se edita después en Empresas.
                </p>
              </div>
            ) : (
              <select required value={empresaId} onChange={(e) => setEmpresaId(e.target.value)} className={input}>
                <option value="">Selecciona empresa...</option>
                {empresas.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={label}>Plan</label>
              <select value={plan} onChange={(e) => elegirPlan(e.target.value as PlanEmpresa | '')} className={`${input} font-mono`}>
                <option value="">Sin plan</option>
                {(Object.keys(PLANES) as PlanEmpresa[]).map((p) => (
                  <option key={p} value={p}>
                    Plan {p} · {PLANES[p].nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Moneda</label>
              <select value={moneda} onChange={(e) => setMoneda(e.target.value as Moneda)} className={`${input} font-mono`}>
                <option value="CLP">CLP</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div>
              <label className={label}>Responsable</label>
              <select value={responsableId} onChange={(e) => setResponsableId(e.target.value)} className={input}>
                {miembros.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Valor neto *</label>
              <input
                type="number"
                required
                min={0}
                value={valorNeto}
                onChange={(e) => setValorNeto(Number(e.target.value))}
                className={`${input} font-mono`}
              />
              {difiere && listaPlan !== null && (
                <p className="text-[10px] text-[var(--c-warn)] mt-1">
                  Precio de lista del plan: {listaPlan.toLocaleString('es-CL')}. Queda registrado en el historial.
                </p>
              )}
            </div>
            <div>
              <label className={label}>Setup neto</label>
              <input
                type="number"
                min={0}
                value={setupNeto}
                onChange={(e) => setSetupNeto(Number(e.target.value))}
                className={`${input} font-mono`}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={label}>Probabilidad (%)</label>
              <input type="number" min={0} max={100} value={probabilidad} onChange={(e) => setProbabilidad(Number(e.target.value))} className={`${input} font-mono`} />
            </div>
            <div>
              <label className={label}>Fuente</label>
              <select value={fuenteId} onChange={(e) => setFuenteId(e.target.value)} className={input}>
                <option value="">Selecciona...</option>
                {fuentes.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Cierre estimado</label>
              <input type="date" value={fechaCierreEstimada} onChange={(e) => setFechaCierreEstimada(e.target.value)} className={`${input} font-mono`} />
            </div>
          </div>

          <div className="pt-2 border-t border-[var(--c-line)] space-y-2">
            <label className={label}>Origen (UTM, opcional)</label>
            <div className="grid grid-cols-3 gap-2">
              <input className={input} placeholder="utm_fuente" value={utm.fuente} onChange={(e) => setUtm({ ...utm, fuente: e.target.value })} />
              <input className={input} placeholder="utm_campana" value={utm.campana} onChange={(e) => setUtm({ ...utm, campana: e.target.value })} />
              <input className={input} placeholder="utm_medio" value={utm.medio} onChange={(e) => setUtm({ ...utm, medio: e.target.value })} />
            </div>
          </div>

          <div className="pt-2 border-t border-[var(--c-line)] space-y-2">
            <label className={label}>Próxima acción y fecha</label>
            <div className="grid grid-cols-3 gap-2">
              <input type="text" placeholder="Ej: Enviar auditoría técnica..." value={proximaAccionTexto} onChange={(e) => setProximaAccionTexto(e.target.value)} className={`col-span-2 ${input}`} />
              <input type="date" value={proximaAccionFecha} onChange={(e) => setProximaAccionFecha(e.target.value)} className={`${input} font-mono`} />
            </div>
          </div>

          {error && <p className="text-xs text-[var(--c-danger)]">{error}</p>}

          <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--c-line)]">
            <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs text-[var(--c-muted)] hover:text-[var(--c-text)]">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="px-4 py-2 text-xs font-semibold bg-[var(--c-accent)] hover:bg-[var(--c-accent-hover)] text-[var(--c-on-accent)] rounded transition-colors disabled:opacity-50"
            >
              {guardando ? 'Creando...' : 'Crear oportunidad'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
