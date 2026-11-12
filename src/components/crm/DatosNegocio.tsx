import React, { useEffect, useState } from 'react';
import { Mail, Phone, Star } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { DatosFacturacion } from '../clientes/DatosFacturacion';
import { FacturaFormulario } from '../clientes/FacturaFormulario';
import { codigoNegocio, formatCLP, formatCorrelativo, formatRUT } from '../../lib/formatters';
import { usePlanes } from '../../lib/planes';
import { Moneda, Oportunidad, PlanEmpresa, RolDecisionContacto } from '../../types/crm';

const input = 'w-full bg-[var(--c-surface)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)]';
const label = 'block text-[11px] text-[var(--c-muted)] mb-1';
const caja = 'p-4 bg-[var(--c-surface-2)] rounded-lg border border-[var(--c-line)] space-y-3';

interface Props {
  oportunidad: Oportunidad;
  onVerCliente: (empresaId: string) => void;
}

interface DatosContacto {
  nombre: string;
  apellido: string;
  cargo: string;
  email: string;
  telefono: string;
  rol_decision: RolDecisionContacto;
  es_principal: boolean;
}

const contactoVacio: DatosContacto = {
  nombre: '',
  apellido: '',
  cargo: '',
  email: '',
  telefono: '',
  rol_decision: 'decisor',
  es_principal: false,
};

// Columna izquierda de la ficha: todos los datos del negocio, del cliente y de sus contactos, editables.
export const DatosNegocio: React.FC<Props> = ({ oportunidad, onVerCliente }) => {
  const { empresas, contactos, fuentes, miembros, actualizarOportunidad, actualizarEmpresa, crearContacto, actualizarContacto, cotizaciones, facturas } = useCRM();
  const { PLANES, codigos } = usePlanes();
  const empresa = empresas.find((e) => e.id === oportunidad.empresa_id);
  const contactosCliente = contactos.filter((c) => c.empresa_id === oportunidad.empresa_id && !c.archivado);

  const [nombre, setNombre] = useState(oportunidad.nombre);
  const [valor, setValor] = useState(String(oportunidad.valor_neto ?? 0));
  const [setup, setSetup] = useState(String(oportunidad.setup_neto ?? 0));
  const [prob, setProb] = useState(String(oportunidad.probabilidad ?? 0));

  // Formulario de contacto: id null = alta nueva; con id = edición de ese contacto
  const [formCon, setFormCon] = useState<{ id: string | null; datos: DatosContacto } | null>(null);
  const [errorCon, setErrorCon] = useState<string | null>(null);
  const [guardandoCon, setGuardandoCon] = useState(false);
  const [formFactura, setFormFactura] = useState(false);

  useEffect(() => {
    setNombre(oportunidad.nombre);
    setValor(String(oportunidad.valor_neto ?? 0));
    setSetup(String(oportunidad.setup_neto ?? 0));
    setProb(String(oportunidad.probabilidad ?? 0));
    setFormCon(null);
    setErrorCon(null);
  }, [oportunidad.id, oportunidad.nombre, oportunidad.valor_neto, oportunidad.setup_neto, oportunidad.probabilidad]);

  const guardar = (c: Partial<Oportunidad>) => actualizarOportunidad(oportunidad.id, c);

  const abrirAlta = () => {
    setErrorCon(null);
    setFormCon({ id: null, datos: { ...contactoVacio } });
  };

  const abrirEdicion = (c: (typeof contactosCliente)[number]) => {
    setErrorCon(null);
    setFormCon({
      id: c.id,
      datos: {
        nombre: c.nombre,
        apellido: c.apellido ?? '',
        cargo: c.cargo ?? '',
        email: c.email ?? '',
        telefono: c.telefono ?? '',
        rol_decision: c.rol_decision ?? 'decisor',
        es_principal: !!c.es_principal,
      },
    });
  };

  const cambiarCampo = <K extends keyof DatosContacto>(campo: K, valorNuevo: DatosContacto[K]) => {
    setFormCon((f) => (f ? { ...f, datos: { ...f.datos, [campo]: valorNuevo } } : f));
  };

  const guardarContacto = async () => {
    if (!formCon) return;
    const d = formCon.datos;
    if (!d.nombre.trim()) {
      setErrorCon('El nombre es obligatorio.');
      return;
    }
    if (!oportunidad.empresa_id) {
      setErrorCon('El negocio no tiene cliente asociado.');
      return;
    }
    setGuardandoCon(true);
    setErrorCon(null);
    const payload = {
      nombre: d.nombre.trim(),
      apellido: d.apellido.trim() || null,
      cargo: d.cargo.trim() || null,
      email: d.email.trim(),
      telefono: d.telefono.trim() || null,
      rol_decision: d.rol_decision,
      es_principal: d.es_principal,
    };
    let ok = true;
    if (formCon.id) {
      await actualizarContacto(formCon.id, payload);
    } else {
      ok = (await crearContacto({ ...payload, empresa_id: oportunidad.empresa_id })) !== null;
    }
    setGuardandoCon(false);
    if (ok) {
      setFormCon(null);
    } else {
      setErrorCon('No se pudo guardar el contacto.');
    }
  };

  const formularioContacto = formCon ? (
    <div className="p-3 bg-[var(--c-surface)] rounded border border-[var(--c-accent)]/40 space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className={label}>Nombre *</label>
          <input className={input} value={formCon!.datos.nombre} onChange={(e) => cambiarCampo('nombre', e.target.value)} />
        </div>
        <div>
          <label className={label}>Apellido</label>
          <input className={input} value={formCon!.datos.apellido} onChange={(e) => cambiarCampo('apellido', e.target.value)} />
        </div>
        <div>
          <label className={label}>Cargo</label>
          <input className={input} value={formCon!.datos.cargo} onChange={(e) => cambiarCampo('cargo', e.target.value)} />
        </div>
        <div>
          <label className={label}>Rol en la decisión</label>
          <select className={input} value={formCon!.datos.rol_decision} onChange={(e) => cambiarCampo('rol_decision', e.target.value as RolDecisionContacto)}>
            <option value="decisor">Decisor</option>
            <option value="influenciador">Influenciador</option>
            <option value="usuario">Usuario</option>
          </select>
        </div>
        <div>
          <label className={label}>Email</label>
          <input type="email" className={input} value={formCon!.datos.email} onChange={(e) => cambiarCampo('email', e.target.value)} />
        </div>
        <div>
          <label className={label}>Teléfono</label>
          <input className={input} value={formCon!.datos.telefono} onChange={(e) => cambiarCampo('telefono', e.target.value)} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs text-[var(--c-text-2)]">
        <input type="checkbox" checked={formCon!.datos.es_principal} onChange={(e) => cambiarCampo('es_principal', e.target.checked)} />
        Contacto principal del cliente
      </label>
      {errorCon && <p className="text-[11px] text-[var(--c-danger)]">{errorCon}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setFormCon(null)} disabled={guardandoCon} className="px-3 py-1.5 text-xs rounded border border-[var(--c-line)] text-[var(--c-muted)] hover:text-[var(--c-text)]">
          Cancelar
        </button>
        <button type="button" onClick={guardarContacto} disabled={guardandoCon} className="px-3 py-1.5 text-xs font-semibold rounded bg-[var(--c-accent)] text-[var(--c-on-accent)] disabled:opacity-50">
          {guardandoCon ? 'Guardando…' : formCon?.id ? 'Guardar cambios' : 'Agregar contacto'}
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-6">
      <div className={caja}>
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-[var(--c-text)]">Datos del negocio</h3>
          <span className="font-mono text-[11px] text-[var(--c-text-2)]">{codigoNegocio(oportunidad)}</span>
        </div>
        <div>
          <label className={label}>Nombre del negocio</label>
          <input className={input} value={nombre} onChange={(e) => setNombre(e.target.value)}
            onBlur={() => nombre.trim() && nombre.trim() !== oportunidad.nombre && guardar({ nombre: nombre.trim() })} />
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-2 gap-3">
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
              {codigos.map((p) => <option key={p} value={p}>{PLANES[p].nombre}</option>)}
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

      {oportunidad.pipeline === 'expansion' && (
        <div className={caja}>
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-[var(--c-text)]">Factura</h3>
            {empresa && !formFactura && (
              <button onClick={() => setFormFactura(true)} className="text-xs text-[var(--c-accent)] hover:underline font-mono">
                + Registrar factura
              </button>
            )}
          </div>
          {formFactura && empresa && (
            <FacturaFormulario
              empresa={empresa}
              oportunidadId={oportunidad.id}
              onGuardado={() => setFormFactura(false)}
              onCancelar={() => setFormFactura(false)}
            />
          )}
          {(() => {
            const cotIds = new Set(cotizaciones.filter((c) => c.oportunidad_id === oportunidad.id).map((c) => c.id));
            const facs = facturas.filter((f) => f.oportunidad_id === oportunidad.id || (f.cotizacion_id && cotIds.has(f.cotizacion_id)));
            if (facs.length === 0) {
              return <p className="text-[11px] text-[var(--c-muted)]">Sin facturas vinculadas a este negocio.</p>;
            }
            return (
              <ul className="space-y-1 text-[11px] font-mono">
                {facs.map((f) => (
                  <li key={f.id} className={`flex justify-between gap-2 ${f.estado_pago === 'anulada' ? 'line-through text-[var(--c-muted)]' : 'text-[var(--c-text-2)]'}`}>
                    <span>{f.tipo_documento}-{String(f.folio).padStart(6, '0')}</span>
                    <span className="text-right">{formatCLP(Number(f.monto_total))} · <span className="uppercase">{f.estado_pago}</span></span>
                  </li>
                ))}
              </ul>
            );
          })()}
        </div>
      )}

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
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-[var(--c-text)]">Contactos ({contactosCliente.length})</h3>
          {!formCon && (
            <button
              type="button"
              onClick={abrirAlta}
              disabled={!oportunidad.empresa_id}
              className="text-xs text-[var(--c-accent)] hover:underline font-mono disabled:opacity-40"
            >
              + Agregar contacto
            </button>
          )}
        </div>
        {formCon && formCon.id === null && formularioContacto}
        {contactosCliente.length === 0 && !formCon ? (
          <p className="text-[11px] text-[var(--c-muted)] text-center py-2">Este cliente aún no tiene contactos.</p>
        ) : (
          <div className="space-y-2">
            {contactosCliente.map((c) =>
              formCon && formCon.id === c.id ? (
                <React.Fragment key={c.id}>{formularioContacto}</React.Fragment>
              ) : (
                <div key={c.id} className="p-2.5 bg-[var(--c-surface)] rounded border border-[var(--c-line)] text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[var(--c-text)]">{c.nombre} {c.apellido ?? ''}</span>
                    {(c.es_principal || c.id === oportunidad.contacto_principal_id) && <Star className="w-3 h-3 text-[var(--c-warn)]" />}
                    {c.cargo && <span className="text-[var(--c-muted)]">· {c.cargo}</span>}
                    <button
                      type="button"
                      onClick={() => abrirEdicion(c)}
                      className="ml-auto text-[11px] text-[var(--c-accent)] hover:underline font-mono"
                    >
                      Editar
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--c-text-2)]">
                    {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>}
                    {c.telefono && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.telefono}</span>}
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
};
