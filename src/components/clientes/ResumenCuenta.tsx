import React, { useEffect, useState } from 'react';
import { Mail, Phone, ChevronRight } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { formatCLP, formatFecha, formatMoneda, formatRUT, formatCorrelativo } from '../../lib/formatters';
import { estadoEfectivo, redondear, MonedaCotizacion } from '../../lib/cotizaciones';
import type { Actividad, Contacto, EstadoPago, Empresa, Oportunidad, Tarea } from '../../types/crm';

export type DestinoResumen = 'contactos' | 'oportunidades' | 'actividades' | 'tareas' | 'cotizaciones' | 'estrategia' | 'marketing' | 'info';

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
  industria?: string;
  responsable?: string;
  contactoPrincipal?: Contacto;
  oportunidadesAbiertas: Oportunidad[];
  actividades: Actividad[];
  tareasPendientes: Tarea[];
  alertas: AlertaResumen[];
  accesosConcedidos: number;
  accesosTotal: number;
  enlaces: React.ReactNode; // Drive y Looker (editables)
  estrategia: React.ReactNode;
  onIr: (destino: DestinoResumen) => void;
  onAbrirNegocio: (id: string) => void;
  onActualizar: (datos: Partial<Empresa>) => void;
  diasAlertaCotizacion?: number;
}

const ESTADOS_PAGO: { valor: EstadoPago | ''; texto: string; tono: 'ok' | 'warn' | 'danger' | 'muted' }[] = [
  { valor: '', texto: 'Sin definir', tono: 'muted' },
  { valor: 'al_dia', texto: 'Al día', tono: 'ok' },
  { valor: 'por_vencer', texto: 'Por vencer', tono: 'warn' },
  { valor: 'atrasado', texto: 'Atrasado', tono: 'danger' },
];

const SALUDES: { valor: string; texto: string }[] = [
  { valor: '', texto: 'Sin definir' },
  { valor: 'verde', texto: 'Saludable' },
  { valor: 'amarillo', texto: 'En alerta' },
  { valor: 'rojo', texto: 'En riesgo' },
];

const ETIQUETA_PROYECTO: Record<ProyectoRes['estado'], string> = {
  planificado: 'Planificado',
  en_curso: 'En curso',
  pausado: 'Pausado',
  finalizado: 'Finalizado',
};

const campo = 'w-full bg-[var(--c-field)] border border-[var(--c-line)] rounded px-2 py-1 text-xs text-[var(--c-text)]';
const fechaCorta = (v?: string | null) => (v ? v.slice(0, 10) : '');
const hoyISO = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
})();

const Fila: React.FC<{ etiqueta: string; children: React.ReactNode }> = ({ etiqueta, children }) => (
  <div className="flex items-baseline justify-between gap-3 text-xs">
    <span className="text-[10px] font-mono uppercase text-[var(--c-muted)] shrink-0">{etiqueta}</span>
    <span className="text-[var(--c-text)] text-right min-w-0 truncate">{children}</span>
  </div>
);

const Celda: React.FC<{ etiqueta: string; children: React.ReactNode }> = ({ etiqueta, children }) => (
  <div className="min-w-0">
    <p className="text-[10px] font-mono uppercase text-[var(--c-muted)] mb-1">{etiqueta}</p>
    {children}
  </div>
);

const Tarjeta: React.FC<{ titulo: string; accion?: { texto: string; onClick: () => void }; children: React.ReactNode }> = ({ titulo, accion, children }) => (
  <div className="ficha-card p-4">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-xs font-semibold text-[var(--c-text)]">{titulo}</h3>
      {accion && <button onClick={accion.onClick} className="text-[11px] text-[var(--c-accent)] hover:underline">{accion.texto}</button>}
    </div>
    {children}
  </div>
);

export const ResumenCuenta: React.FC<Props> = ({
  empresa, industria, responsable, contactoPrincipal, oportunidadesAbiertas, actividades, tareasPendientes,
  alertas, accesosConcedidos, accesosTotal, enlaces, estrategia, onIr, onAbrirNegocio, onActualizar, diasAlertaCotizacion = 7,
}) => {
  const [cotizaciones, setCotizaciones] = useState<CotRes[]>([]);
  const [proyectos, setProyectos] = useState<ProyectoRes[]>([]);
  const [riesgosTxt, setRiesgosTxt] = useState(empresa.riesgos_oportunidades ?? '');

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
  // Cotización vigente: la más reciente que sigue abierta (enviada) o aceptada
  const vigente = cotizaciones.find((c) => ['enviada', 'aceptada'].includes(estadoEfectivo(c)));
  const alertasCot: AlertaResumen[] = cotizaciones
    .filter((c) => c.estado === 'enviada')
    .flatMap((c) => {
      const dias = Math.ceil((new Date(`${c.vence_el.slice(0, 10)}T00:00:00`).getTime() - hoyMs) / 86400000);
      if (dias < 0) return [{ texto: `${formatCorrelativo('COT', c.numero)} venció sin respuesta`, tono: 'alerta' as const, destino: 'cotizaciones' as const }];
      if (dias <= diasAlertaCotizacion) return [{ texto: `${formatCorrelativo('COT', c.numero)} vence en ${dias} día(s)`, tono: 'alerta' as const, destino: 'cotizaciones' as const }];
      return [];
    });

  // Alertas derivadas de los campos manuales de la ficha
  const alertasFicha: AlertaResumen[] = [];
  if (empresa.estado_pago === 'atrasado') alertasFicha.push({ texto: 'Pago atrasado', tono: 'alerta', destino: 'info' });
  if (empresa.estado_pago === 'por_vencer') alertasFicha.push({ texto: 'Pago por vencer', tono: 'info', destino: 'info' });
  if (empresa.proxima_facturacion && empresa.proxima_facturacion.slice(0, 10) < hoyISO) {
    alertasFicha.push({ texto: `Facturación vencida desde ${formatFecha(empresa.proxima_facturacion)}`, tono: 'alerta', destino: 'info' });
  }
  const todasAlertas = [...alertas, ...alertasFicha, ...alertasCot];

  // LTV estimado = MRR × meses desde inicio de contrato (no hay historial de pagos aún)
  const mesesContrato = empresa.inicio_contrato
    ? Math.max(0, Math.floor((hoyMs - new Date(`${fechaCorta(empresa.inicio_contrato)}T00:00:00`).getTime()) / (86400000 * 30.44)))
    : null;
  const ltvEstimado = mesesContrato !== null && empresa.mrr_actual_clp ? empresa.mrr_actual_clp * mesesContrato : null;

  const ultimasActividades = [...actividades]
    .sort((a, b) => b.fecha_actividad.localeCompare(a.fecha_actividad))
    .slice(0, 3);

  const estadoPagoSel = ESTADOS_PAGO.find((e) => e.valor === (empresa.estado_pago ?? ''))!;
  const tonoClase: Record<string, string> = { ok: 'text-[var(--c-ok)]', warn: 'text-[var(--c-warn)]', danger: 'text-[var(--c-danger)]', muted: 'text-[var(--c-muted)]' };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[300px_minmax(0,1fr)] gap-5 items-start">
        {/* Izquierda: identidad y estado de la cuenta */}
        <div className="space-y-4">
          <Tarjeta titulo="Cliente">
            <div className="space-y-3">
              {contactoPrincipal ? (
                <div className="p-3 bg-[var(--c-field)] rounded-lg border border-[var(--c-line)] space-y-1.5">
                  <p className="text-xs font-medium text-[var(--c-text)]">
                    {contactoPrincipal.nombre} {contactoPrincipal.apellido}
                  </p>
                  {contactoPrincipal.cargo && <p className="text-[11px] text-[var(--c-muted)]">{contactoPrincipal.cargo}</p>}
                  <div className="flex flex-col gap-1 pt-1">
                    <a href={`mailto:${contactoPrincipal.email}`} className="text-[11px] text-[var(--c-accent)] hover:underline flex items-center gap-1.5 truncate">
                      <Mail className="w-3 h-3 shrink-0" />{contactoPrincipal.email}
                    </a>
                    {contactoPrincipal.telefono && (
                      <a href={`tel:${contactoPrincipal.telefono.replace(/\s/g, '')}`} className="text-[11px] text-[var(--c-accent)] hover:underline flex items-center gap-1.5">
                        <Phone className="w-3 h-3 shrink-0" />{contactoPrincipal.telefono}
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <button onClick={() => onIr('contactos')} className="w-full text-left p-3 bg-[var(--c-field)] rounded-lg border border-dashed border-[var(--c-line)] text-[11px] text-[var(--c-muted)] hover:text-[var(--c-text-2)]">
                  Sin contacto principal. Agregar contacto
                </button>
              )}
              <div className="space-y-2">
                {empresa.razon_social && <Fila etiqueta="Razón social">{empresa.razon_social}</Fila>}
                {empresa.rut && <Fila etiqueta="RUT"><span className="font-mono">{formatRUT(empresa.rut)}</span></Fila>}
                {empresa.dominio_web && (
                  <Fila etiqueta="Web">
                    <a href={`https://${empresa.dominio_web}`} target="_blank" rel="noreferrer" className="hover:text-[var(--c-accent)] underline">{empresa.dominio_web}</a>
                  </Fila>
                )}
                {industria && <Fila etiqueta="Industria">{industria}</Fila>}
                <Fila etiqueta="Responsable">{responsable ?? 'Sin asignar'}</Fila>
              </div>
            </div>
          </Tarjeta>

          <Tarjeta titulo="Estado de cuenta">
            <div className="space-y-3">
              <Celda etiqueta="Salud de la cuenta">
                <select value={empresa.salud ?? ''} onChange={(e) => onActualizar({ salud: (e.target.value || null) as Empresa['salud'] })} className={campo}>
                  {SALUDES.map((s) => <option key={s.valor} value={s.valor}>{s.texto}</option>)}
                </select>
              </Celda>
              <Celda etiqueta="Estado de pago">
                <div className="grid grid-cols-2 gap-2">
                  <select value={empresa.estado_pago ?? ''} onChange={(e) => onActualizar({ estado_pago: (e.target.value || null) as EstadoPago | null })} className={campo}>
                    {ESTADOS_PAGO.map((s) => <option key={s.valor} value={s.valor}>{s.texto}</option>)}
                  </select>
                  <input type="date" aria-label="Último pago" title="Último pago" value={fechaCorta(empresa.fecha_ultimo_pago)} onChange={(e) => onActualizar({ fecha_ultimo_pago: e.target.value || null })} className={`${campo} font-mono`} />
                </div>
                <p className={`text-[10px] font-mono mt-1 ${tonoClase[estadoPagoSel.tono]}`}>
                  {estadoPagoSel.texto}{empresa.fecha_ultimo_pago ? ` · último pago ${formatFecha(empresa.fecha_ultimo_pago)}` : ''}
                </p>
              </Celda>
            </div>

            {accesosTotal > 0 && (
              <button onClick={() => onIr('marketing')} className="w-full flex items-center justify-between mt-4 pt-3 border-t border-[var(--c-line)] text-[11px] text-[var(--c-muted)] hover:text-[var(--c-text-2)]">
                <span>Accesos admin</span>
                <span className={`font-mono ${accesosConcedidos < accesosTotal ? 'text-[var(--c-warn)]' : 'text-[var(--c-ok)]'}`}>{accesosConcedidos}/{accesosTotal}</span>
              </button>
            )}
          </Tarjeta>
        </div>

        {/* Derecha: perfil comercial, enlaces y riesgos */}
        <div className="space-y-4">
          <Tarjeta titulo="Perfil comercial" accion={{ texto: 'Editar plan y fee', onClick: () => onIr('info') }}>
            <div className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-2 gap-4 text-xs">
              <Celda etiqueta="Plan">
                <span className="text-[var(--c-text)]">{empresa.plan ? (empresa.plan === 'personalizado' ? 'Personalizado' : `Plan ${empresa.plan}`) : 'Sin plan'}</span>
              </Celda>
              <Celda etiqueta="Fee mensual">
                <span className="font-mono text-[var(--c-text)]">{empresa.fee_mensual_clp ? formatCLP(empresa.fee_mensual_clp) : '—'}</span>
              </Celda>
              <Celda etiqueta="Inicio de contrato">
                <input type="date" value={fechaCorta(empresa.inicio_contrato)} onChange={(e) => onActualizar({ inicio_contrato: e.target.value || null })} className={`${campo} font-mono`} />
              </Celda>
              <Celda etiqueta="LTV estimado">
                <span className="font-mono text-[var(--c-text)]">
                  {ltvEstimado !== null ? formatCLP(ltvEstimado) : '—'}
                </span>
                {mesesContrato !== null && <span className="block text-[10px] font-mono text-[var(--c-muted)] mt-0.5">MRR × {mesesContrato} meses</span>}
              </Celda>
              <Celda etiqueta="Próxima facturación">
                <input type="date" value={fechaCorta(empresa.proxima_facturacion)} onChange={(e) => onActualizar({ proxima_facturacion: e.target.value || null })} className={`${campo} font-mono`} />
                <span className="block text-[10px] font-mono text-[var(--c-muted)] mt-0.5">Pago a {empresa.dias_pago ?? 30} días</span>
              </Celda>
              <Celda etiqueta="Próxima renovación">
                <input type="date" value={fechaCorta(empresa.fecha_renovacion)} onChange={(e) => onActualizar({ fecha_renovacion: e.target.value || null })} className={`${campo} font-mono`} />
                <span className="block text-[10px] font-mono text-[var(--c-muted)] mt-0.5">{empresa.renovacion_tipo === 'automatica' ? 'Automática' : 'Manual'}</span>
              </Celda>
            </div>
          </Tarjeta>

          <div className="grid grid-cols-[minmax(0,1fr)] md:grid-cols-2 gap-4">
            <Tarjeta titulo="Enlaces rápidos">
              <div className="space-y-2">{enlaces}</div>
            </Tarjeta>
            <Tarjeta titulo="Riesgos y oportunidades">
              <textarea
                value={riesgosTxt}
                onChange={(e) => setRiesgosTxt(e.target.value)}
                onBlur={() => { if (riesgosTxt !== (empresa.riesgos_oportunidades ?? '')) onActualizar({ riesgos_oportunidades: riesgosTxt.trim() || null }); }}
                placeholder="Churn, expansión, objeciones… (se guarda al salir del campo)"
                rows={5}
                className={`${campo} resize-y`}
              />
            </Tarjeta>
          </div>
        </div>
      </div>

      {/* Fila media: proyectos y alertas */}
      <div className="grid grid-cols-[minmax(0,1fr)] md:grid-cols-2 gap-4">
        <Tarjeta titulo={`Proyectos activos (${proyectos.length})`}>
          {proyectos.length === 0 ? (
            <p className="text-xs text-[var(--c-muted)]">Sin proyectos activos.</p>
          ) : (
            <ul className="space-y-3">
              {proyectos.map((p) => {
                const total = p.entregables.length;
                const hechos = p.entregables.filter((e) => e.estado === 'entregado').length;
                const pct = total ? Math.round((hechos / total) * 100) : 0;
                return (
                  <li key={p.id} className="space-y-1">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="truncate text-[var(--c-text)]">{p.nombre}</span>
                      <span className="shrink-0 font-mono text-[10px] text-[var(--c-muted)]">{ETIQUETA_PROYECTO[p.estado]}</span>
                    </div>
                    <div className="h-1.5 bg-[var(--c-line)] rounded overflow-hidden">
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
        </Tarjeta>

        <Tarjeta titulo={`Alertas${todasAlertas.length ? ` (${todasAlertas.length})` : ''}`}>
          {todasAlertas.length === 0 ? (
            <p className="text-xs text-[var(--c-muted)]">Sin alertas abiertas.</p>
          ) : (
            <ul className="space-y-1">
              {todasAlertas.map((a, i) => (
                <li key={`${a.texto}-${i}`}>
                  <button
                    type="button"
                    disabled={!a.destino}
                    onClick={() => a.destino && onIr(a.destino)}
                    className="w-full flex items-start gap-2.5 text-left text-xs text-[var(--c-text-2)] p-1.5 -mx-1.5 rounded enabled:hover:bg-[var(--c-surface-2)]"
                  >
                    <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${a.tono === 'alerta' ? 'bg-[var(--c-warn)]' : 'bg-[var(--c-info)]'}`} />
                    <span className="flex-1">{a.texto}</span>
                    {a.destino && <ChevronRight className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[var(--c-muted-2)]" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      </div>

      {/* Lo accionable */}
      <Tarjeta titulo="Próximos pasos" accion={{ texto: 'Ver tareas', onClick: () => onIr('tareas') }}>
        {tareasPendientes.length === 0 ? (
          <p className="text-xs text-[var(--c-muted)] py-2">Sin tareas pendientes para esta cuenta.</p>
        ) : (
          <div className="space-y-2">
            {tareasPendientes.slice(0, 3).map((t) => {
              const atrasada = !!t.fecha_vencimiento && new Date(t.fecha_vencimiento).getTime() < hoyMs - 86400000;
              return (
                <div key={t.id} className="flex items-center justify-between gap-3 p-3 bg-[var(--c-field)] rounded-lg border border-[var(--c-line)] text-xs">
                  <span className="font-medium text-[var(--c-text)] truncate">{t.titulo}</span>
                  <span className={`shrink-0 font-mono text-[10px] ${atrasada ? 'text-[var(--c-danger)]' : 'text-[var(--c-muted)]'}`}>
                    {atrasada ? 'Atrasada' : t.fecha_vencimiento ? formatFecha(t.fecha_vencimiento) : 'Sin fecha'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Tarjeta>

      <div className="grid grid-cols-[minmax(0,1fr)] md:grid-cols-2 gap-4">
        <Tarjeta titulo={`Negocios abiertos (${oportunidadesAbiertas.length})`} accion={{ texto: 'Ver todos', onClick: () => onIr('oportunidades') }}>
          {oportunidadesAbiertas.length === 0 ? (
            <p className="text-xs text-[var(--c-muted)] py-2">Sin negocios abiertos.</p>
          ) : (
            <ul className="space-y-1.5">
              {oportunidadesAbiertas.slice(0, 3).map((o) => (
                <li key={o.id}>
                  <button onClick={() => onAbrirNegocio(o.id)} className="w-full flex items-center justify-between gap-2 text-left text-xs hover:text-[var(--c-accent)]">
                    <span className="truncate text-[var(--c-text)]">{o.nombre}</span>
                    <span className="font-mono text-[var(--c-muted)] shrink-0">{formatMoneda(o.valor_neto, o.moneda)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>

        <Tarjeta titulo="Cotización vigente" accion={{ texto: 'Ver cotizaciones', onClick: () => onIr('cotizaciones') }}>
          {!vigente ? (
            <p className="text-xs text-[var(--c-muted)] py-2">Sin cotización enviada ni aceptada.</p>
          ) : (
            <div className="space-y-1 text-xs">
              <p className="text-[var(--c-text)] truncate">{formatCorrelativo('COT', vigente.numero)} · {vigente.titulo}</p>
              <p className="font-mono text-[var(--c-text)]">
                {formatMoneda(redondear(vigente.neto_mensual * (1 + vigente.iva_pct / 100), vigente.moneda), vigente.moneda)} /mes c/IVA
              </p>
              <p className="text-[10px] font-mono uppercase text-[var(--c-muted)]">{estadoEfectivo(vigente)} · vence {formatFecha(vigente.vence_el)}</p>
            </div>
          )}
        </Tarjeta>
      </div>

      <Tarjeta titulo="Última actividad" accion={{ texto: 'Ver actividad', onClick: () => onIr('actividades') }}>
        {ultimasActividades.length === 0 ? (
          <p className="text-xs text-[var(--c-muted)] py-2">Sin actividad registrada.</p>
        ) : (
          <ul className="space-y-1.5">
            {ultimasActividades.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 text-xs">
                <span className="truncate text-[var(--c-text)]"><span className="text-[10px] font-mono uppercase text-[var(--c-muted)] mr-2">{a.tipo.replace('_', ' ')}</span>{a.titulo}</span>
                <span className="font-mono text-[10px] text-[var(--c-muted)] shrink-0">{formatFecha(a.fecha_actividad)}</span>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      {estrategia}
    </div>
  );
};
