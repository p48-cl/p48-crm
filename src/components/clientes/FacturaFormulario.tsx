import React, { useEffect, useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useConfiguracionCRM } from '../../lib/configuracion';
import { formatCLP } from '../../lib/formatters';
import type { Empresa, EstadoFactura, Factura } from '../../types/crm';

const input = 'w-full bg-[var(--c-field)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)] hover:border-[var(--c-muted)] focus:border-[var(--c-accent)] outline-none transition-colors';
const etiqueta = 'block text-[11px] text-[var(--c-muted)] mb-1';

const TIPOS: { valor: 33 | 34; texto: string }[] = [
  { valor: 33, texto: 'Factura afecta (33)' },
  { valor: 34, texto: 'Factura exenta (34)' },
];

export const ESTADOS_FACTURA: { valor: EstadoFactura; texto: string; clase: string }[] = [
  { valor: 'pendiente', texto: 'Pendiente', clase: 'text-[var(--c-warn)]' },
  { valor: 'pagada', texto: 'Pagada', clase: 'text-[var(--c-ok)]' },
  { valor: 'anulada', texto: 'Anulada', clase: 'text-[var(--c-muted)]' },
];

interface CotOpcion { id: string; numero: number; titulo: string }

interface Form {
  tipo_documento: 33 | 34;
  folio: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  monto_neto: string;
  estado_pago: EstadoFactura;
  fecha_pago: string;
  medio_pago: string;
  cotizacion_id: string;
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

const formVacio = (empresa: Empresa): Form => {
  const emision = hoyISO();
  return {
    tipo_documento: 33,
    folio: '',
    fecha_emision: emision,
    fecha_vencimiento: sumarDias(emision, empresa.dias_pago ?? 30),
    monto_neto: '',
    estado_pago: 'pendiente',
    fecha_pago: '',
    medio_pago: '',
    cotizacion_id: '',
    url_documento: '',
    notas: '',
  };
};

const formDesde = (f: Factura): Form => ({
  tipo_documento: f.tipo_documento,
  folio: String(f.folio),
  fecha_emision: soloFecha(f.fecha_emision),
  fecha_vencimiento: soloFecha(f.fecha_vencimiento),
  monto_neto: String(f.monto_neto),
  estado_pago: f.estado_pago,
  fecha_pago: soloFecha(f.fecha_pago),
  medio_pago: f.medio_pago ?? '',
  cotizacion_id: f.cotizacion_id ?? '',
  url_documento: f.url_documento ?? '',
  notas: f.notas ?? '',
});

interface Props {
  empresa: Empresa;
  // Si viene, el formulario edita esta factura; si no, registra una nueva
  inicial?: Factura | null;
  onGuardado: () => void;
  onCancelar: () => void;
}

// Formulario de registro/edición de una factura. Lo usa la ficha del cliente y la vista global de facturas.
export const FacturaFormulario: React.FC<Props> = ({ empresa, inicial, onGuardado, onCancelar }) => {
  const { facturas, crearFactura, actualizarFactura } = useCRM();
  const { config: cfg } = useConfiguracionCRM();
  const [form, setForm] = useState<Form>(() => (inicial ? formDesde(inicial) : formVacio(empresa)));
  const [error, setError] = useState<string | null>(null);
  const [cotizaciones, setCotizaciones] = useState<CotOpcion[]>([]);

  const delCliente = facturas.filter((f) => f.empresa_id === empresa.id);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    let vivo = true;
    supabase
      .from('v_cotizaciones')
      .select('id,numero,titulo')
      .eq('empresa_id', empresa.id)
      .order('numero', { ascending: false })
      .then(({ data }) => {
        if (vivo) setCotizaciones((data ?? []) as CotOpcion[]);
      });
    return () => { vivo = false; };
  }, [empresa.id]);

  const neto = Number(form.monto_neto) || 0;
  const iva = form.tipo_documento === 33 ? Math.round(neto * (cfg.iva_pct / 100)) : 0;
  const total = neto + iva;

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    const folio = Number(form.folio);
    if (!Number.isInteger(folio) || folio <= 0) return setError('Ingresa el folio que te asignó el SII.');
    if (neto <= 0) return setError('El monto neto debe ser mayor a cero.');
    if (!form.fecha_emision) return setError('Falta la fecha de emisión.');
    if (form.estado_pago === 'pagada' && !form.fecha_pago) return setError('Indica la fecha en que se pagó.');
    if (delCliente.some((f) => f.tipo_documento === form.tipo_documento && f.folio === folio && f.id !== inicial?.id)) {
      return setError('Ya existe una factura con ese tipo y folio.');
    }

    const payload = {
      empresa_id: empresa.id,
      tipo_documento: form.tipo_documento,
      folio,
      fecha_emision: form.fecha_emision,
      fecha_vencimiento: form.fecha_vencimiento || null,
      monto_neto: neto,
      monto_iva: iva,
      monto_total: total,
      estado_pago: form.estado_pago,
      fecha_pago: form.estado_pago === 'pagada' ? form.fecha_pago : null,
      medio_pago: form.medio_pago.trim() || null,
      cotizacion_id: form.cotizacion_id || null,
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

  return (
    <form onSubmit={guardar} className="ficha-card p-4 space-y-3 text-xs">
      <p className="text-[11px] text-[var(--c-muted)]">Copia los datos desde el SII. El IVA se calcula al {cfg.iva_pct}% para facturas afectas.</p>
      <div className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-3 gap-3">
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
          <label className={etiqueta}>Cotización (opcional)</label>
          <select className={input} value={form.cotizacion_id} onChange={(e) => setForm({ ...form, cotizacion_id: e.target.value })}>
            <option value="">Sin cotización</option>
            {cotizaciones.map((c) => <option key={c.id} value={c.id}>COT-{String(c.numero).padStart(4, '0')} · {c.titulo}</option>)}
          </select>
        </div>
        <div>
          <label className={etiqueta}>Fecha emisión *</label>
          <input type="date" className={`${input} font-mono`} value={form.fecha_emision} onChange={(e) => setForm({ ...form, fecha_emision: e.target.value, fecha_vencimiento: sumarDias(e.target.value, empresa.dias_pago ?? 30) })} />
        </div>
        <div>
          <label className={etiqueta}>Vencimiento</label>
          <input type="date" className={`${input} font-mono`} value={form.fecha_vencimiento} onChange={(e) => setForm({ ...form, fecha_vencimiento: e.target.value })} />
        </div>
        <div>
          <label className={etiqueta}>Neto (CLP) *</label>
          <input type="number" min={0} className={`${input} font-mono`} value={form.monto_neto} onChange={(e) => setForm({ ...form, monto_neto: e.target.value })} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
        <div>
          <p className={etiqueta}>IVA</p>
          <p className="font-mono text-[var(--c-text-2)] py-1.5">{formatCLP(iva)}</p>
        </div>
        <div>
          <p className={etiqueta}>Total</p>
          <p className="font-mono text-[var(--c-text)] font-semibold py-1.5">{formatCLP(total)}</p>
        </div>
        <div>
          <label className={etiqueta}>Estado de pago</label>
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
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-2 gap-3">
        <div>
          <label className={etiqueta}>Medio de pago</label>
          <input className={input} list="medios-pago" placeholder="Transferencia, cheque…" value={form.medio_pago} onChange={(e) => setForm({ ...form, medio_pago: e.target.value })} />
          <datalist id="medios-pago">{cfg.medios_pago.map((m) => <option key={m} value={m} />)}</datalist>
        </div>
        <div>
          <label className={etiqueta}>Enlace al PDF</label>
          <input className={input} placeholder="Link de Drive o del SII" value={form.url_documento} onChange={(e) => setForm({ ...form, url_documento: e.target.value })} />
        </div>
      </div>
      <div>
        <label className={etiqueta}>Notas</label>
        <input className={input} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
      </div>

      {error && <p className="text-[11px] text-[var(--c-danger)]">{error}</p>}
      <div className="flex justify-end gap-2.5 pt-2 border-t border-[var(--c-line)]">
        <button type="button" onClick={onCancelar} className="px-3 py-1.5 text-xs text-[var(--c-muted)] hover:text-[var(--c-text)]">Cancelar</button>
        <button type="submit" className="px-4 py-1.5 text-xs font-semibold bg-[var(--c-accent)] text-black rounded">{inicial ? 'Guardar cambios' : 'Registrar factura'}</button>
      </div>
    </form>
  );
};
