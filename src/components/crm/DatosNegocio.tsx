import React, { useEffect, useState } from 'react';
import { Mail, Phone, Star } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { DatosFacturacion } from '../clientes/DatosFacturacion';
import { formatCorrelativo, formatRUT } from '../../lib/formatters';
import { PLANES } from '../../lib/planes';
import { Moneda, Oportunidad, PlanEmpresa } from '../../types/crm';

const input = 'w-full bg-[var(--c-surface)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)]';
const label = 'block text-[11px] text-[var(--c-muted)] mb-1';
const caja = 'p-4 bg-[var(--c-surface-2)] rounded-lg border border-[var(--c-line)] space-y-3';

interface Props {
  oportunidad: Oportunidad;
  onVerCliente: (empresaId: string) => void;
}

// Columna izquierda de la ficha: todos los datos del negocio, del cliente y de sus contactos, editables.
export const DatosNegocio: React.FC<Props> = ({ oportunidad, onVerCliente }) => {
  const { empresas, contactos, fuentes, miembros, actualizarOportunidad, actualizarEmpresa } = useCRM();
  const empresa = empresas.find((e) => e.id === oportunidad.empresa_id);
  const contactosCliente = contactos.filter((c) => c.empresa_id === oportunidad.empresa_id && !c.archivado);

  const [nombre, setNombre] = useState(oportunidad.nombre);
  const [valor, setValor] = useState(String(oportunidad.valor_neto ?? 0));
  const [setup, setSetup] = useState(String(oportunidad.setup_neto ?? 0));
  const [prob, setProb] = useState(String(oportunidad.probabilidad ?? 0));

  useEffect(() => {
    setNombre(oportunidad.nombre);
    setValor(String(oportunidad.valor_neto ?? 0));
    setSetup(String(oportunidad.setup_neto ?? 0));
    setProb(String(oportunidad.probabilidad ?? 0));
  }, [oportunidad.id, oportunidad.nombre, oportunidad.valor_neto, oportunidad.setup_neto, oportunidad.probabilidad]);

  const guardar = (c: Partial<Oportunidad>) => actualizarOportunidad(oportunidad.id, c);

  return (
    <div className="space-y-6">
      <div className={caja}>
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-[var(--c-text)]">Datos del negocio</h3>
          <span className="font-mono text-[11px] text-[var(--c-text-2)]">{formatCorrelativo('NEG', oportunidad.numero)}</span>
        </div>
        <div>
          <label className={label}>Nombre del negocio</label>
          <input className={input} value={nombre} onChange={(e) => setNombre(e.target.value)}
            onBlur={() => nombre.trim() && nombre.trim() !== oportunidad.nombre && guardar({ nombre: nombre.trim() })} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={label}>Valor neto mensual</label>
            <input className={input} inputMode="numeric" value={valor} onChange={(e) => setValor(e.target.value.replace(/[^\d]/g, ''))}
              onBlur={() => Number(valor) !== Number(oportunidad.valor_neto) && guardar({ valor_neto: Number(valor) || 0 })} />
          </div>
          <div>
            <label className={label}>Moneda</label>
            <select className={input} value={oportunidad.moneda} onChange={(e) => guardar({ moneda: e.target.value as Moneda })}>
              <option value="CLP">CLP</option>
              <option value="USD">USD</option>
              <option value="UF">UF</option>
            </select>
          </div>
          <div>
            <label className={label}>Setup neto (único)</label>
            <input className={input} inputMode="numeric" value={setup} onChange={(e) => setSetup(e.target.value.replace(/[^\d]/g, ''))}
              onBlur={() => Number(setup) !== Number(oportunidad.setup_neto ?? 0) && guardar({ setup_neto: Number(setup) || 0 })} />
          </div>
          <div>
            <label className={label}>Probabilidad (%)</label>
            <input className={input} inputMode="numeric" value={prob} onChange={(e) => setProb(e.target.value.replace(/[^\d]/g, ''))}
              onBlur={() => {
                const p = Math.min(100, Number(prob) || 0);
                setProb(String(p));
                if (p !== Number(oportunidad.probabilidad)) guardar({ probabilidad: p });
              }} />
          </div>
          <div>
            <label className={label}>Plan</label>
            <select className={input} value={oportunidad.plan ?? ''} onChange={(e) => guardar({ plan: (e.target.value || null) as PlanEmpresa | null })}>
              <option value="">Sin plan</option>
              {(Object.keys(PLANES) as PlanEmpresa[]).map((p) => <option key={p} value={p}>{PLANES[p].nombre}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Fuente de origen</label>
            <select className={input} value={oportunidad.fuente_id ?? ''} onChange={(e) => guardar({ fuente_id: e.target.value || null })}>
              <option value="">Sin fuente</option>
              {fuentes.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Responsable</label>
            <select className={input} value={oportunidad.responsable_id ?? ''} onChange={(e) => guardar({ responsable_id: e.target.value || null })}>
              <option value="">Sin asignar</option>
              {miembros.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Cierre estimado</label>
            <input type="date" className={`${input} font-mono`} value={oportunidad.fecha_cierre_estimada ?? ''}
              onChange={(e) => guardar({ fecha_cierre_estimada: e.target.value || null })} />
          </div>
        </div>
        <div>
          <label className={label}>Contacto principal del negocio</label>
          <select className={input} value={oportunidad.contacto_principal_id ?? ''} onChange={(e) => guardar({ contacto_principal_id: e.target.value || null })}>
            <option value="">Sin contacto</option>
            {contactosCliente.map((c) => <option key={c.id} value={c.id}>{c.nombre} {c.apellido ?? ''}</option>)}
          </select>
        </div>
        {(oportunidad.utm_fuente || oportunidad.utm_campana || oportunidad.utm_medio) && (
          <p className="text-[11px] font-mono text-[var(--c-muted)]">
            UTM · {[oportunidad.utm_fuente, oportunidad.utm_medio, oportunidad.utm_campana].filter(Boolean).join(' / ')}
          </p>
        )}
      </div>

      {empresa && (
        <div className={caja}>
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-[var(--c-text)]">Cliente · {empresa.nombre}</h3>
            <button onClick={() => onVerCliente(empresa.id)} className="text-xs text-[var(--c-accent)] hover:underline font-mono">
              Abrir ficha
            </button>
          </div>
          {empresa.rut && <p className="text-[11px] font-mono text-[var(--c-muted)]">RUT {formatRUT(empresa.rut)}</p>}
          <DatosFacturacion empresa={empresa} onGuardar={(c) => actualizarEmpresa(empresa.id, c)} />
        </div>
      )}

      <div className={caja}>
        <h3 className="text-xs font-semibold text-[var(--c-text)]">Contactos ({contactosCliente.length})</h3>
        {contactosCliente.length === 0 ? (
          <p className="text-[11px] text-[var(--c-muted)] text-center py-2">Este cliente aún no tiene contactos.</p>
        ) : (
          <div className="space-y-2">
            {contactosCliente.map((c) => (
              <div key={c.id} className="p-2.5 bg-[var(--c-surface)] rounded border border-[var(--c-line)] text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[var(--c-text)]">{c.nombre} {c.apellido ?? ''}</span>
                  {(c.es_principal || c.id === oportunidad.contacto_principal_id) && <Star className="w-3 h-3 text-[var(--c-warn)]" />}
                  {c.cargo && <span className="text-[var(--c-muted)]">· {c.cargo}</span>}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--c-text-2)]">
                  {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>}
                  {c.telefono && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.telefono}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
