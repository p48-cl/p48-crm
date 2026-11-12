import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Printer, Trash2, ArrowLeft, Pencil } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { parseSupabaseError } from '../../lib/errorHandler';
import { formatFecha, formatMoneda, formatRUT, formatCorrelativo, formatCLP } from '../../lib/formatters';
import { usePlanes } from '../../lib/planes';
import { EncabezadoDoc, FilaKpis, TablaDoc, COLUMNAS_DOC, celda, filaClase } from './DocumentosUI';
import { useConfiguracionCRM } from '../../lib/configuracion';
import { estadoEfectivo, convertirMoneda, redondear, MonedaCotizacion, estiloEstado, ESTADOS_COTIZACION } from '../../lib/cotizaciones';
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
  moneda: MonedaCotizacion;
  uf_valor?: number | null;
  uf_fecha?: string | null;
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

const campo = 'w-full bg-[var(--c-surface)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)]';
const etiqueta = 'block text-[11px] text-[var(--c-muted)] mb-1';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\n/g, '<br>');

const totales = (lineas: Linea[], ivaPct: number, moneda: MonedaCotizacion) => {
  const mensual = lineas.filter((l) => l.recurrente).reduce((a, l) => a + l.cantidad * l.precio_neto, 0);
  const unico = lineas.filter((l) => !l.recurrente).reduce((a, l) => a + l.cantidad * l.precio_neto, 0);
  const f = 1 + ivaPct / 100;
  return {
    mensual,
    unico,
    mensualIva: redondear(mensual * f, moneda),
    unicoIva: redondear(unico * f, moneda),
  };
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
  const { config: cfg } = useConfiguracionCRM();
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

  const sumaMes = (xs: CotizacionFila[]) => {
    const monedas = new Set(xs.map((c) => c.moneda));
    if (xs.length === 0 || monedas.size !== 1) return undefined;
    return `${formatMoneda(xs.reduce((acc, c) => acc + redondear(c.neto_mensual * (1 + c.iva_pct / 100), c.moneda), 0), xs[0].moneda)} /mes`;
  };

  return (
    <div className="space-y-4">
      <EncabezadoDoc titulo="Cotizaciones" subtitulo="Propuestas comerciales con IVA. Haz clic en una para abrirla." botonTexto="Nueva cotización" onBoton={() => setEditando('nueva')} />
      {error && <p className="text-xs text-[var(--c-danger)]">{error}</p>}
      <FilaKpis
        items={(['enviada', 'aceptada', 'rechazada', 'vencida'] as Estado[]).map((e) => {
          const grupo = filas.filter((c) => (estadoEfectivo(c) as Estado) === e);
          const st = estiloEstado(cfg.estados_cotizacion, e);
          return { etiqueta: st.etiqueta, claseEtiqueta: st.clase, color: st.color, valor: `${grupo.length} cotización(es)`, sub: sumaMes(grupo) };
        })}
      />
      {cargando && filas.length === 0 ? (
        <p className="text-xs text-[var(--c-muted)]">Cargando…</p>
      ) : (
        <TablaDoc columnas={COLUMNAS_DOC} hayFilas={filas.length > 0} vacio="Aún no hay cotizaciones para este cliente.">
          {filas.map((c) => {
            const estado = estadoEfectivo(c) as Estado;
            const st = estiloEstado(cfg.estados_cotizacion, estado);
            const t = totales([{ concepto: '', plan: '', cantidad: 1, precio_neto: c.neto_mensual, recurrente: true }, { concepto: '', plan: '', cantidad: 1, precio_neto: c.neto_unico, recurrente: false }], c.iva_pct, c.moneda);
            return (
              <tr key={c.id} onClick={() => setEditando(c)} className={`${filaClase} cursor-pointer hover:bg-[var(--c-surface-2)]`}>
                <td className={`${celda} font-mono text-[var(--c-text)]`}>{formatCorrelativo('COT', c.numero)}</td>
                <td className={`${celda} text-[var(--c-text-2)] max-w-[220px] truncate`}>{c.titulo}</td>
                <td className={`${celda} font-mono text-[var(--c-muted)]`}>{formatFecha(c.fecha_emision)}</td>
                <td className={`${celda} font-mono text-[var(--c-muted)]`}>{formatFecha(c.vence_el)}</td>
                <td className={`${celda} font-mono text-right text-[var(--c-text)] whitespace-nowrap`}>
                  {formatMoneda(t.mensualIva, c.moneda)} /mes
                  {c.neto_unico > 0 && <span className="block text-[10px] text-[var(--c-muted)]">+ {formatMoneda(t.unicoIva, c.moneda)} único</span>}
                </td>
                <td className={`${celda} font-medium ${st.clase}`}>{st.etiqueta}</td>
                <td className={celda}>
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={(e) => { e.stopPropagation(); setEditando(c); }} title="Abrir" className="p-1.5 text-[var(--c-muted)] hover:text-[var(--c-text)]"><Pencil className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            );
          })}
        </TablaDoc>
      )}
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

export const Editor: React.FC<EditorProps> = ({ empresa, inicial, oportunidades, creadaPor, oportunidadInicial, onVolver }) => {
  const { PLANES, codigos, SETUP_LISTA } = usePlanes();
  const { config: cfg } = useConfiguracionCRM();
  const [titulo, setTitulo] = useState(inicial?.titulo ?? `Propuesta ${empresa.nombre}`);
  const [estado, setEstado] = useState<Estado>(inicial?.estado ?? 'borrador');
  const [oportunidadId, setOportunidadId] = useState(inicial?.oportunidad_id ?? oportunidadInicial ?? '');
  const [validez, setValidez] = useState(String(inicial?.validez_dias ?? cfg.cotizacion_validez_dias));
  const [ivaPct, setIvaPct] = useState(String(inicial?.iva_pct ?? cfg.iva_pct));
  const [moneda, setMoneda] = useState<MonedaCotizacion>(inicial?.moneda ?? 'CLP');
  // Valor UF congelado en la cotización (snapshot). Si es nueva, se toma el último valor de uf_diaria.
  const [uf, setUf] = useState<{ valor: number; fecha: string } | null>(
    inicial?.uf_valor && inicial?.uf_fecha ? { valor: Number(inicial.uf_valor), fecha: inicial.uf_fecha } : null
  );
  const [ufError, setUfError] = useState<string | null>(null);

  const cargarUfActual = useCallback(async () => {
    if (!supabase) return null;
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
    const { data, error: err } = await supabase
      .from('uf_diaria').select('fecha,valor').lte('fecha', hoy).order('fecha', { ascending: false }).limit(1).maybeSingle();
    if (err || !data) return null;
    return { valor: Number(data.valor), fecha: data.fecha as string };
  }, []);

  // Carga la UF solo si la cotización está en UF y aún no tiene snapshot
  useEffect(() => {
    if (moneda !== 'UF' || uf) return;
    cargarUfActual().then((v) => {
      if (v) { setUf(v); setUfError(null); }
      else setUfError('No hay valor UF disponible. Revisa la carga diaria de UF.');
    });
  }, [moneda, uf, cargarUfActual]);

  // Precio de lista (CLP) → moneda de la cotización. En UF sin valor cargado no hay conversión posible.
  const ufListo = moneda === 'CLP' || uf !== null;
  const aMoneda = (clp: number) => (moneda === 'UF' && uf ? redondear(clp / uf.valor, 'UF') : clp);

  // Cambiar moneda convierte los precios de las líneas (no solo la etiqueta)
  const cambiarMoneda = async (nueva: MonedaCotizacion) => {
    if (nueva === moneda) return;
    let valor: number | null = uf?.valor ?? null;
    if (valor === null) {
      const v = await cargarUfActual();
      if (!v) { setUfError('No hay valor UF disponible. Revisa la carga diaria de UF.'); return; }
      setUf(v);
      setUfError(null);
      valor = v.valor;
    }
    const valorFinal = valor;
    setLineas((prev) => prev.map((l) => ({ ...l, precio_neto: convertirMoneda(l.precio_neto, moneda, nueva, valorFinal) })));
    setMoneda(nueva);
  };

  const [comision, setComision] = useState(inicial?.condicion_comision ?? cfg.comision_base);
  const [condiciones, setCondiciones] = useState(inicial?.condiciones_comerciales ?? cfg.condiciones_base);
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
  const t = useMemo(() => totales(lineas, Number.isFinite(iva) ? iva : 19, moneda), [lineas, iva, moneda]);

  const cambiar = (i: number, cambios: Partial<Linea>) => setLineas((prev) => prev.map((l, k) => (k === i ? { ...l, ...cambios } : l)));

  const elegirPlan = (i: number, plan: PlanEmpresa | '') => {
    if (!plan) return cambiar(i, { plan: '' });
    if (!ufListo) return setError('Espera a que cargue el valor UF antes de elegir un plan');
    const p = PLANES[plan];
    cambiar(i, { plan, concepto: plan === 'personalizado' ? lineas[i].concepto : `Plan ${plan} · ${p.nombre}`, precio_neto: plan === 'personalizado' ? lineas[i].precio_neto : aMoneda(p.valor), recurrente: plan !== 'E' });
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
    if (moneda === 'UF' && !uf) return setError('No hay valor UF disponible para congelar en la cotización');
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
      uf_valor: moneda === 'UF' && uf ? uf.valor : null,
      uf_fecha: moneda === 'UF' && uf ? uf.fecha : null,
      iva_pct: iva,
      condicion_comision: comision,
      condiciones_comerciales: condiciones,
      notas_internas: notas || null,
      creada_por: creadaPor,
    };
    // Cabecera + líneas en una sola transacción (función guardar_cotizacion)
    const { error: e1 } = await supabase.rpc('guardar_cotizacion', {
      p_id: inicial?.id ?? null,
      p_cab: cab,
      p_items: lineas.map((l, k) => ({
        orden: k + 1,
        concepto: l.concepto.trim(),
        plan: l.plan || null,
        cantidad: l.cantidad,
        precio_neto: l.precio_neto,
        recurrente: l.recurrente,
      })),
    });
    setGuardando(false);
    if (e1) { setError(parseSupabaseError(e1)); return; }
    onVolver();
  };

  const imprimir = () => {
    const numero = inicial ? formatCorrelativo('COT', inicial.numero) : 'Borrador';
    const filasHtml = lineas
      .map((l) => `<tr><td>${esc(l.concepto)}</td><td class="n">${l.cantidad}</td><td class="n">${esc(formatMoneda(l.precio_neto, moneda))}</td><td class="n">${esc(formatMoneda(l.cantidad * l.precio_neto, moneda))}</td><td><span class="tag ${l.recurrente ? 'm' : 'u'}">${l.recurrente ? 'Mensual' : 'Pago único'}</span></td></tr>`)
      .join('');
    const ivaMonto = t.mensualIva + t.unicoIva - t.mensual - t.unico;
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(numero)} · P48 · ${esc(empresa.nombre)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
@page{size:A4;margin:0}
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;background:#F5F5F5;color:#0A0A0A;font-family:'Lexend',Arial,sans-serif;font-size:12px;line-height:1.5}
.cab{background:#0A0A0A;color:#F5F5F5;padding:30px 40px 24px;border-bottom:4px solid #BEFF00;display:flex;justify-content:space-between;align-items:flex-end}
.marca{font-size:32px;font-weight:700;letter-spacing:-0.02em;line-height:1}
.marca span{color:#BEFF00}
.meta{font-family:'Space Mono',monospace;font-size:10px;text-transform:uppercase;letter-spacing:.08em;text-align:right}
.meta b{color:#BEFF00;font-weight:700;font-size:12px}
.cuerpo{padding:30px 40px 36px}
.mono{font-family:'Space Mono',monospace;text-transform:uppercase;font-size:9px;letter-spacing:.08em;color:#525252;margin:0 0 4px}
h1{font-size:20px;font-weight:600;margin:4px 0 0}
.bloque{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:22px 0 26px;padding-top:14px;border-top:1px solid #0A0A0A}
.bloque p{margin:2px 0}
table{width:100%;border-collapse:collapse}
th{background:#0A0A0A;color:#F5F5F5;font-family:'Space Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:.06em;text-align:left;padding:8px 10px;font-weight:400}
td{border-bottom:1px solid #D4D4D4;padding:9px 10px;vertical-align:top}
.n{text-align:right;font-family:'Space Mono',monospace;font-size:11px;white-space:nowrap}
th.n{text-align:right}
.tag{font-family:'Space Mono',monospace;font-size:9px;text-transform:uppercase;padding:2px 6px;border:1px solid #0A0A0A;white-space:nowrap}
.tag.m{background:#0A0A0A;color:#BEFF00}
.tot{width:360px;margin:16px 0 0 auto}
.tot td{border:0;padding:4px 10px}
.tot .fin td{background:#0A0A0A;color:#F5F5F5;padding:14px 12px}
.tot .fin .n{color:#BEFF00;font-size:15px;font-weight:700}
.tot .sub td{border-top:1px solid #0A0A0A;font-weight:600}
.sec{margin-top:22px}
.caja{background:#FFFFFF;border:1px solid #D4D4D4;padding:12px 14px;font-size:11px}
.pie{margin-top:36px;padding-top:12px;border-top:1px solid #0A0A0A;display:flex;justify-content:space-between;font-family:'Space Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#525252}
</style></head><body>
<header class="cab"><div class="marca">P48<span>.</span></div><div class="meta">Propuesta comercial<br><b>${esc(numero)}</b></div></header>
<main class="cuerpo">
<p class="mono">Propuesta para</p>
<h1>${esc(titulo)}</h1>
<div class="bloque">
<div><p class="mono">Cliente</p><p><b>${esc(empresa.razon_social || empresa.nombre)}</b></p>${empresa.rut ? `<p>RUT ${esc(formatRUT(empresa.rut))}</p>` : ''}${empresa.giro ? `<p>${esc(empresa.giro)}</p>` : ''}${empresa.direccion_facturacion ? `<p>${esc(empresa.direccion_facturacion)}</p>` : ''}</div>
<div><p class="mono">Emisión y validez</p><p>Emisión: ${esc(formatFecha(inicial?.fecha_emision ?? new Date()))}</p><p>Válida ${esc(validez)} días</p><p>Condición de pago: ${empresa.dias_pago ?? 30} días</p>${moneda === 'UF' && uf ? `<p>UF del ${esc(uf.fecha)}: ${esc(formatCLP(uf.valor))}</p>` : ''}</div>
</div>
<table><thead><tr><th>Concepto</th><th class="n">Cant.</th><th class="n">Precio neto</th><th class="n">Subtotal neto</th><th>Cobro</th></tr></thead><tbody>${filasHtml}</tbody></table>
<table class="tot">
<tr><td>Neto mensual</td><td class="n">${esc(formatMoneda(t.mensual, moneda))}</td></tr>
<tr><td>Neto pago único</td><td class="n">${esc(formatMoneda(t.unico, moneda))}</td></tr>
<tr><td>IVA ${esc(ivaPct)}%</td><td class="n">${esc(formatMoneda(ivaMonto, moneda))}</td></tr>
<tr class="fin"><td><span class="mono" style="color:#F5F5F5;margin:0">Total mensual con IVA</span></td><td class="n">${esc(formatMoneda(t.mensualIva, moneda))} /mes</td></tr>
<tr class="sub"><td>Pago único con IVA</td><td class="n">${esc(formatMoneda(t.unicoIva, moneda))}</td></tr>
</table>
<div class="sec"><p class="mono">Comisión de pauta</p><div class="caja">${esc(comision)}</div></div>
<div class="sec"><p class="mono">Condiciones comerciales</p><div class="caja">${esc(condiciones)}</div></div>
<footer class="pie"><span>P48 · Proyecto 48</span><span>No operamos campañas, operamos negocios</span></footer>
</main></body></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    const w = window.open(url, '_blank', 'noopener');
    if (w) setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const etiquetaResumen = 'text-xs text-[var(--c-muted)]';
  const bloque = 'bg-[var(--c-surface)] border border-[var(--c-line)] rounded-lg p-4 space-y-3 min-w-0';
  const encabezadoBloque = 'text-[11px] font-mono uppercase text-[var(--c-muted)]';
  const columnasLinea = 'xl:grid-cols-[104px_minmax(0,1fr)_56px_96px_112px_96px_24px]';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button onClick={onVolver} className="text-xs text-[var(--c-muted)] hover:text-[var(--c-text)] flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> Volver a cotizaciones</button>
        <p className="text-[11px] font-mono text-[var(--c-muted)]">{empresa.nombre}</p>
      </div>
      <h3 className="text-base font-semibold text-[var(--c-text)]">{inicial ? `Cotización ${formatCorrelativo('COT', inicial.numero)}` : 'Nueva cotización'}</h3>

      {faltantesTributarios.length > 0 && (
        <div className="text-xs rounded border border-[var(--c-warn)] bg-[var(--c-surface-2)] p-3 text-[var(--c-text-2)]">
          Al cliente le faltan datos tributarios: <b className="text-[var(--c-text)]">{faltantesTributarios.join(', ')}</b>.
          Puedes guardar como borrador, pero no enviar ni aceptar hasta completarlos en «Datos legales y tributarios» (pestaña Datos &amp; Accesos).
        </div>
      )}

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_280px] 2xl:items-start">
        <div className="space-y-4 min-w-0">
          <section className={bloque}>
            <p className={encabezadoBloque}>Propuesta</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2"><label className={etiqueta}>Título</label><input className={campo} value={titulo} onChange={(e) => setTitulo(e.target.value)} /></div>
              <div><label className={etiqueta}>Estado</label>
                <select className={campo} value={estado} onChange={(e) => setEstado(e.target.value as Estado)}>
                  {(ESTADOS_COTIZACION as readonly Estado[]).map((e) => <option key={e} value={e}>{estiloEstado(cfg.estados_cotizacion, e).etiqueta}</option>)}
                </select></div>
              <div><label className={etiqueta}>Negocio asociado</label>
                <select className={campo} value={oportunidadId} onChange={(e) => setOportunidadId(e.target.value)}>
                  <option value="">Sin negocio</option>
                  {oportunidades.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
                </select></div>
              <div><label className={etiqueta}>Validez (días)</label><input type="number" className={`${campo} font-mono`} value={validez} onChange={(e) => setValidez(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={etiqueta}>Moneda</label>
                  <select className={campo} value={moneda} onChange={(e) => cambiarMoneda(e.target.value as MonedaCotizacion)}>
                    <option value="CLP">CLP</option>
                    <option value="UF">UF</option>
                  </select>
                  {ufError && <p className="text-[11px] text-[var(--c-danger)] mt-1">{ufError}</p>}</div>
                <div><label className={etiqueta}>IVA %</label><input type="number" className={`${campo} font-mono`} value={ivaPct} onChange={(e) => setIvaPct(e.target.value)} /></div>
              </div>
            </div>
          </section>

          <section className={bloque}>
            <div className="flex items-center justify-between gap-2">
              <p className={encabezadoBloque}>Líneas ({lineas.length})</p>
              <div className="flex gap-3">
                <button disabled={!ufListo} onClick={() => setLineas((p) => [...p, { concepto: 'Setup inicial', plan: '', cantidad: 1, precio_neto: aMoneda(SETUP_LISTA), recurrente: false }])} className="text-[11px] text-[var(--c-accent)] disabled:opacity-40">+ Setup</button>
                <button onClick={() => setLineas((p) => [...p, { concepto: '', plan: '', cantidad: 1, precio_neto: 0, recurrente: true }])} className="text-[11px] text-[var(--c-accent)]">+ Línea</button>
              </div>
            </div>
            {lineas.length === 0 ? (
              <p className="text-xs text-[var(--c-muted)]">Sin líneas. Agrega un setup o una línea.</p>
            ) : (
              <>
                <div className={`hidden xl:grid ${columnasLinea} gap-2 text-[10px] font-mono uppercase text-[var(--c-muted)]`}>
                  <span>Plan</span><span>Concepto</span><span className="text-right">Cant.</span><span className="text-right">Precio neto</span><span>Tipo</span><span className="text-right">Subtotal</span><span />
                </div>
                <div className="space-y-2">
                  {lineas.map((l, i) => (
                    <div key={i} className={`grid grid-cols-2 ${columnasLinea} gap-2 items-center pb-2 border-b border-[var(--c-line)] last:border-0 last:pb-0`}>
                      <select className={campo} value={l.plan} disabled={!ufListo} onChange={(e) => elegirPlan(i, e.target.value as PlanEmpresa | '')} aria-label="Plan de la línea">
                        <option value="">Libre</option>
                        {codigos.map((p) => <option key={p} value={p}>{p === 'personalizado' ? 'Personalizado' : `Plan ${p}`}</option>)}
                      </select>
                      <input className={campo} placeholder="Concepto" value={l.concepto} onChange={(e) => cambiar(i, { concepto: e.target.value })} aria-label="Concepto" />
                      <input type="number" min={0} step="any" className={`${campo} font-mono`} value={l.cantidad} onChange={(e) => cambiar(i, { cantidad: Number(e.target.value) })} aria-label="Cantidad" />
                      <input type="number" min={0} step={moneda === 'UF' ? '0.01' : '1'} className={`${campo} font-mono`} value={l.precio_neto} onChange={(e) => cambiar(i, { precio_neto: Number(e.target.value) })} aria-label="Precio neto" />
                      <select className={campo} value={l.recurrente ? 'mensual' : 'unico'} onChange={(e) => cambiar(i, { recurrente: e.target.value === 'mensual' })} aria-label="Tipo de cobro">
                        <option value="mensual">Mensual</option>
                        <option value="unico">Pago único</option>
                      </select>
                      <span className="font-mono text-xs text-right text-[var(--c-text-2)] whitespace-nowrap">{formatMoneda(l.cantidad * l.precio_neto, moneda)}</span>
                      <button onClick={() => setLineas((p) => p.filter((_, k) => k !== i))} aria-label="Quitar línea" className="justify-self-end text-[var(--c-muted)] hover:text-[var(--c-danger)] p-1"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          <section className={bloque}>
            <p className={encabezadoBloque}>Condiciones de la propuesta (salen en la cotización)</p>
            <div><label className={etiqueta}>Condición de comisión de pauta</label><textarea rows={3} className={campo} value={comision} onChange={(e) => setComision(e.target.value)} /></div>
            <div><label className={etiqueta}>Condiciones comerciales</label><textarea rows={3} className={campo} value={condiciones} onChange={(e) => setCondiciones(e.target.value)} /></div>
          </section>

          <section className="border border-dashed border-[var(--c-line)] rounded-lg p-4 space-y-2 min-w-0">
            <p className={encabezadoBloque}>Notas internas</p>
            <p className="text-[11px] text-[var(--c-muted)]">Solo para el equipo. No sale en la cotización.</p>
            <textarea rows={2} className={campo} value={notas} onChange={(e) => setNotas(e.target.value)} aria-label="Notas internas" />
          </section>
        </div>

        <aside className="space-y-4 min-w-0 2xl:sticky 2xl:top-4">
          <section className={bloque}>
            <p className={encabezadoBloque}>Resumen</p>
            <div className="space-y-2 font-mono text-xs">
              <div className="flex justify-between gap-3"><span className={etiquetaResumen}>Mensual neto</span><span className="text-[var(--c-text-2)]">{formatMoneda(t.mensual, moneda)}</span></div>
              <div className="flex justify-between gap-3"><span className={etiquetaResumen}>Pago único neto</span><span className="text-[var(--c-text-2)]">{formatMoneda(t.unico, moneda)}</span></div>
              <div className="flex justify-between gap-3"><span className={etiquetaResumen}>IVA {ivaPct}%</span><span className="text-[var(--c-text-2)]">{formatMoneda(t.mensualIva + t.unicoIva - t.mensual - t.unico, moneda)}</span></div>
            </div>
            <div className="border-t border-[var(--c-line)] pt-3 space-y-1">
              <p className={etiquetaResumen}>Total mensual con IVA</p>
              <p className="font-mono text-lg font-semibold text-[var(--c-text)]">{formatMoneda(t.mensualIva, moneda)}<span className="text-xs text-[var(--c-muted)]"> /mes</span></p>
              <p className="font-mono text-xs text-[var(--c-text-2)]">Pago único con IVA: {formatMoneda(t.unicoIva, moneda)}</p>
            </div>
            {moneda === 'UF' && uf && (
              <p className="text-[11px] font-mono text-[var(--c-muted)]">UF del {uf.fecha}: {formatCLP(uf.valor)} · Mensual ≈ {formatCLP(Math.round(t.mensualIva * uf.valor))}</p>
            )}
          </section>

          <section className={bloque}>
            {error && <p className="text-xs text-[var(--c-danger)]">{error}</p>}
            <button onClick={guardar} disabled={guardando} className="w-full px-4 py-2 text-xs font-semibold bg-[var(--c-accent)] text-[var(--c-on-accent)] rounded disabled:opacity-50">{guardando ? 'Guardando…' : 'Guardar'}</button>
            <button onClick={imprimir} className="w-full px-3 py-2 text-xs border border-[var(--c-line)] rounded flex items-center justify-center gap-1.5 text-[var(--c-text-2)] hover:text-[var(--c-text)]"><Printer className="w-3.5 h-3.5" /> Vista imprimible</button>
          </section>
        </aside>
      </div>
    </div>
  );
};

interface DetalleProps {
  cotizacionId: string;
  onCerrar: () => void;
  // Avisa al cerrar para que la vista que lo abrió recargue sus datos
  onCambio: () => void;
}

// Cotización abierta por id (desde la vista global): muestra el editor directamente, sin pasar por la ficha del cliente.
export const CotizacionDetalle: React.FC<DetalleProps> = ({ cotizacionId, onCerrar, onCambio }) => {
  const { empresasTodas, oportunidades } = useCRM();
  const { currentUser } = useAuth();
  const [fila, setFila] = useState<CotizacionFila | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    supabase
      .from('v_cotizaciones')
      .select('*')
      .eq('id', cotizacionId)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (err) setError(parseSupabaseError(err));
        else if (!data) setError('No encontramos esta cotización.');
        else {
          const d = data as CotizacionFila;
          setFila({ ...d, neto_mensual: Number(d.neto_mensual), neto_unico: Number(d.neto_unico), iva_pct: Number(d.iva_pct) });
        }
      });
  }, [cotizacionId]);

  const empresa = fila ? empresasTodas.find((e) => e.id === fila.empresa_id) : undefined;

  if (error) return <p className="text-xs text-[var(--c-danger)]">{error}</p>;
  if (!fila || !empresa) return <p className="text-xs text-[var(--c-muted)]">Cargando…</p>;

  return (
    <Editor
      empresa={empresa}
      inicial={fila}
      oportunidades={oportunidades.filter((o) => o.empresa_id === empresa.id && !o.archivado).map((o) => ({ id: o.id, nombre: o.nombre }))}
      creadaPor={currentUser?.id ?? null}
      oportunidadInicial={undefined}
      onVolver={() => { onCambio(); onCerrar(); }}
    />
  );
};
