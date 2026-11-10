import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Printer, Trash2, ArrowLeft } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { parseSupabaseError } from '../../lib/errorHandler';
import { formatFecha, formatMoneda, formatRUT, formatCorrelativo } from '../../lib/formatters';
import { PLANES, SETUP_LISTA } from '../../lib/planes';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { Empresa, PlanEmpresa } from '../../types/crm';

type Estado = 'borrador' | 'enviada' | 'aceptada' | 'rechazada' | 'vencida';

interface CotizacionFila {
  id: string;
  numero: number;
  empresa_id: string;
  oportunidad_id: string | null;
  titulo: string;
  estado: Estado;
  fecha_emision: string;
  validez_dias: number;
  moneda: 'CLP' | 'USD';
  iva_pct: number;
  condicion_comision: string;
  condiciones_comerciales: string;
  notas_internas: string | null;
  neto_mensual: number;
  neto_unico: number;
  vence_el: string;
}

interface Linea {
  concepto: string;
  plan: PlanEmpresa | '';
  cantidad: number;
  precio_neto: number;
  recurrente: boolean;
}

const COMISION_BASE =
  'Comisión de gestión de pauta: 15% de la inversión mensual en plataformas, con escala descendente hasta 8% según el monto invertido. La inversión en pauta se paga directamente a cada plataforma y no está incluida en esta cotización.';
const CONDICIONES_BASE =
  'Valores netos en pesos chilenos, más IVA. Cotización válida por el plazo indicado. El servicio inicia con la aceptación y la entrega de accesos de administrador a las plataformas.';

const COLOR_ESTADO: Record<Estado, string> = {
  borrador: 'text-[var(--c-muted)]',
  enviada: 'text-[var(--c-info)]',
  aceptada: 'text-[var(--c-ok)]',
  rechazada: 'text-[var(--c-danger)]',
  vencida: 'text-[var(--c-warn)]',
};

const campo = 'w-full bg-[var(--c-surface)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)]';
const etiqueta = 'block text-[11px] text-[var(--c-muted)] mb-1';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\n/g, '<br>');

const totales = (lineas: Linea[], ivaPct: number) => {
  const mensual = lineas.filter((l) => l.recurrente).reduce((a, l) => a + l.cantidad * l.precio_neto, 0);
  const unico = lineas.filter((l) => !l.recurrente).reduce((a, l) => a + l.cantidad * l.precio_neto, 0);
  const f = 1 + ivaPct / 100;
  return { mensual, unico, mensualIva: Math.round(mensual * f), unicoIva: Math.round(unico * f) };
};

interface CotizacionesClienteProps {
  empresa: Empresa;
  iniciarNueva?: boolean;
  onNuevaUsada?: () => void;
  oportunidadId?: string; // si viene, lista solo las del negocio y las crea vinculadas
}

export const CotizacionesCliente: React.FC<CotizacionesClienteProps> = ({ empresa, iniciarNueva, onNuevaUsada, oportunidadId }) => {
  const { oportunidades } = useCRM();
  const { currentUser } = useAuth();
  const [filas, setFilas] = useState<CotizacionFila[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState<CotizacionFila | 'nueva' | null>(iniciarNueva ? 'nueva' : null);

  // La orden «Nueva cotización» desde el módulo se consume una sola vez
  useEffect(() => {
    if (iniciarNueva) onNuevaUsada?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargar = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    setCargando(true);
    const { data, error: err } = await supabase
      .from('v_cotizaciones')
      .select('*')
      .eq('empresa_id', empresa.id)
      .match(oportunidadId ? { oportunidad_id: oportunidadId } : {})
      .order('numero', { ascending: false });
    if (err) setError(parseSupabaseError(err));
    else setFilas(((data ?? []) as CotizacionFila[]).map((f) => ({ ...f, neto_mensual: Number(f.neto_mensual), neto_unico: Number(f.neto_unico), iva_pct: Number(f.iva_pct) })));
    setCargando(false);
  }, [empresa.id, oportunidadId]);

  useEffect(() => { cargar(); }, [cargar]);

  if (!isSupabaseConfigured) return <p className="text-xs text-[var(--c-muted)]">Las cotizaciones requieren conexión a la base de datos.</p>;

  if (editando) {
    return (
      <Editor
        empresa={empresa}
        inicial={editando === 'nueva' ? null : editando}
        oportunidades={oportunidades.filter((o) => o.empresa_id === empresa.id && !o.archivado).map((o) => ({ id: o.id, nombre: o.nombre }))}
        creadaPor={currentUser?.id ?? null}
        oportunidadInicial={oportunidadId}
        onVolver={() => { setEditando(null); cargar(); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-[var(--c-text)]">Cotizaciones</h3>
        <button
          onClick={() => setEditando('nueva')}
          className="text-xs text-[var(--c-on-accent)] bg-[var(--c-accent)] hover:bg-[var(--c-accent-hover)] px-2.5 py-1 rounded font-medium flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> Nueva cotización
        </button>
      </div>
      {error && <p className="text-xs text-[var(--c-danger)]">{error}</p>}
      {cargando && filas.length === 0 ? (
        <p className="text-xs text-[var(--c-muted)]">Cargando…</p>
      ) : filas.length === 0 ? (
        <p className="text-xs text-[var(--c-muted)] py-4 text-center">Aún no hay cotizaciones para este cliente.</p>
      ) : (
        <div className="divide-y divide-[var(--c-line)] border border-[var(--c-line)] rounded-lg">
          {filas.map((c) => {
            const t = totales([{ concepto: '', plan: '', cantidad: 1, precio_neto: c.neto_mensual, recurrente: true }, { concepto: '', plan: '', cantidad: 1, precio_neto: c.neto_unico, recurrente: false }], c.iva_pct);
            return (
              <button key={c.id} onClick={() => setEditando(c)} className="w-full text-left p-3 hover:bg-[var(--c-surface-2)] flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <p className="font-medium text-[var(--c-text)] truncate">{formatCorrelativo('COT', c.numero)} · {c.titulo}</p>
                  <p className="text-[11px] text-[var(--c-muted)] font-mono">Emitida {formatFecha(c.fecha_emision)} · vence {formatFecha(c.vence_el)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono text-[var(--c-text)]">{formatMoneda(t.mensualIva, c.moneda)} /mes</p>
                  {c.neto_unico > 0 && <p className="font-mono text-[11px] text-[var(--c-muted)]">+ {formatMoneda(t.unicoIva, c.moneda)} único</p>}
                  <p className={`text-[10px] font-mono uppercase ${COLOR_ESTADO[c.estado]}`}>{c.estado}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
      <p className="text-[10px] text-[var(--c-muted)]">Totales con IVA. Las facturas se registran aparte (etapa siguiente).</p>
    </div>
  );
};

interface EditorProps {
  empresa: Empresa;
  inicial: CotizacionFila | null;
  oportunidades: { id: string; nombre: string }[];
  creadaPor: string | null;
  oportunidadInicial?: string;
  onVolver: () => void;
}

const Editor: React.FC<EditorProps> = ({ empresa, inicial, oportunidades, creadaPor, oportunidadInicial, onVolver }) => {
  const [titulo, setTitulo] = useState(inicial?.titulo ?? `Propuesta ${empresa.nombre}`);
  const [estado, setEstado] = useState<Estado>(inicial?.estado ?? 'borrador');
  const [oportunidadId, setOportunidadId] = useState(inicial?.oportunidad_id ?? oportunidadInicial ?? '');
  const [validez, setValidez] = useState(String(inicial?.validez_dias ?? 15));
  const [ivaPct, setIvaPct] = useState(String(inicial?.iva_pct ?? 19));
  const [moneda, setMoneda] = useState<'CLP' | 'USD'>(inicial?.moneda ?? 'CLP');
  const [comision, setComision] = useState(inicial?.condicion_comision ?? COMISION_BASE);
  const [condiciones, setCondiciones] = useState(inicial?.condiciones_comerciales ?? CONDICIONES_BASE);
  const [notas, setNotas] = useState(inicial?.notas_internas ?? '');
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!inicial || !supabase) {
      if (!inicial) setLineas([{ concepto: 'Gestión mensual', plan: '', cantidad: 1, precio_neto: 0, recurrente: true }]);
      return;
    }
    supabase.from('cotizacion_items').select('*').eq('cotizacion_id', inicial.id).order('orden').then(({ data, error: err }) => {
      if (err) { setError(parseSupabaseError(err)); return; }
      setLineas((data ?? []).map((i) => ({ concepto: i.concepto, plan: (i.plan ?? '') as PlanEmpresa | '', cantidad: Number(i.cantidad), precio_neto: Number(i.precio_neto), recurrente: i.recurrente })));
    });
  }, [inicial]);

  const iva = Number(ivaPct);
  const t = useMemo(() => totales(lineas, Number.isFinite(iva) ? iva : 19), [lineas, iva]);

  const cambiar = (i: number, cambios: Partial<Linea>) => setLineas((prev) => prev.map((l, k) => (k === i ? { ...l, ...cambios } : l)));

  const elegirPlan = (i: number, plan: PlanEmpresa | '') => {
    if (!plan) return cambiar(i, { plan: '' });
    const p = PLANES[plan];
    cambiar(i, { plan, concepto: plan === 'personalizado' ? lineas[i].concepto : `Plan ${plan} · ${p.nombre}`, precio_neto: plan === 'personalizado' ? lineas[i].precio_neto : p.valor, recurrente: plan !== 'E' });
  };

  // Datos legales mínimos: sin ellos no se puede enviar ni aceptar una cotización
  const faltantesTributarios = [
    !empresa.razon_social && 'razón social',
    !empresa.rut && 'RUT',
    !empresa.giro && 'giro',
    !empresa.direccion_facturacion && 'dirección',
  ].filter(Boolean) as string[];
  const requiereDatos = estado === 'enviada' || estado === 'aceptada';

  const guardar = async () => {
    if (!supabase) return;
    if (requiereDatos && faltantesTributarios.length > 0) {
      return setError(`Para marcar la cotización como ${estado} faltan datos del cliente: ${faltantesTributarios.join(', ')}. Complétalos en «Datos legales y tributarios».`);
    }
    if (!titulo.trim()) return setError('Falta el título');
    if (lineas.length === 0 || lineas.some((l) => !l.concepto.trim())) return setError('Cada línea necesita un concepto');
    if (lineas.some((l) => !(l.cantidad > 0) || l.precio_neto < 0)) return setError('Revisa cantidades y precios');
    const v = Number(validez);
    if (!Number.isInteger(v) || v < 1 || v > 180) return setError('Validez entre 1 y 180 días');
    if (!Number.isFinite(iva) || iva < 0 || iva > 100) return setError('IVA entre 0 y 100');

    setGuardando(true);
    setError(null);
    const cab = {
      empresa_id: empresa.id,
      oportunidad_id: oportunidadId || null,
      titulo: titulo.trim(),
      estado,
      validez_dias: v,
      moneda,
      iva_pct: iva,
      condicion_comision: comision,
      condiciones_comerciales: condiciones,
      notas_internas: notas || null,
    };
    let id = inicial?.id;
    if (inicial) {
      const { error: e1 } = await supabase.from('cotizaciones').update(cab).eq('id', inicial.id);
      if (e1) { setError(parseSupabaseError(e1)); setGuardando(false); return; }
      const { error: e2 } = await supabase.from('cotizacion_items').delete().eq('cotizacion_id', inicial.id);
      if (e2) { setError(parseSupabaseError(e2)); setGuardando(false); return; }
    } else {
      const { data, error: e1 } = await supabase.from('cotizaciones').insert({ ...cab, creada_por: creadaPor }).select('id').single();
      if (e1 || !data) { setError(parseSupabaseError(e1)); setGuardando(false); return; }
      id = data.id;
    }
    const { error: e3 } = await supabase.from('cotizacion_items').insert(
      lineas.map((l, k) => ({ cotizacion_id: id, orden: k + 1, concepto: l.concepto.trim(), plan: l.plan || null, cantidad: l.cantidad, precio_neto: l.precio_neto, recurrente: l.recurrente }))
    );
    setGuardando(false);
    if (e3) { setError(`Se guardó la cabecera pero fallaron las líneas: ${parseSupabaseError(e3)}`); return; }
    onVolver();
  };

  const imprimir = () => {
    const filasHtml = lineas
      .map((l) => `<tr><td>${esc(l.concepto)}</td><td class="n">${l.cantidad}</td><td class="n">${esc(formatMoneda(l.precio_neto, moneda))}</td><td class="n">${esc(formatMoneda(l.cantidad * l.precio_neto, moneda))}</td><td>${l.recurrente ? 'Mensual' : 'Pago único'}</td></tr>`)
      .join('');
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${inicial ? formatCorrelativo('COT', inicial.numero) : 'Cotización'} · ${esc(empresa.nombre)}</title>
<style>body{font-family:Arial,sans-serif;color:#0A0A0A;margin:40px;font-size:13px}h1{font-size:20px;margin:0}table{width:100%;border-collapse:collapse;margin:16px 0}th,td{border-bottom:1px solid #ddd;padding:8px;text-align:left}th{background:#F5F5F5}.n{text-align:right}.tot td{border:0;padding:3px 8px}.sm{color:#555;font-size:12px}.box{margin-top:14px}</style></head><body>
<h1>Cotización ${inicial ? formatCorrelativo('COT', inicial.numero) : '(borrador)'} · P48</h1>
<p class="sm">${esc(titulo)}<br>Emisión: ${esc(formatFecha(inicial?.fecha_emision ?? new Date()))} · Válida ${esc(validez)} días</p>
<p><b>${esc(empresa.razon_social || empresa.nombre)}</b><br>${empresa.rut ? 'RUT ' + esc(formatRUT(empresa.rut)) + '<br>' : ''}${empresa.giro ? esc(empresa.giro) + '<br>' : ''}${empresa.direccion_facturacion ? esc(empresa.direccion_facturacion) : ''}</p>
<table><thead><tr><th>Concepto</th><th class="n">Cant.</th><th class="n">Precio neto</th><th class="n">Subtotal neto</th><th>Tipo</th></tr></thead><tbody>${filasHtml}</tbody></table>
<table class="tot" style="width:320px;margin-left:auto">
<tr><td>Neto mensual</td><td class="n">${esc(formatMoneda(t.mensual, moneda))}</td></tr>
<tr><td>Neto pago único</td><td class="n">${esc(formatMoneda(t.unico, moneda))}</td></tr>
<tr><td>IVA ${esc(ivaPct)}%</td><td class="n">${esc(formatMoneda(t.mensualIva + t.unicoIva - t.mensual - t.unico, moneda))}</td></tr>
<tr><td><b>Total mensual con IVA</b></td><td class="n"><b>${esc(formatMoneda(t.mensualIva, moneda))}</b></td></tr>
<tr><td><b>Total único con IVA</b></td><td class="n"><b>${esc(formatMoneda(t.unicoIva, moneda))}</b></td></tr></table>
<div class="box"><b>Comisión de pauta</b><br>${esc(comision)}</div>
<div class="box"><b>Condiciones</b><br>${esc(condiciones)}</div>
<p class="sm box">Condición de pago: ${empresa.dias_pago ?? 30} días.</p></body></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    const w = window.open(url, '_blank', 'noopener');
    if (w) setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  return (
    <div className="space-y-4">
      <button onClick={onVolver} className="text-xs text-[var(--c-muted)] hover:text-[var(--c-text)] flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> Volver a cotizaciones</button>
      <h3 className="text-sm font-semibold text-[var(--c-text)]">{inicial ? `Cotización ${formatCorrelativo('COT', inicial.numero)}` : 'Nueva cotización'}</h3>

      {faltantesTributarios.length > 0 && (
        <div className="text-xs rounded border border-[var(--c-warn)] bg-[var(--c-surface-2)] p-3 text-[var(--c-text-2)]">
          Al cliente le faltan datos tributarios: <b className="text-[var(--c-text)]">{faltantesTributarios.join(', ')}</b>.
          Puedes guardar como borrador, pero no enviar ni aceptar hasta completarlos en «Datos legales y tributarios» (pestaña Datos &amp; Accesos).
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2"><label className={etiqueta}>Título</label><input className={campo} value={titulo} onChange={(e) => setTitulo(e.target.value)} /></div>
        <div><label className={etiqueta}>Estado</label>
          <select className={campo} value={estado} onChange={(e) => setEstado(e.target.value as Estado)}>
            {(['borrador', 'enviada', 'aceptada', 'rechazada', 'vencida'] as Estado[]).map((e) => <option key={e} value={e}>{e}</option>)}
          </select></div>
        <div><label className={etiqueta}>Negocio asociado</label>
          <select className={campo} value={oportunidadId} onChange={(e) => setOportunidadId(e.target.value)}>
            <option value="">Sin negocio</option>
            {oportunidades.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
          </select></div>
        <div><label className={etiqueta}>Validez (días)</label><input type="number" className={`${campo} font-mono`} value={validez} onChange={(e) => setValidez(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={etiqueta}>Moneda</label>
            <select className={campo} value={moneda} onChange={(e) => setMoneda(e.target.value as 'CLP' | 'USD')}><option value="CLP">CLP</option><option value="USD">USD</option></select></div>
          <div><label className={etiqueta}>IVA %</label><input type="number" className={`${campo} font-mono`} value={ivaPct} onChange={(e) => setIvaPct(e.target.value)} /></div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-mono uppercase text-[var(--c-muted)]">Líneas</p>
          <div className="flex gap-2">
            <button onClick={() => setLineas((p) => [...p, { concepto: 'Setup inicial', plan: '', cantidad: 1, precio_neto: SETUP_LISTA, recurrente: false }])} className="text-[11px] text-[var(--c-accent)]">+ Setup</button>
            <button onClick={() => setLineas((p) => [...p, { concepto: '', plan: '', cantidad: 1, precio_neto: 0, recurrente: true }])} className="text-[11px] text-[var(--c-accent)]">+ Línea</button>
          </div>
        </div>
        {lineas.map((l, i) => (
          <div key={i} className="border border-[var(--c-line)] rounded p-2.5 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-2">
              <select className={campo} value={l.plan} onChange={(e) => elegirPlan(i, e.target.value as PlanEmpresa | '')} aria-label="Plan de la línea">
                <option value="">Libre</option>
                {(Object.keys(PLANES) as PlanEmpresa[]).map((p) => <option key={p} value={p}>{p === 'personalizado' ? 'Personalizado' : `Plan ${p}`}</option>)}
              </select>
              <input className={campo} placeholder="Concepto" value={l.concepto} onChange={(e) => cambiar(i, { concepto: e.target.value })} />
            </div>
            <div className="grid grid-cols-[64px_1fr_auto] sm:grid-cols-[70px_1fr_auto_auto] gap-2 items-center">
              <input type="number" min={0} step="any" className={`${campo} font-mono`} value={l.cantidad} onChange={(e) => cambiar(i, { cantidad: Number(e.target.value) })} aria-label="Cantidad" />
              <input type="number" min={0} className={`${campo} font-mono`} value={l.precio_neto} onChange={(e) => cambiar(i, { precio_neto: Number(e.target.value) })} aria-label="Precio neto" />
              <label className="col-span-2 sm:col-span-1 text-[11px] text-[var(--c-muted)] flex items-center gap-1"><input type="checkbox" checked={l.recurrente} onChange={(e) => cambiar(i, { recurrente: e.target.checked })} /> Mensual</label>
              <button onClick={() => setLineas((p) => p.filter((_, k) => k !== i))} aria-label="Quitar línea" className="justify-self-end text-[var(--c-muted)] hover:text-[var(--c-danger)] p-1"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
        <div className="text-[11px] sm:text-xs font-mono text-right space-y-0.5 text-[var(--c-text-2)] break-words">
          <p>Mensual: {formatMoneda(t.mensual, moneda)} neto · <b className="text-[var(--c-text)]">{formatMoneda(t.mensualIva, moneda)}</b> con IVA</p>
          <p>Único: {formatMoneda(t.unico, moneda)} neto · <b className="text-[var(--c-text)]">{formatMoneda(t.unicoIva, moneda)}</b> con IVA</p>
        </div>
      </div>

      <div><label className={etiqueta}>Condición de comisión de pauta (editable)</label><textarea rows={3} className={campo} value={comision} onChange={(e) => setComision(e.target.value)} /></div>
      <div><label className={etiqueta}>Condiciones comerciales (editable)</label><textarea rows={3} className={campo} value={condiciones} onChange={(e) => setCondiciones(e.target.value)} /></div>
      <div><label className={etiqueta}>Notas internas (no salen en la cotización)</label><textarea rows={2} className={campo} value={notas} onChange={(e) => setNotas(e.target.value)} /></div>

      {error && <p className="text-xs text-[var(--c-danger)]">{error}</p>}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-[var(--c-line)]">
        <button onClick={imprimir} className="px-3 py-2 text-xs border border-[var(--c-line)] rounded flex items-center gap-1.5 text-[var(--c-text-2)] hover:text-[var(--c-text)]"><Printer className="w-3.5 h-3.5" /> Vista imprimible</button>
        <button onClick={guardar} disabled={guardando} className="px-4 py-2 text-xs font-semibold bg-[var(--c-accent)] text-[var(--c-on-accent)] rounded disabled:opacity-50">{guardando ? 'Guardando…' : 'Guardar'}</button>
      </div>
    </div>
  );
};
