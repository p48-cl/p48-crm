import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { usePlanes, guardarPlan } from '../../lib/planes';
import { useConfiguracionCRM, guardarConfiguracion } from '../../lib/configuracion';
import { COLORES_ESTADO, ESTADOS_COTIZACION, ESTADO_DEFECTO, estiloEstado } from '../../lib/cotizaciones';
import type { PlanEmpresa } from '../../types/crm';

const input = 'w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)] focus:outline-none focus:border-[var(--c-accent)]';
const label = 'block text-[11px] text-[var(--c-muted)] mb-1';
const tarjeta = 'bg-[var(--c-surface)] rounded-lg border border-[var(--c-line)] p-4 space-y-4';
const btn = 'text-xs font-semibold px-3 py-1.5 rounded bg-[var(--c-accent)] hover:bg-[var(--c-accent-hover)] text-[var(--c-on-accent)] disabled:opacity-40 transition-colors';

const Aviso: React.FC<{ msg: string | null }> = ({ msg }) =>
  msg ? <span className={`text-[11px] ${msg.startsWith('Guardado') ? 'text-[var(--c-ok)]' : 'text-[var(--c-danger)]'}`}>{msg}</span> : null;

// Administración > Comercial: planes, parámetros de cotización, estados y medios de pago
export const ComercialEditor: React.FC = () => {
  const { PLANES, recargar: recargarPlanes } = usePlanes();
  const { config, recargar } = useConfiguracionCRM();

  // --- Planes
  const codigos = (Object.keys(PLANES) as PlanEmpresa[]).sort((a, b) => PLANES[a].orden - PLANES[b].orden);
  const [planes, setPlanes] = useState(PLANES);
  const [msgPlan, setMsgPlan] = useState<Record<string, string>>({});
  useEffect(() => setPlanes(PLANES), [PLANES]);

  const guardarFilaPlan = async (c: PlanEmpresa) => {
    const p = planes[c];
    if (!p.nombre.trim()) return setMsgPlan({ ...msgPlan, [c]: 'Falta el nombre' });
    const err = await guardarPlan(c, { nombre: p.nombre.trim(), valor: Math.max(0, Math.round(Number(p.valor) || 0)), activo: p.activo, orden: Number(p.orden) || 0 });
    setMsgPlan({ ...msgPlan, [c]: err ?? 'Guardado' });
    if (!err) recargarPlanes();
  };

  // --- Parámetros
  const [par, setPar] = useState({ setup: String(config.setup_lista_clp), validez: String(config.cotizacion_validez_dias), iva: String(config.iva_pct), comision: config.comision_base, condiciones: config.condiciones_base });
  const [msgPar, setMsgPar] = useState<string | null>(null);
  // --- Estados de cotización
  const [estados, setEstados] = useState<Record<string, { etiqueta: string; color: string }>>({});
  const [msgEst, setMsgEst] = useState<string | null>(null);
  // --- Medios de pago
  const [medios, setMedios] = useState(config.medios_pago.join('\n'));
  const [msgMed, setMsgMed] = useState<string | null>(null);

  useEffect(() => {
    setPar({ setup: String(config.setup_lista_clp), validez: String(config.cotizacion_validez_dias), iva: String(config.iva_pct), comision: config.comision_base, condiciones: config.condiciones_base });
    setMedios(config.medios_pago.join('\n'));
    const e: Record<string, { etiqueta: string; color: string }> = {};
    for (const k of ESTADOS_COTIZACION) {
      const v = estiloEstado(config.estados_cotizacion, k);
      e[k] = { etiqueta: v.etiqueta, color: config.estados_cotizacion?.[k]?.color && COLORES_ESTADO[config.estados_cotizacion[k].color as string] ? (config.estados_cotizacion[k].color as string) : ESTADO_DEFECTO[k].color };
    }
    setEstados(e);
  }, [config]);

  const guardarParametros = async (e: React.FormEvent) => {
    e.preventDefault();
    const setup = Number(par.setup), validez = Number(par.validez), iva = Number(par.iva);
    if (!(setup >= 0) || !(validez >= 1 && validez <= 365) || !(iva >= 0 && iva <= 100)) return setMsgPar('Revisa los valores: setup ≥ 0, validez 1–365 días, IVA 0–100%');
    const err = await guardarConfiguracion({ setup_lista_clp: Math.round(setup), cotizacion_validez_dias: Math.round(validez), iva_pct: iva, comision_base: par.comision.trim(), condiciones_base: par.condiciones.trim() });
    setMsgPar(err ?? 'Guardado');
    if (!err) recargar();
  };

  const guardarEstados = async () => {
    const out: Record<string, { etiqueta: string; color: string }> = {};
    for (const k of ESTADOS_COTIZACION) out[k] = { etiqueta: estados[k].etiqueta.trim() || ESTADO_DEFECTO[k].etiqueta, color: estados[k].color };
    const err = await guardarConfiguracion({ estados_cotizacion: out });
    setMsgEst(err ?? 'Guardado');
    if (!err) recargar();
  };

  const guardarMedios = async () => {
    const lista = [...new Set(medios.split('\n').map((m) => m.trim()).filter(Boolean))];
    if (lista.length === 0) return setMsgMed('Agrega al menos un medio de pago');
    const err = await guardarConfiguracion({ medios_pago: lista });
    setMsgMed(err ?? 'Guardado');
    if (!err) recargar();
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Planes */}
      <section className={tarjeta}>
        <div>
          <h3 className="text-xs font-semibold text-[var(--c-text)]">Planes de servicio</h3>
          <p className="text-[11px] text-[var(--c-muted)]">Nombre y precio neto mensual (CLP) que se sugieren al crear negocios y cotizaciones. Un plan desactivado deja de ofrecerse, pero se conserva en los clientes que ya lo tienen.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] font-mono uppercase text-[var(--c-muted)]">
                <th className="pb-2 pr-3 w-16">Plan</th><th className="pb-2 pr-3">Nombre</th><th className="pb-2 pr-3 w-36">Precio neto (CLP)</th><th className="pb-2 pr-3 w-16">Orden</th><th className="pb-2 pr-3 w-20">Activo</th><th className="pb-2 w-32" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--c-line)]">
              {codigos.map((c) => (
                <tr key={c}>
                  <td className="py-2 pr-3 font-mono text-[var(--c-text)]">{c === 'personalizado' ? 'Pers.' : c}</td>
                  <td className="py-2 pr-3"><input className={input} value={planes[c].nombre} onChange={(e) => setPlanes({ ...planes, [c]: { ...planes[c], nombre: e.target.value } })} /></td>
                  <td className="py-2 pr-3"><input type="number" min={0} className={`${input} font-mono`} value={planes[c].valor} onChange={(e) => setPlanes({ ...planes, [c]: { ...planes[c], valor: Number(e.target.value) } })} /></td>
                  <td className="py-2 pr-3"><input type="number" className={`${input} font-mono`} value={planes[c].orden} onChange={(e) => setPlanes({ ...planes, [c]: { ...planes[c], orden: Number(e.target.value) } })} /></td>
                  <td className="py-2 pr-3"><input type="checkbox" checked={planes[c].activo} onChange={(e) => setPlanes({ ...planes, [c]: { ...planes[c], activo: e.target.checked } })} /></td>
                  <td className="py-2 text-right whitespace-nowrap"><Aviso msg={msgPlan[c] ?? null} /> <button className={`${btn} ml-2`} onClick={() => guardarFilaPlan(c)}>Guardar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Parámetros */}
      <form onSubmit={guardarParametros} className={tarjeta}>
        <div>
          <h3 className="text-xs font-semibold text-[var(--c-text)]">Parámetros de cotización</h3>
          <p className="text-[11px] text-[var(--c-muted)]">Valores iniciales de cada cotización nueva. Se pueden ajustar en cada una; las ya emitidas no cambian.</p>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-3 gap-4">
          <div><label className={label}>Setup de lista (CLP neto)</label><input type="number" min={0} className={`${input} font-mono`} value={par.setup} onChange={(e) => setPar({ ...par, setup: e.target.value })} /></div>
          <div><label className={label}>Validez por defecto (días)</label><input type="number" min={1} max={365} className={`${input} font-mono`} value={par.validez} onChange={(e) => setPar({ ...par, validez: e.target.value })} /></div>
          <div><label className={label}>IVA (%)</label><input type="number" min={0} max={100} step="0.1" className={`${input} font-mono`} value={par.iva} onChange={(e) => setPar({ ...par, iva: e.target.value })} /></div>
        </div>
        <div><label className={label}>Texto de comisión de pauta</label><textarea rows={3} className={`${input} resize-y`} value={par.comision} onChange={(e) => setPar({ ...par, comision: e.target.value })} /></div>
        <div><label className={label}>Condiciones comerciales base</label><textarea rows={3} className={`${input} resize-y`} value={par.condiciones} onChange={(e) => setPar({ ...par, condiciones: e.target.value })} /></div>
        <div className="flex items-center justify-end gap-3"><Aviso msg={msgPar} /><button type="submit" className={btn}>Guardar parámetros</button></div>
      </form>

      {/* Estados de cotización */}
      <section className={tarjeta}>
        <div>
          <h3 className="text-xs font-semibold text-[var(--c-text)]">Estados de cotización</h3>
          <p className="text-[11px] text-[var(--c-muted)]">Nombre y color con que se muestra cada estado. Los estados en sí son fijos porque el sistema los usa para alertas y totales (una cotización enviada y vencida pasa sola a «vencida»).</p>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-2 gap-3">
          {ESTADOS_COTIZACION.map((k) => estados[k] && (
            <div key={k} className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase text-[var(--c-muted)] w-20 shrink-0">{k}</span>
              <input className={input} value={estados[k].etiqueta} onChange={(e) => setEstados({ ...estados, [k]: { ...estados[k], etiqueta: e.target.value } })} />
              <select className={`${input} w-28 shrink-0 ${COLORES_ESTADO[estados[k].color]?.texto ?? ''}`} value={estados[k].color} onChange={(e) => setEstados({ ...estados, [k]: { ...estados[k], color: e.target.value } })}>
                {Object.entries(COLORES_ESTADO).map(([c, v]) => <option key={c} value={c}>{v.nombre}</option>)}
              </select>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-3"><Aviso msg={msgEst} /><button className={btn} onClick={guardarEstados}><Check className="w-3 h-3 inline -mt-0.5 mr-1" />Guardar estados</button></div>
      </section>

      {/* Medios de pago */}
      <section className={tarjeta}>
        <div>
          <h3 className="text-xs font-semibold text-[var(--c-text)]">Medios de pago</h3>
          <p className="text-[11px] text-[var(--c-muted)]">Opciones sugeridas al registrar el pago de una factura. Uno por línea.</p>
        </div>
        <textarea rows={5} className={`${input} resize-y max-w-sm`} value={medios} onChange={(e) => setMedios(e.target.value)} />
        <div className="flex items-center justify-end gap-3"><Aviso msg={msgMed} /><button className={btn} onClick={guardarMedios}>Guardar medios</button></div>
      </section>
    </div>
  );
};
