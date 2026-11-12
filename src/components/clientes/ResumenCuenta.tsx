import React, { useEffect, useState } from 'react';
import { Mail, Phone, ChevronRight, Pencil, Check, X } from 'lucide-react';
import { formatRUTInput } from '../../lib/formatters';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { formatCLP, formatFecha, formatMoneda, formatCorrelativo } from '../../lib/formatters';
import { estadoEfectivo, redondear, MonedaCotizacion, estiloEstado } from '../../lib/cotizaciones';
import type { Actividad, Contacto, EstadoPago, Empresa, Factura, Miembro, Oportunidad, Tarea } from '../../types/crm';
import { estaVencida } from './FacturasCliente';
import { useCRM } from '../../context/CRMContext';
import { usePlanes } from '../../lib/planes';
import { useConfiguracionCRM } from '../../lib/configuracion';

export type DestinoResumen = 'contactos' | 'oportunidades' | 'actividades' | 'tareas' | 'facturacion' | 'estrategia' | 'marketing' | 'proyectos' | 'info';

export interface AlertaResumen {
  texto: string;
  tono: 'alerta' | 'info';
  destino?: DestinoResumen;
}

interface CotRes {
  id: string;
  numero: number;
  titulo: string;
  estado: string;
  vence_el: string;
  moneda: MonedaCotizacion;
  iva_pct: number;
  neto_mensual: number;
  neto_unico: number;
}

interface ProyectoRes {
  id: string;
  nombre: string;
  estado: 'planificado' | 'en_curso' | 'pausado' | 'finalizado';
  fecha_fin: string | null;
  entregables: { estado: string }[];
}

interface Props {
  empresa: Empresa;
  responsable?: string;
  miembros: Miembro[];
  facturas: Factura[];
  contactoPrincipal?: Contacto;
  oportunidadesAbiertas: Oportunidad[];
  actividades: Actividad[];
  tareasPendientes: Tarea[];
  alertas: AlertaResumen[];
  accesosConcedidos: number;
  accesosTotal: number;
  enlaces: React.ReactNode;
  estrategia: React.ReactNode;
  onIr: (destino: DestinoResumen) => void;
  onAbrirNegocio: (id: string) => void;
  onActualizar: (datos: Partial<Empresa>) => void;
  diasAlertaCotizacion?: number;
}

const SALUDES = [
  { valor: '', texto: 'Sin definir' },
  { valor: 'verde', texto: 'Saludable' },
  { valor: 'amarillo', texto: 'En alerta' },
  { valor: 'rojo', texto: 'En riesgo' },
];

const ESTADOS_PAGO: { valor: EstadoPago | ''; texto: string }[] = [
  { valor: '', texto: 'Sin definir' },
  { valor: 'al_dia', texto: 'Al día' },
  { valor: 'por_vencer', texto: 'Por vencer' },
  { valor: 'atrasado', texto: 'Atrasado' },
];

const ESTADOS_CLIENTE: { valor: Empresa['estado']; texto: string }[] = [
  { valor: 'prospecto', texto: 'Prospecto' },
  { valor: 'cliente', texto: 'Cliente activo' },
  { valor: 'ex_cliente', texto: 'Ex cliente' },
  { valor: 'descartado', texto: 'Descartado' },
  { valor: 'proveedor', texto: 'Proveedor' },
  { valor: 'interno', texto: 'Interno' },
  { valor: 'archivado', texto: 'Archivado' },
];


const ETIQUETA_PROYECTO: Record<ProyectoRes['estado'], string> = {
  planificado: 'Planificado',
  en_curso: 'En curso',
  pausado: 'Pausado',
  finalizado: 'Finalizado',
};

const input = 'w-full bg-[var(--c-field)] border border-[var(--c-line)] rounded px-2 py-1 text-xs text-[var(--c-text)] hover:border-[var(--c-muted)] focus:border-[var(--c-accent)] outline-none transition-colors';

// Color por categoría: mismo criterio que la franja superior
const TONO_SALUD: Record<string, 'ok' | 'warn' | 'danger' | 'muted'> = { verde: 'ok', amarillo: 'warn', rojo: 'danger', '': 'muted' };
const TONO_PAGO: Record<string, 'ok' | 'warn' | 'danger' | 'muted'> = { al_dia: 'ok', por_vencer: 'warn', atrasado: 'danger', '': 'muted' };
const CLASE_TEXTO = { ok: 'text-[var(--c-ok)]', warn: 'text-[var(--c-warn)]', danger: 'text-[var(--c-danger)]', muted: 'text-[var(--c-muted)]' };
const CLASE_PUNTO = { ok: 'bg-[var(--c-ok)]', warn: 'bg-[var(--c-warn)]', danger: 'bg-[var(--c-danger)]', muted: 'bg-[var(--c-muted)]' };

const SelectColor: React.FC<{ valor: string; tono: 'ok' | 'warn' | 'danger' | 'muted'; onChange: (v: string) => void; opciones: { valor: string; texto: string }[] }> = ({ valor, tono, onChange, opciones }) => (
  <div className="relative">
    <span className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full pointer-events-none ${CLASE_PUNTO[tono]}`} />
    <select value={valor} onChange={(e) => onChange(e.target.value)} className={`${input} pl-6 font-medium ${CLASE_TEXTO[tono]}`}>
      {opciones.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
    </select>
  </div>
);
const soloFecha = (v?: string | null) => (v ? v.slice(0, 10) : '');
const hoyISO = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
})();

const Bloque: React.FC<{ titulo: string; accion?: { texto: string; onClick: () => void }; acciones?: React.ReactNode; children: React.ReactNode }> = ({ titulo, accion, acciones, children }) => (
  <section className="ficha-card p-4">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-[11px] font-mono uppercase tracking-wider text-[var(--c-muted)]">{titulo}</h3>
      {acciones}
      {accion && <button onClick={accion.onClick} className="text-[11px] text-[var(--c-accent)] hover:underline">{accion.texto}</button>}
    </div>
    {children}
  </section>
);

const Campo: React.FC<{ etiqueta: string; nota?: string; children: React.ReactNode }> = ({ etiqueta, nota, children }) => (
  <div className="min-w-0">
    <p className="flex items-center gap-1 text-[10px] font-mono uppercase text-[var(--c-muted)] mb-1">
      {etiqueta}
    </p>
    {children}
    {nota && <p className="text-[10px] font-mono text-[var(--c-muted)] mt-0.5">{nota}</p>}
  </div>
);

const Valor: React.FC<{ mono?: boolean; children?: React.ReactNode }> = ({ mono = false, children }) => (
  <span className={`block truncate ${mono ? 'font-mono' : ''} ${children ? 'text-[var(--c-text)]' : 'text-[var(--c-muted-2)]'}`}>{children || '—'}</span>
);
const Estado: React.FC<{ tono: 'ok' | 'warn' | 'danger' | 'muted'; texto: string }> = ({ tono, texto }) => (
  <span className={`flex items-center gap-1.5 font-medium ${CLASE_TEXTO[tono]}`}><span className={`w-2 h-2 rounded-full ${CLASE_PUNTO[tono]}`} />{texto}</span>
);

interface Rebanada { etiqueta: string; valor: number; monto?: string; color: string }

// Gráfico circular en SVG puro: una rebanada por categoría, total al centro
const Dona: React.FC<{ titulo: string; total: string; rebanadas: Rebanada[]; vacio: string; onClick?: () => void; accion?: string }> = ({ titulo, total, rebanadas, vacio, onClick, accion }) => {
  const suma = rebanadas.reduce((a, r) => a + r.valor, 0);
  const R = 38;
  const C = 2 * Math.PI * R;
  let acumulado = 0;
  return (
    <section className="ficha-card p-4 min-w-0">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] font-mono uppercase tracking-wider text-[var(--c-muted)]">{titulo}</h3>
        {onClick && <button onClick={onClick} className="text-[11px] text-[var(--c-accent)] hover:underline">{accion ?? 'Ver'}</button>}
      </div>
      <div className="flex items-center gap-4">
        <div className="relative w-[104px] h-[104px] shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90" role="img" aria-label={`${titulo}: ${total}`}>
            <circle cx="50" cy="50" r={R} fill="none" stroke="var(--c-line)" strokeWidth="14" />
            {suma > 0 && rebanadas.filter((r) => r.valor > 0).map((r) => {
              const largo = (r.valor / suma) * C;
              const el = <circle key={r.etiqueta} cx="50" cy="50" r={R} fill="none" stroke={r.color} strokeWidth="14" strokeDasharray={`${largo} ${C - largo}`} strokeDashoffset={-acumulado} />;
              acumulado += largo;
              return el;
            })}
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold font-mono text-[var(--c-text)]">{total}</span>
        </div>
        <ul className="flex-1 min-w-0 space-y-1.5 text-xs">
          {suma === 0 && <li className="text-[var(--c-muted)]">{vacio}</li>}
          {rebanadas.map((r) => (
            <li key={r.etiqueta} className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: r.color }} />
              <span className="truncate text-[var(--c-text-2)]">{r.etiqueta}</span>
              <span className="ml-auto shrink-0 font-mono text-[var(--c-text)]">{r.valor}</span>
              {r.monto && <span className="shrink-0 font-mono text-[10px] text-[var(--c-muted)]">{r.monto}</span>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export const ResumenCuenta: React.FC<Props> = ({
  empresa, responsable, miembros, facturas, contactoPrincipal, oportunidadesAbiertas, actividades, tareasPendientes,
  alertas, accesosConcedidos, accesosTotal, enlaces, estrategia, onIr, onAbrirNegocio, onActualizar, diasAlertaCotizacion = 7,
}) => {
  const { etapas } = useCRM();
  const { PLANES: PLANES_VIGENTES, codigos } = usePlanes();
  const { config: cfg } = useConfiguracionCRM();
  // Plan actual siempre visible aunque esté desactivado en Administración
  const PLANES = [
    { valor: '', texto: 'Sin plan' },
    ...[...new Set([...codigos, ...(empresa.plan ? [empresa.plan] : [])])].map((c) => ({ valor: c as string, texto: c === 'personalizado' ? 'Personalizado' : `Plan ${c} · ${PLANES_VIGENTES[c as keyof typeof PLANES_VIGENTES]?.nombre ?? ''}` })),
  ];
  const [cotizaciones, setCotizaciones] = useState<CotRes[]>([]);
  const [proyectos, setProyectos] = useState<ProyectoRes[]>([]);
  const [riesgosTxt, setRiesgosTxt] = useState(empresa.riesgos_oportunidades ?? '');
  const [editando, setEditando] = useState(false);
  const [d, setD] = useState<Record<string, string>>({});
  const [errorEdicion, setErrorEdicion] = useState<string | null>(null);

  useEffect(() => { setEditando(false); setErrorEdicion(null); }, [empresa.id]);

  const abrirEdicion = () => {
    setD({
      salud: empresa.salud ?? '',
      estado_pago: empresa.estado_pago ?? '',
      fecha_ultimo_pago: soloFecha(empresa.fecha_ultimo_pago),
      estado: empresa.estado,
      plan: empresa.plan ?? '',
      fee_mensual_clp: empresa.fee_mensual_clp != null ? String(empresa.fee_mensual_clp) : '',
      setup_fee_clp: empresa.setup_fee_clp != null ? String(empresa.setup_fee_clp) : '',
      responsable_id: empresa.responsable_id ?? '',
      inicio_contrato: soloFecha(empresa.inicio_contrato),
      proxima_facturacion: soloFecha(empresa.proxima_facturacion),
      fecha_renovacion: soloFecha(empresa.fecha_renovacion),
      renovacion_tipo: empresa.renovacion_tipo ?? 'manual',
      razon_social: empresa.razon_social ?? '',
      rut: empresa.rut ?? '',
      giro: empresa.giro ?? '',
      direccion_facturacion: empresa.direccion_facturacion ?? '',
      email_facturacion: empresa.email_facturacion ?? '',
      dias_pago: String(empresa.dias_pago ?? 30),
    });
    setErrorEdicion(null);
    setEditando(true);
  };

  const guardarEdicion = () => {
    const email = d.email_facturacion.trim().toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setErrorEdicion('Correo de facturación inválido');
    const dias = Number(d.dias_pago);
    if (!Number.isInteger(dias) || dias < 0 || dias > 365) return setErrorEdicion('Días de pago entre 0 y 365');
    const num = (v: string) => (v.trim() === '' ? null : Number(v));
    const txt = (v: string) => v.trim() || null;
    const nuevo: Partial<Empresa> = {
      salud: (d.salud || null) as Empresa['salud'],
      estado_pago: (d.estado_pago || null) as EstadoPago | null,
      fecha_ultimo_pago: d.fecha_ultimo_pago || null,
      estado: d.estado as Empresa['estado'],
      plan: (d.plan || null) as Empresa['plan'],
      fee_mensual_clp: num(d.fee_mensual_clp),
      setup_fee_clp: num(d.setup_fee_clp),
      responsable_id: d.responsable_id || null,
      inicio_contrato: d.inicio_contrato || null,
      proxima_facturacion: d.proxima_facturacion || null,
      fecha_renovacion: d.fecha_renovacion || null,
      renovacion_tipo: d.renovacion_tipo as Empresa['renovacion_tipo'],
      razon_social: txt(d.razon_social),
      rut: txt(d.rut),
      giro: txt(d.giro),
      direccion_facturacion: txt(d.direccion_facturacion),
      email_facturacion: email || null,
      dias_pago: dias,
    };
    // Solo se envía lo que cambió
    const cambios: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(nuevo)) {
      const actual = (empresa as unknown as Record<string, unknown>)[k] ?? null;
      const comparable = k.startsWith('fecha_') || k === 'inicio_contrato' || k === 'proxima_facturacion' ? soloFecha(actual as string | null) || null : actual;
      if (v !== comparable) cambios[k] = v;
    }
    if (Object.keys(cambios).length) onActualizar(cambios as Partial<Empresa>);
    setEditando(false);
  };

  useEffect(() => {
    setRiesgosTxt(empresa.riesgos_oportunidades ?? '');
  }, [empresa.id, empresa.riesgos_oportunidades]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    let vivo = true;
    supabase
      .from('v_cotizaciones')
      .select('id,numero,titulo,estado,vence_el,moneda,iva_pct,neto_mensual,neto_unico')
      .eq('empresa_id', empresa.id)
      .order('numero', { ascending: false })
      .then(({ data }) => {
        if (vivo) setCotizaciones(((data ?? []) as CotRes[]).map((c) => ({ ...c, neto_mensual: Number(c.neto_mensual), neto_unico: Number(c.neto_unico), iva_pct: Number(c.iva_pct) })));
      });
    supabase
      .from('proyectos')
      .select('id,nombre,estado,fecha_fin')
      .eq('empresa_id', empresa.id)
      .eq('archivado', false)
      .in('estado', ['planificado', 'en_curso', 'pausado'])
      .order('created_at', { ascending: false })
      .then(async ({ data }) => {
        const base = (data ?? []) as Omit<ProyectoRes, 'entregables'>[];
        if (base.length === 0) { if (vivo) setProyectos([]); return; }
        const { data: ents } = await supabase!
          .from('entregables')
          .select('proyecto_id,estado')
          .in('proyecto_id', base.map((p) => p.id))
          .eq('archivado', false);
        if (!vivo) return;
        const porProyecto = new Map<string, { estado: string }[]>();
        for (const e of (ents ?? []) as { proyecto_id: string; estado: string }[]) {
          porProyecto.set(e.proyecto_id, [...(porProyecto.get(e.proyecto_id) ?? []), { estado: e.estado }]);
        }
        setProyectos(base.map((p) => ({ ...p, entregables: porProyecto.get(p.id) ?? [] })));
      });
    return () => { vivo = false; };
  }, [empresa.id]);

  const hoyMs = Date.now();
  const vigente = cotizaciones.find((c) => ['enviada', 'aceptada'].includes(estadoEfectivo(c)));
  const alertasCot: AlertaResumen[] = cotizaciones
    .filter((c) => c.estado === 'enviada')
    .flatMap((c) => {
      const dias = Math.ceil((new Date(`${c.vence_el.slice(0, 10)}T00:00:00`).getTime() - hoyMs) / 86400000);
      if (dias < 0) return [{ texto: `${formatCorrelativo('COT', c.numero)} venció sin respuesta`, tono: 'alerta' as const, destino: 'facturacion' as const }];
      if (dias <= diasAlertaCotizacion) return [{ texto: `${formatCorrelativo('COT', c.numero)} vence en ${dias} día(s)`, tono: 'alerta' as const, destino: 'facturacion' as const }];
      return [];
    });
  const alertasFicha: AlertaResumen[] = [];
  const facturasCliente = facturas.filter((f) => f.empresa_id === empresa.id);
  const facturasVencidas = facturasCliente.filter(estaVencida);
  if (facturasVencidas.length) {
    const montoVencido = facturasVencidas.reduce((acc, f) => acc + Number(f.monto_total), 0);
    alertasFicha.push({ texto: `${facturasVencidas.length} factura(s) vencida(s) por ${formatCLP(montoVencido)}`, tono: 'alerta', destino: 'facturacion' });
  }
  if (empresa.estado_pago === 'atrasado') alertasFicha.push({ texto: 'Pago atrasado', tono: 'alerta', destino: 'facturacion' });
  if (empresa.estado_pago === 'por_vencer') alertasFicha.push({ texto: 'Pago por vencer', tono: 'info', destino: 'facturacion' });
  if (empresa.proxima_facturacion && soloFecha(empresa.proxima_facturacion) < hoyISO) {
    alertasFicha.push({ texto: `Facturación vencida desde ${formatFecha(empresa.proxima_facturacion)}`, tono: 'alerta', destino: 'info' });
  }
  const todasAlertas = [...alertas, ...alertasFicha, ...alertasCot];

  const mesesContrato = empresa.inicio_contrato
    ? Math.max(0, Math.floor((hoyMs - new Date(`${soloFecha(empresa.inicio_contrato)}T12:00:00`).getTime()) / (86400000 * 30.44)))
    : null;
  const ltvEstimado = mesesContrato !== null && empresa.mrr_actual_clp ? empresa.mrr_actual_clp * mesesContrato : null;

  // Datos de los 3 gráficos
  const COLOR = { ok: 'var(--c-ok)', warn: 'var(--c-warn)', danger: 'var(--c-danger)', info: 'var(--c-info)', accent: 'var(--c-accent)', muted: 'var(--c-muted-2)' };
  const monedaUnica = (xs: { moneda: string }[]) => (new Set(xs.map((x) => x.moneda)).size === 1 ? (xs[0]?.moneda as 'CLP' | 'USD' | 'UF') : null);
  const PALETA_ETAPAS = [COLOR.info, COLOR.accent, COLOR.warn, COLOR.ok, COLOR.danger, COLOR.muted];
  const etapasOrdenadas = [...etapas].sort((a, b) => a.orden - b.orden);
  const rebanadasNegocios: Rebanada[] = etapasOrdenadas
    .map((e, i) => {
      const grupo = oportunidadesAbiertas.filter((o) => o.etapa_id === e.id);
      const m = monedaUnica(grupo);
      return { etiqueta: e.nombre, valor: grupo.length, monto: m && grupo.length ? formatMoneda(grupo.reduce((a, o) => a + Number(o.valor_neto), 0), m) : undefined, color: PALETA_ETAPAS[i % PALETA_ETAPAS.length] };
    })
    .filter((r) => r.valor > 0);

  const cotConMonto = (estado: string) => {
    const grupo = cotizaciones.filter((c) => estadoEfectivo(c) === estado);
    const m = monedaUnica(grupo);
    const monto = grupo.reduce((a, c) => a + redondear((c.neto_mensual > 0 ? c.neto_mensual : c.neto_unico) * (1 + c.iva_pct / 100), c.moneda), 0);
    return { valor: grupo.length, monto: m && grupo.length ? formatMoneda(monto, m) : undefined };
  };
  const rebanadasCot: Rebanada[] = [
    ...(['enviada', 'aceptada', 'rechazada', 'vencida', 'borrador'] as const).map((e) => ({
      etiqueta: estiloEstado(cfg.estados_cotizacion, e).etiqueta,
      color: estiloEstado(cfg.estados_cotizacion, e).color,
      ...cotConMonto(e),
    })),
  ];

  const sumaFact = (xs: Factura[]) => xs.reduce((a, f) => a + Number(f.monto_total), 0);
  const fPendientes = facturasCliente.filter((f) => f.estado_pago === 'pendiente' && !estaVencida(f));
  const fPagadas = facturasCliente.filter((f) => f.estado_pago === 'pagada');
  const rebanadasFact: Rebanada[] = [
    { etiqueta: 'Pendientes', valor: fPendientes.length, monto: fPendientes.length ? formatCLP(sumaFact(fPendientes)) : undefined, color: COLOR.warn },
    { etiqueta: 'Vencidas', valor: facturasVencidas.length, monto: facturasVencidas.length ? formatCLP(sumaFact(facturasVencidas)) : undefined, color: COLOR.danger },
    { etiqueta: 'Pagadas', valor: fPagadas.length, monto: fPagadas.length ? formatCLP(sumaFact(fPagadas)) : undefined, color: COLOR.ok },
  ];

  const ultimasActividades = [...actividades].sort((a, b) => b.fecha_actividad.localeCompare(a.fecha_actividad)).slice(0, 3);

  return (
    <div className="space-y-4">
    <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-3 gap-4">
      <Dona titulo="Negocios abiertos" total={String(oportunidadesAbiertas.length)} rebanadas={rebanadasNegocios} vacio="Sin negocios abiertos." onClick={() => onIr('oportunidades')} accion="Ver negocios" />
      <Dona titulo="Cotizaciones" total={String(cotizaciones.length)} rebanadas={rebanadasCot} vacio="Sin cotizaciones." onClick={() => onIr('facturacion')} accion="Ver cotizaciones" />
      <Dona titulo="Facturas" total={String(facturasCliente.length)} rebanadas={rebanadasFact} vacio="Sin facturas registradas." onClick={() => onIr('facturacion')} accion="Registrar" />
    </div>
    <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[280px_minmax(0,1fr)] gap-4 items-start">
      {/* Izquierda: quién es el cliente y dónde está todo */}
      <aside className="space-y-4">
        {estrategia}

        <Bloque titulo="Contacto principal">
          {contactoPrincipal ? (
            <div className="space-y-1 text-xs">
              <p className="font-medium text-[var(--c-text)]">{contactoPrincipal.nombre} {contactoPrincipal.apellido}</p>
              {contactoPrincipal.cargo && <p className="text-[var(--c-muted)]">{contactoPrincipal.cargo}</p>}
              <a href={`mailto:${contactoPrincipal.email}`} className="flex items-center gap-1.5 text-[var(--c-accent)] hover:underline truncate pt-1"><Mail className="w-3 h-3 shrink-0" />{contactoPrincipal.email}</a>
              {contactoPrincipal.telefono && (
                <a href={`tel:${contactoPrincipal.telefono.replace(/\s/g, '')}`} className="flex items-center gap-1.5 text-[var(--c-accent)] hover:underline"><Phone className="w-3 h-3 shrink-0" />{contactoPrincipal.telefono}</a>
              )}
            </div>
          ) : (
            <button onClick={() => onIr('contactos')} className="w-full text-left text-xs text-[var(--c-muted)] hover:text-[var(--c-text-2)]">Sin contacto principal. Agregar →</button>
          )}
          <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-[var(--c-line)] text-xs">
            <span className="text-[var(--c-muted)]">Responsable</span>
            <span className="text-[var(--c-text)] truncate">{responsable ?? 'Sin asignar'}</span>
          </div>
          {accesosTotal > 0 && (
            <button onClick={() => onIr('marketing')} className="w-full flex items-center justify-between gap-3 mt-2 text-xs">
              <span className="text-[var(--c-muted)]">Accesos admin</span>
              <span className={`font-mono ${accesosConcedidos < accesosTotal ? 'text-[var(--c-warn)]' : 'text-[var(--c-ok)]'}`}>{accesosConcedidos}/{accesosTotal}</span>
            </button>
          )}
        </Bloque>

        <Bloque titulo="Enlaces">
          <div className="space-y-3">{enlaces}</div>
        </Bloque>

        <Bloque titulo="Riesgos y oportunidades">
          <textarea
            value={riesgosTxt}
            onChange={(e) => setRiesgosTxt(e.target.value)}
            onBlur={() => { if (riesgosTxt !== (empresa.riesgos_oportunidades ?? '')) onActualizar({ riesgos_oportunidades: riesgosTxt.trim() || null }); }}
            placeholder="Churn, expansión, objeciones… se guarda al salir"
            rows={4}
            className={`${input} resize-y`}
          />
        </Bloque>
      </aside>

      {/* Derecha: contrato, lo que requiere atención y lo que sigue */}
      <div className="space-y-4 min-w-0">
        <Bloque
          titulo="Contrato y datos"
          acciones={
            editando ? (
              <div className="flex items-center gap-1.5">
                <button onClick={() => { setEditando(false); setErrorEdicion(null); }} className="flex items-center gap-1 text-[11px] text-[var(--c-muted)] hover:text-[var(--c-text)] px-2 py-1 rounded"><X className="w-3 h-3" />Cancelar</button>
                <button onClick={guardarEdicion} className="flex items-center gap-1 text-[11px] font-medium text-[var(--c-on-accent)] bg-[var(--c-accent)] hover:bg-[var(--c-accent-hover)] px-2.5 py-1 rounded"><Check className="w-3 h-3" />Guardar</button>
              </div>
            ) : (
              <button onClick={abrirEdicion} className="p-1.5 rounded text-[var(--c-muted)] hover:text-[var(--c-accent)] hover:bg-[var(--c-surface-2)]" aria-label="Editar contrato y datos" title="Editar"><Pencil className="w-3.5 h-3.5" /></button>
            )
          }
        >
          {editando ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-4 text-xs">
                <Campo etiqueta="Salud"><SelectColor valor={d.salud} tono={TONO_SALUD[d.salud]} opciones={SALUDES} onChange={(v) => setD({ ...d, salud: v })} /></Campo>
                <Campo etiqueta="Estado de pago"><SelectColor valor={d.estado_pago} tono={TONO_PAGO[d.estado_pago]} opciones={ESTADOS_PAGO} onChange={(v) => setD({ ...d, estado_pago: v })} /></Campo>
                <Campo etiqueta="Último pago"><input type="date" value={d.fecha_ultimo_pago} onChange={(e) => setD({ ...d, fecha_ultimo_pago: e.target.value })} className={`${input} font-mono`} /></Campo>
                <Campo etiqueta="Estado del cliente">
                  <select value={d.estado} onChange={(e) => setD({ ...d, estado: e.target.value })} className={input}>{ESTADOS_CLIENTE.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}</select>
                </Campo>
                <Campo etiqueta="Plan">
                  <select value={d.plan} onChange={(e) => setD({ ...d, plan: e.target.value })} className={input}>{PLANES.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}</select>
                </Campo>
                <Campo etiqueta="Responsable">
                  <select value={d.responsable_id} onChange={(e) => setD({ ...d, responsable_id: e.target.value })} className={input}>
                    <option value="">Sin asignar</option>
                    {miembros.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                  </select>
                </Campo>
                <Campo etiqueta="Fee mensual (CLP)"><input type="number" min={0} className={`${input} font-mono`} value={d.fee_mensual_clp} placeholder="Sin fee" onChange={(e) => setD({ ...d, fee_mensual_clp: e.target.value })} /></Campo>
                <Campo etiqueta="Setup fee (CLP)"><input type="number" min={0} className={`${input} font-mono`} value={d.setup_fee_clp} placeholder="Sin setup" onChange={(e) => setD({ ...d, setup_fee_clp: e.target.value })} /></Campo>
                <Campo etiqueta="Inicio de contrato"><input type="date" value={d.inicio_contrato} onChange={(e) => setD({ ...d, inicio_contrato: e.target.value })} className={`${input} font-mono`} /></Campo>
                <Campo etiqueta="Próxima facturación"><input type="date" value={d.proxima_facturacion} onChange={(e) => setD({ ...d, proxima_facturacion: e.target.value })} className={`${input} font-mono`} /></Campo>
                <Campo etiqueta="Próxima renovación">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-1.5">
                    <input type="date" value={d.fecha_renovacion} onChange={(e) => setD({ ...d, fecha_renovacion: e.target.value })} className={`${input} font-mono`} />
                    <select value={d.renovacion_tipo} onChange={(e) => setD({ ...d, renovacion_tipo: e.target.value })} className={input} title="Tipo de renovación"><option value="manual">Manual</option><option value="automatica">Auto</option></select>
                  </div>
                </Campo>
              </div>
              <div className="pt-4 border-t border-[var(--c-line)] grid grid-cols-[minmax(0,1fr)] sm:grid-cols-3 gap-3 text-xs">
                <Campo etiqueta="Razón social"><input className={input} value={d.razon_social} onChange={(e) => setD({ ...d, razon_social: e.target.value })} /></Campo>
                <Campo etiqueta="RUT"><input className={`${input} font-mono`} placeholder="76.123.456-7" value={d.rut} onChange={(e) => setD({ ...d, rut: formatRUTInput(e.target.value) })} /></Campo>
                <Campo etiqueta="Giro"><input className={input} value={d.giro} onChange={(e) => setD({ ...d, giro: e.target.value })} /></Campo>
                <Campo etiqueta="Dirección de facturación"><input className={input} value={d.direccion_facturacion} onChange={(e) => setD({ ...d, direccion_facturacion: e.target.value })} /></Campo>
                <Campo etiqueta="Correo para facturas"><input type="email" className={input} value={d.email_facturacion} onChange={(e) => setD({ ...d, email_facturacion: e.target.value })} /></Campo>
                <Campo etiqueta="Condición de pago (días)"><input type="number" min={0} max={365} className={`${input} font-mono`} value={d.dias_pago} onChange={(e) => setD({ ...d, dias_pago: e.target.value })} /></Campo>
              </div>
              {errorEdicion && <p className="text-[11px] text-[var(--c-danger)]">{errorEdicion}</p>}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-4 text-xs">
                <Campo etiqueta="Salud"><Estado tono={TONO_SALUD[empresa.salud ?? '']} texto={SALUDES.find((o) => o.valor === (empresa.salud ?? ''))?.texto ?? 'Sin definir'} /></Campo>
                <Campo etiqueta="Estado de pago"><Estado tono={TONO_PAGO[empresa.estado_pago ?? '']} texto={ESTADOS_PAGO.find((o) => o.valor === (empresa.estado_pago ?? ''))?.texto ?? 'Sin definir'} /></Campo>
                <Campo etiqueta="Último pago"><Valor>{empresa.fecha_ultimo_pago ? formatFecha(empresa.fecha_ultimo_pago) : null}</Valor></Campo>
                <Campo etiqueta="Estado del cliente"><Valor>{ESTADOS_CLIENTE.find((o) => o.valor === empresa.estado)?.texto}</Valor></Campo>
                <Campo etiqueta="Plan"><Valor>{PLANES.find((o) => o.valor === (empresa.plan ?? ''))?.valor ? PLANES.find((o) => o.valor === empresa.plan)?.texto : null}</Valor></Campo>
                <Campo etiqueta="Responsable"><Valor>{responsable}</Valor></Campo>
                <Campo etiqueta="Fee mensual"><Valor mono>{empresa.fee_mensual_clp != null ? formatCLP(empresa.fee_mensual_clp) : null}</Valor></Campo>
                <Campo etiqueta="Setup fee"><Valor mono>{empresa.setup_fee_clp != null ? formatCLP(empresa.setup_fee_clp) : null}</Valor></Campo>
                <Campo etiqueta="Inicio de contrato"><Valor mono>{empresa.inicio_contrato ? formatFecha(empresa.inicio_contrato) : null}</Valor></Campo>
                <Campo etiqueta="Próxima facturación" nota={`Pago a ${empresa.dias_pago ?? 30} días`}><Valor mono>{empresa.proxima_facturacion ? formatFecha(empresa.proxima_facturacion) : null}</Valor></Campo>
                <Campo etiqueta="Próxima renovación" nota={empresa.fecha_renovacion ? (empresa.renovacion_tipo === 'automatica' ? 'Automática' : 'Manual') : undefined}><Valor mono>{empresa.fecha_renovacion ? formatFecha(empresa.fecha_renovacion) : null}</Valor></Campo>
                <Campo etiqueta="LTV estimado" nota={mesesContrato !== null ? `MRR × ${mesesContrato} meses` : 'Falta inicio de contrato'}><Valor mono>{ltvEstimado !== null ? formatCLP(ltvEstimado) : null}</Valor></Campo>
              </div>
              <dl className="mt-4 pt-4 border-t border-[var(--c-line)] grid grid-cols-[minmax(0,1fr)] sm:grid-cols-3 gap-x-4 gap-y-4 text-xs">
                <Campo etiqueta="Razón social"><Valor>{empresa.razon_social}</Valor></Campo>
                <Campo etiqueta="RUT"><Valor mono>{empresa.rut}</Valor></Campo>
                <Campo etiqueta="Giro"><Valor>{empresa.giro}</Valor></Campo>
                <Campo etiqueta="Dirección de facturación"><Valor>{empresa.direccion_facturacion}</Valor></Campo>
                <Campo etiqueta="Correo para facturas"><Valor>{empresa.email_facturacion}</Valor></Campo>
                <Campo etiqueta="Condición de pago"><Valor mono>{`${empresa.dias_pago ?? 30} días`}</Valor></Campo>
              </dl>
              {(!empresa.razon_social || !empresa.rut || !empresa.giro || !empresa.direccion_facturacion) && (
                <p className="mt-3 text-[11px] text-[var(--c-warn)]">Faltan datos obligatorios (razón social, RUT, giro, dirección) para cotizar o facturar. Usa el lápiz para completarlos.</p>
              )}
            </>
          )}
        </Bloque>

        {todasAlertas.length > 0 && (
          <Bloque titulo={`Requiere atención (${todasAlertas.length})`}>
            <ul className="grid grid-cols-[minmax(0,1fr)] md:grid-cols-2 gap-1">
              {todasAlertas.map((a, i) => (
                <li key={`${a.texto}-${i}`}>
                  <button
                    type="button"
                    disabled={!a.destino}
                    onClick={() => a.destino && onIr(a.destino)}
                    className="w-full flex items-center gap-2.5 text-left text-xs text-[var(--c-text-2)] px-2 py-1.5 rounded enabled:hover:bg-[var(--c-surface-2)]"
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${a.tono === 'alerta' ? 'bg-[var(--c-warn)]' : 'bg-[var(--c-info)]'}`} />
                    <span className="flex-1 min-w-0 truncate">{a.texto}</span>
                    {a.destino && <ChevronRight className="w-3.5 h-3.5 shrink-0 text-[var(--c-muted-2)]" />}
                  </button>
                </li>
              ))}
            </ul>
          </Bloque>
        )}

        <div className="grid grid-cols-[minmax(0,1fr)] md:grid-cols-2 gap-4">
          <Bloque titulo={`Próximos pasos (${tareasPendientes.length})`} accion={{ texto: 'Ver tareas', onClick: () => onIr('tareas') }}>
            {tareasPendientes.length === 0 ? (
              <p className="text-xs text-[var(--c-muted)]">Sin tareas pendientes.</p>
            ) : (
              <ul className="divide-y divide-[var(--c-line)] text-xs">
                {tareasPendientes.slice(0, 4).map((t) => {
                  const atrasada = !!t.fecha_vencimiento && new Date(t.fecha_vencimiento).getTime() < hoyMs - 86400000;
                  return (
                    <li key={t.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                      <span className="truncate text-[var(--c-text)]">{t.titulo}</span>
                      <span className={`shrink-0 font-mono text-[10px] ${atrasada ? 'text-[var(--c-danger)]' : 'text-[var(--c-muted)]'}`}>
                        {atrasada ? 'Atrasada' : t.fecha_vencimiento ? formatFecha(t.fecha_vencimiento) : 'Sin fecha'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Bloque>

          <Bloque titulo={`Proyectos activos (${proyectos.length})`} accion={{ texto: 'Ver proyectos', onClick: () => onIr('proyectos') }}>
            {proyectos.length === 0 ? (
              <p className="text-xs text-[var(--c-muted)]">Sin proyectos activos.</p>
            ) : (
              <ul className="space-y-3">
                {proyectos.slice(0, 4).map((p) => {
                  const total = p.entregables.length;
                  const hechos = p.entregables.filter((e) => e.estado === 'entregado').length;
                  const pct = total ? Math.round((hechos / total) * 100) : 0;
                  return (
                    <li key={p.id} className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-[var(--c-text)]">{p.nombre}</span>
                        <span className="shrink-0 font-mono text-[10px] text-[var(--c-muted)]">{ETIQUETA_PROYECTO[p.estado]}</span>
                      </div>
                      <div className="h-1 bg-[var(--c-line)] rounded overflow-hidden">
                        <div className="h-full bg-[var(--c-accent)]" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[10px] font-mono text-[var(--c-muted)]">
                        {hechos}/{total} entregables{p.fecha_fin ? ` · cierre ${formatFecha(p.fecha_fin)}` : ''}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </Bloque>
        </div>

        <Bloque titulo="Última actividad" accion={{ texto: 'Ver todas', onClick: () => onIr('actividades') }}>
          {ultimasActividades.length === 0 ? (
            <p className="text-xs text-[var(--c-muted)]">Sin actividad registrada.</p>
          ) : (
            <ul className="divide-y divide-[var(--c-line)] text-xs">
              {ultimasActividades.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-1.5 first:pt-0 last:pb-0">
                  <span className="truncate text-[var(--c-text)]"><span className="text-[10px] font-mono uppercase text-[var(--c-muted)] mr-2">{a.tipo.replace('_', ' ')}</span>{a.titulo}</span>
                  <span className="font-mono text-[10px] text-[var(--c-muted)] shrink-0">{formatFecha(a.fecha_actividad)}</span>
                </li>
              ))}
            </ul>
          )}
        </Bloque>

      </div>
    </div>
    </div>
  );
};
