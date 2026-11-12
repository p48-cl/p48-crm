import React, { useEffect, useMemo, useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useConfiguracionCRM } from '../../lib/configuracion';
import { codigoNegocio, formatCLP } from '../../lib/formatters';
import type { Empresa, EstadoFactura, Factura } from '../../types/crm';

const input = 'w-full bg-[var(--c-field)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)] hover:border-[var(--c-muted)] focus:border-[var(--c-accent)] outline-none transition-colors';
const etiqueta = 'block text-[11px] text-[var(--c-muted)] mb-1';
const seccion = 'text-[10px] font-mono uppercase tracking-wider text-[var(--c-muted)] border-b border-[var(--c-line)] pb-1 mb-2.5';

const TIPOS: { valor: 33 | 34; texto: string }[] = [
  { valor: 33, texto: 'Afecta (33)' },
  { valor: 34, texto: 'Exenta (34)' },
];

export const ESTADOS_FACTURA: { valor: EstadoFactura; texto: string; clase: string }[] = [
  { valor: 'pendiente', texto: 'Pendiente', clase: 'text-[var(--c-warn)]' },
  { valor: 'pagada', texto: 'Pagada', clase: 'text-[var(--c-ok)]' },
  { valor: 'anulada', texto: 'Anulada', clase: 'text-[var(--c-muted)]' },
];

interface CotOpcion { id: string; numero: number; titulo: string; oportunidad_id: string | null }

interface Form {
  empresa_id: string;
  tipo_documento: 33 | 34;
  folio: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  moneda: 'CLP' | 'UF';
  monto_neto: string;
  monto_uf: string;
  uf_valor: string;
  uf_fecha: string;
  estado_pago: EstadoFactura;
  fecha_pago: string;
  medio_pago: string;
  cotizacion_id: string;
  oportunidad_id: string;
  url_documento: string;
  notas: string;
}

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const sumarDias = (iso: string, dias: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const soloFecha = (v?: string | null) => (v ? v.slice(0, 10) : '');

const formVacio = (empresaId: string, dias: number): Form => {
  const emision = hoyISO();
  return {
    empresa_id: empresaId,
    tipo_documento: 33,
    folio: '',
    fecha_emision: emision,
    fecha_vencimiento: sumarDias(emision, dias),
    moneda: 'CLP',
    monto_neto: '',
    monto_uf: '',
    uf_valor: '',
    uf_fecha: emision,
    estado_pago: 'pendiente',
    fecha_pago: '',
    medio_pago: '',
    cotizacion_id: '',
    oportunidad_id: '',
    url_documento: '',
    notas: '',
  };
};

const formDesde = (f: Factura): Form => ({
  empresa_id: f.empresa_id,
  tipo_documento: f.tipo_documento,
  folio: String(f.folio),
  fecha_emision: soloFecha(f.fecha_emision),
  fecha_vencimiento: soloFecha(f.fecha_vencimiento),
  moneda: f.moneda === 'UF' ? 'UF' : 'CLP',
  monto_neto: String(f.monto_neto),
  monto_uf: f.monto_uf != null ? String(f.monto_uf) : '',
  uf_valor: f.uf_valor != null ? String(f.uf_valor) : '',
  uf_fecha: soloFecha(f.uf_fecha) || soloFecha(f.fecha_emision),
  estado_pago: f.estado_pago,
  fecha_pago: soloFecha(f.fecha_pago),
  medio_pago: f.medio_pago ?? '',
  cotizacion_id: f.cotizacion_id ?? '',
  oportunidad_id: f.oportunidad_id ?? '',
  url_documento: f.url_documento ?? '',
  notas: f.notas ?? '',
});

interface Props {
  // Cliente fijo (desde la ficha del cliente). Si no viene, el formulario pide elegir uno.
  empresa?: Empresa | null;
  empresasDisponibles?: Empresa[];
  inicial?: Factura | null;
  onGuardado: () => void;
  onCancelar: () => void;
}

// Formulario de registro/edición de una factura. Lo usa la ficha del cliente y la vista global de facturas.
export const FacturaFormulario: React.FC<Props> = ({ empresa, empresasDisponibles = [], inicial, onGuardado, onCancelar }) => {
  const { facturas, oportunidades, crearFactura, actualizarFactura } = useCRM();
  const { config: cfg } = useConfiguracionCRM();
  const empresaFija = empresa ?? null;
  const [form, setForm] = useState<Form>(() =>
    inicial ? formDesde(inicial) : formVacio(empresaFija?.id ?? '', empresaFija?.dias_pago ?? 30),
  );
  const [error, setError] = useState<string | null>(null);
  const [cotizaciones, setCotizaciones] = useState<CotOpcion[]>([]);

  const empresaActual = empresaFija ?? empresasDisponibles.find((e) => e.id === form.empresa_id) ?? null;
  const delCliente = useMemo(() => facturas.filter((f) => f.empresa_id === form.empresa_id), [facturas, form.empresa_id]);
  const negocios = useMemo(
    () => oportunidades.filter((o) => o.empresa_id === form.empresa_id && !o.archivado),
    [oportunidades, form.empresa_id],
  );

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !form.empresa_id) {
      setCotizaciones([]);
      return;
    }
    let vivo = true;
    supabase
      .from('cotizaciones')
      .select('id,numero,titulo,oportunidad_id')
      .eq('empresa_id', form.empresa_id)
      .eq('archivado', false)
      .order('numero', { ascending: false })
      .then(({ data }) => {
        if (vivo) setCotizaciones((data ?? []) as CotOpcion[]);
      });
    return () => { vivo = false; };
  }, [form.empresa_id]);

  const esUF = form.moneda === 'UF';
  const neto = esUF ? Math.round((Number(form.monto_uf) || 0) * (Number(form.uf_valor) || 0)) : Number(form.monto_neto) || 0;
  const iva = form.tipo_documento === 33 ? Math.round(neto * (cfg.iva_pct / 100)) : 0;
  const total = neto + iva;

  const elegirEmpresa = (id: string) => {
    const e = empresasDisponibles.find((x) => x.id === id);
    setForm({ ...form, empresa_id: id, cotizacion_id: '', oportunidad_id: '', fecha_vencimiento: sumarDias(form.fecha_emision, e?.dias_pago ?? 30) });
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.empresa_id) return setError('Elige el cliente.');
    const folio = Number(form.folio);
    if (!Number.isInteger(folio) || folio <= 0) return setError('Ingresa el folio que te asignó el SII.');
    if (!form.fecha_emision) return setError('Falta la fecha de emisión.');
    if (esUF) {
      if (!(Number(form.monto_uf) > 0)) return setError('Ingresa el monto en UF.');
      if (!(Number(form.uf_valor) > 0)) return setError('Ingresa el valor de la UF de la fecha de facturación.');
      if (!form.uf_fecha) return setError('Falta la fecha de la UF.');
    }
    if (neto <= 0) return setError('El monto neto debe ser mayor a cero.');
    if (form.estado_pago === 'pagada' && !form.fecha_pago) return setError('Indica la fecha en que se pagó.');
    if (delCliente.some((f) => f.tipo_documento === form.tipo_documento && f.folio === folio && f.id !== inicial?.id)) {
      return setError('Ya existe una factura de ese tipo y folio para este cliente.');
    }

    const payload = {
      empresa_id: form.empresa_id,
      tipo_documento: form.tipo_documento,
      folio,
      fecha_emision: form.fecha_emision,
      fecha_vencimiento: form.fecha_vencimiento || null,
      moneda: form.moneda,
      monto_uf: esUF ? Number(form.monto_uf) : null,
      uf_valor: esUF ? Number(form.uf_valor) : null,
      uf_fecha: esUF ? form.uf_fecha : null,
      monto_neto: neto,
      monto_iva: iva,
      monto_total: total,
      estado_pago: form.estado_pago,
      fecha_pago: form.estado_pago === 'pagada' ? form.fecha_pago : null,
      medio_pago: form.medio_pago.trim() || null,
      cotizacion_id: form.cotizacion_id || null,
      oportunidad_id: form.oportunidad_id || null,
      url_documento: form.url_documento.trim() || null,
      notas: form.notas.trim() || null,
    };

    if (inicial) {
      await actualizarFactura(inicial.id, payload);
    } else {
      const creada = await crearFactura(payload);
      if (!creada) return;
    }
    onGuardado();
  };

  const fmt = (n: number) => formatCLP(n);

  return (
    <form onSubmit={guardar} className="space-y-4 text-xs">
      {!empresaFija && (
        <div>
          <p className={seccion}>Cliente</p>
          <select className={input} value={form.empresa_id} onChange={(e) => elegirEmpresa(e.target.value)} disabled={!!inicial}>
            <option value="">Elige un cliente…</option>
            {empresasDisponibles.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        </div>
      )}

      <div>
        <p className={seccion}>Documento</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className={etiqueta}>Tipo</label>
            <select className={input} value={form.tipo_documento} onChange={(e) => setForm({ ...form, tipo_documento: Number(e.target.value) as 33 | 34 })}>
              {TIPOS.map((t) => <option key={t.valor} value={t.valor}>{t.texto}</option>)}
            </select>
          </div>
          <div>
            <label className={etiqueta}>Folio SII *</label>
            <input type="number" min={1} className={`${input} font-mono`} value={form.folio} onChange={(e) => setForm({ ...form, folio: e.target.value })} />
          </div>
          <div>
            <label className={etiqueta}>Emisión *</label>
            <input type="date" className={`${input} font-mono`} value={form.fecha_emision} onChange={(e) => setForm({ ...form, fecha_emision: e.target.value, fecha_vencimiento: sumarDias(e.target.value, empresaActual?.dias_pago ?? 30) })} />
          </div>
          <div>
            <label className={etiqueta}>Vencimiento</label>
            <input type="date" className={`${input} font-mono`} value={form.fecha_vencimiento} onChange={(e) => setForm({ ...form, fecha_vencimiento: e.target.value })} />
          </div>
        </div>
      </div>

      <div>
        <p className={seccion}>Vínculos</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={etiqueta}>Negocio</label>
            <select className={input} value={form.oportunidad_id} onChange={(e) => setForm({ ...form, oportunidad_id: e.target.value })} disabled={!form.empresa_id}>
              <option value="">Sin negocio</option>
              {negocios.map((o) => <option key={o.id} value={o.id}>{codigoNegocio(o)} · {o.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className={etiqueta}>Cotización</label>
            <select className={input} value={form.cotizacion_id} disabled={!form.empresa_id} onChange={(e) => {
              const id = e.target.value;
              const cot = cotizaciones.find((c) => c.id === id);
              setForm({ ...form, cotizacion_id: id, oportunidad_id: form.oportunidad_id || cot?.oportunidad_id || form.oportunidad_id });
            }}>
              <option value="">Facturación directa (sin cotización)</option>
              {cotizaciones.map((c) => <option key={c.id} value={c.id}>COT-{String(c.numero).padStart(4, '0')} · {c.titulo}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div>
        <p className={seccion}>Montos</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={etiqueta}>Moneda</label>
            <div className="flex gap-1 p-0.5 rounded bg-[var(--c-surface-2)] w-fit">
              {(['CLP', 'UF'] as const).map((m) => (
                <button key={m} type="button" onClick={() => setForm({ ...form, moneda: m })} className={`px-3 py-1 rounded text-xs ${form.moneda === m ? 'bg-[var(--c-surface)] text-[var(--c-text)] font-semibold' : 'text-[var(--c-muted)]'}`}>{m}</button>
              ))}
            </div>
          </div>
          {esUF ? (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className={etiqueta}>Monto UF *</label>
                <input type="number" min={0} step="0.0001" className={`${input} font-mono`} value={form.monto_uf} onChange={(e) => setForm({ ...form, monto_uf: e.target.value })} />
              </div>
              <div>
                <label className={etiqueta}>Valor UF *</label>
                <input type="number" min={0} step="0.01" className={`${input} font-mono`} value={form.uf_valor} onChange={(e) => setForm({ ...form, uf_valor: e.target.value })} />
              </div>
              <div>
                <label className={etiqueta}>Fecha UF *</label>
                <input type="date" className={`${input} font-mono`} value={form.uf_fecha} onChange={(e) => setForm({ ...form, uf_fecha: e.target.value })} />
              </div>
            </div>
          ) : (
            <div>
              <label className={etiqueta}>Neto (CLP) *</label>
              <input type="number" min={0} className={`${input} font-mono`} value={form.monto_neto} onChange={(e) => setForm({ ...form, monto_neto: e.target.value })} />
            </div>
          )}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 rounded-md bg-[var(--c-surface-2)] p-3">
          <div>
            <p className="text-[10px] font-mono uppercase text-[var(--c-muted)]">Neto</p>
            <p className="font-mono text-[var(--c-text)]">{fmt(neto)}</p>
            {esUF && <p className="text-[10px] font-mono text-[var(--c-muted)]">{form.monto_uf || 0} UF</p>}
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase text-[var(--c-muted)]">IVA {form.tipo_documento === 33 ? `${cfg.iva_pct}%` : '—'}</p>
            <p className="font-mono text-[var(--c-text-2)]">{fmt(iva)}</p>
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase text-[var(--c-muted)]">Total</p>
            <p className="font-mono font-semibold text-[var(--c-text)]">{fmt(total)}</p>
          </div>
        </div>
      </div>

      <div>
        <p className={seccion}>Pago</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={etiqueta}>Estado</label>
            <select className={input} value={form.estado_pago} onChange={(e) => {
              const estado = e.target.value as EstadoFactura;
              setForm({ ...form, estado_pago: estado, fecha_pago: estado === 'pagada' && !form.fecha_pago ? hoyISO() : form.fecha_pago });
            }}>
              {ESTADOS_FACTURA.map((s) => <option key={s.valor} value={s.valor}>{s.texto}</option>)}
            </select>
          </div>
          {form.estado_pago === 'pagada' && (
            <div>
              <label className={etiqueta}>Fecha de pago *</label>
              <input type="date" className={`${input} font-mono`} value={form.fecha_pago} onChange={(e) => setForm({ ...form, fecha_pago: e.target.value })} />
            </div>
          )}
          <div>
            <label className={etiqueta}>Medio de pago</label>
            <input className={input} list="medios-pago" placeholder="Transferencia, cheque…" value={form.medio_pago} onChange={(e) => setForm({ ...form, medio_pago: e.target.value })} />
            <datalist id="medios-pago">{cfg.medios_pago.map((m) => <option key={m} value={m} />)}</datalist>
          </div>
        </div>
      </div>

      <div>
        <p className={seccion}>Respaldo</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={etiqueta}>Enlace al PDF</label>
            <input className={input} placeholder="Link de Drive o del SII" value={form.url_documento} onChange={(e) => setForm({ ...form, url_documento: e.target.value })} />
          </div>
          <div>
            <label className={etiqueta}>Notas</label>
            <input className={input} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
          </div>
        </div>
      </div>

      {error && <p className="text-[11px] text-[var(--c-danger)]">{error}</p>}
      <div className="flex justify-end gap-2.5 pt-2 border-t border-[var(--c-line)]">
        <button type="button" onClick={onCancelar} className="px-3 py-1.5 text-xs text-[var(--c-muted)] hover:text-[var(--c-text)]">Cancelar</button>
        <button type="submit" disabled={!form.empresa_id} className="px-4 py-1.5 text-xs font-semibold bg-[var(--c-accent)] text-black rounded disabled:opacity-40">{inicial ? 'Guardar cambios' : 'Registrar factura'}</button>
      </div>
    </form>
  );
};
