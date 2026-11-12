import React, { useEffect, useState } from 'react';
import { Mail, Phone, ChevronRight } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { formatCLP, formatFecha, formatMoneda, formatCorrelativo } from '../../lib/formatters';
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
  responsable?: string;
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

const ETIQUETA_PROYECTO: Record<ProyectoRes['estado'], string> = {
  planificado: 'Planificado',
  en_curso: 'En curso',
  pausado: 'Pausado',
  finalizado: 'Finalizado',
};

const input = 'w-full bg-[var(--c-field)] border border-[var(--c-line)] rounded px-2 py-1 text-xs text-[var(--c-text)]';
const soloFecha = (v?: string | null) => (v ? v.slice(0, 10) : '');
const hoyISO = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
})();

const Bloque: React.FC<{ titulo: string; accion?: { texto: string; onClick: () => void }; children: React.ReactNode }> = ({ titulo, accion, children }) => (
  <section className="ficha-card p-4">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-[11px] font-mono uppercase tracking-wider text-[var(--c-muted)]">{titulo}</h3>
      {accion && <button onClick={accion.onClick} className="text-[11px] text-[var(--c-accent)] hover:underline">{accion.texto}</button>}
    </div>
    {children}
  </section>
);

const Campo: React.FC<{ etiqueta: string; nota?: string; children: React.ReactNode }> = ({ etiqueta, nota, children }) => (
  <div className="min-w-0">
    <p className="text-[10px] font-mono uppercase text-[var(--c-muted)] mb-1">{etiqueta}</p>
    {children}
    {nota && <p className="text-[10px] font-mono text-[var(--c-muted)] mt-0.5">{nota}</p>}
  </div>
);

export const ResumenCuenta: React.FC<Props> = ({
  empresa, responsable, contactoPrincipal, oportunidadesAbiertas, actividades, tareasPendientes,
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
  const vigente = cotizaciones.find((c) => ['enviada', 'aceptada'].includes(estadoEfectivo(c)));
  const alertasCot: AlertaResumen[] = cotizaciones
    .filter((c) => c.estado === 'enviada')
    .flatMap((c) => {
      const dias = Math.ceil((new Date(`${c.vence_el.slice(0, 10)}T00:00:00`).getTime() - hoyMs) / 86400000);
      if (dias < 0) return [{ texto: `${formatCorrelativo('COT', c.numero)} venció sin respuesta`, tono: 'alerta' as const, destino: 'cotizaciones' as const }];
      if (dias <= diasAlertaCotizacion) return [{ texto: `${formatCorrelativo('COT', c.numero)} vence en ${dias} día(s)`, tono: 'alerta' as const, destino: 'cotizaciones' as const }];
      return [];
    });
  const alertasFicha: AlertaResumen[] = [];
  if (empresa.estado_pago === 'atrasado') alertasFicha.push({ texto: 'Pago atrasado', tono: 'alerta', destino: 'info' });
  if (empresa.estado_pago === 'por_vencer') alertasFicha.push({ texto: 'Pago por vencer', tono: 'info', destino: 'info' });
  if (empresa.proxima_facturacion && soloFecha(empresa.proxima_facturacion) < hoyISO) {
    alertasFicha.push({ texto: `Facturación vencida desde ${formatFecha(empresa.proxima_facturacion)}`, tono: 'alerta', destino: 'info' });
  }
  const todasAlertas = [...alertas, ...alertasFicha, ...alertasCot];

  const mesesContrato = empresa.inicio_contrato
    ? Math.max(0, Math.floor((hoyMs - new Date(`${soloFecha(empresa.inicio_contrato)}T12:00:00`).getTime()) / (86400000 * 30.44)))
    : null;
  const ltvEstimado = mesesContrato !== null && empresa.mrr_actual_clp ? empresa.mrr_actual_clp * mesesContrato : null;

  const ultimasActividades = [...actividades].sort((a, b) => b.fecha_actividad.localeCompare(a.fecha_actividad)).slice(0, 3);
  const tonoPago = empresa.estado_pago === 'atrasado' ? 'text-[var(--c-danger)]' : empresa.estado_pago === 'por_vencer' ? 'text-[var(--c-warn)]' : empresa.estado_pago === 'al_dia' ? 'text-[var(--c-ok)]' : 'text-[var(--c-text)]';

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[280px_minmax(0,1fr)] gap-4 items-start">
      {/* Izquierda: quién es el cliente y dónde está todo */}
      <aside className="space-y-4">
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
        <Bloque titulo="Contrato y cobranza" accion={{ texto: 'Editar plan y fee', onClick: () => onIr('info') }}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-4 text-xs">
            <Campo etiqueta="Salud">
              <select value={empresa.salud ?? ''} onChange={(e) => onActualizar({ salud: (e.target.value || null) as Empresa['salud'] })} className={input}>
                {SALUDES.map((s) => <option key={s.valor} value={s.valor}>{s.texto}</option>)}
              </select>
            </Campo>
            <Campo etiqueta="Estado de pago">
              <select value={empresa.estado_pago ?? ''} onChange={(e) => onActualizar({ estado_pago: (e.target.value || null) as EstadoPago | null })} className={`${input} ${tonoPago}`}>
                {ESTADOS_PAGO.map((s) => <option key={s.valor} value={s.valor}>{s.texto}</option>)}
              </select>
            </Campo>
            <Campo etiqueta="Último pago">
              <input type="date" value={soloFecha(empresa.fecha_ultimo_pago)} onChange={(e) => onActualizar({ fecha_ultimo_pago: e.target.value || null })} className={`${input} font-mono`} />
            </Campo>

            <Campo etiqueta="Plan">
              <span className="text-[var(--c-text)]">{empresa.plan ? (empresa.plan === 'personalizado' ? 'Personalizado' : `Plan ${empresa.plan}`) : 'Sin plan'}</span>
            </Campo>
            <Campo etiqueta="Fee mensual">
              <span className="font-mono text-[var(--c-text)]">{empresa.fee_mensual_clp ? formatCLP(empresa.fee_mensual_clp) : '—'}</span>
            </Campo>
            <Campo etiqueta="Inicio de contrato">
              <input type="date" value={soloFecha(empresa.inicio_contrato)} onChange={(e) => onActualizar({ inicio_contrato: e.target.value || null })} className={`${input} font-mono`} />
            </Campo>

            <Campo etiqueta="Próxima facturación" nota={`Pago a ${empresa.dias_pago ?? 30} días`}>
              <input type="date" value={soloFecha(empresa.proxima_facturacion)} onChange={(e) => onActualizar({ proxima_facturacion: e.target.value || null })} className={`${input} font-mono`} />
            </Campo>
            <Campo etiqueta="Próxima renovación" nota={empresa.renovacion_tipo === 'automatica' ? 'Automática' : 'Manual'}>
              <input type="date" value={soloFecha(empresa.fecha_renovacion)} onChange={(e) => onActualizar({ fecha_renovacion: e.target.value || null })} className={`${input} font-mono`} />
            </Campo>
            <Campo etiqueta="LTV estimado" nota={mesesContrato !== null ? `MRR × ${mesesContrato} meses` : 'Falta inicio de contrato'}>
              <span className="font-mono text-[var(--c-text)]">{ltvEstimado !== null ? formatCLP(ltvEstimado) : '—'}</span>
            </Campo>
          </div>
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

          <div className="space-y-4 min-w-0">
            <Bloque titulo={`Negocios abiertos (${oportunidadesAbiertas.length})`} accion={{ texto: 'Ver todos', onClick: () => onIr('oportunidades') }}>
              {oportunidadesAbiertas.length === 0 ? (
                <p className="text-xs text-[var(--c-muted)]">Sin negocios abiertos.</p>
              ) : (
                <ul className="divide-y divide-[var(--c-line)] text-xs">
                  {oportunidadesAbiertas.slice(0, 3).map((o) => (
                    <li key={o.id}>
                      <button onClick={() => onAbrirNegocio(o.id)} className="w-full flex items-center justify-between gap-2 py-1.5 first:pt-0 last:pb-0 text-left hover:text-[var(--c-accent)]">
                        <span className="truncate text-[var(--c-text)]">{o.nombre}</span>
                        <span className="font-mono text-[var(--c-muted)] shrink-0">{formatMoneda(o.valor_neto, o.moneda)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Bloque>

            <Bloque titulo="Cotización vigente" accion={{ texto: 'Ver', onClick: () => onIr('cotizaciones') }}>
              {!vigente ? (
                <p className="text-xs text-[var(--c-muted)]">Sin cotización enviada ni aceptada.</p>
              ) : (
                <div className="space-y-1 text-xs">
                  <p className="text-[var(--c-text)] truncate">{formatCorrelativo('COT', vigente.numero)} · {vigente.titulo}</p>
                  <p className="font-mono text-[var(--c-text)]">
                    {formatMoneda(redondear(vigente.neto_mensual * (1 + vigente.iva_pct / 100), vigente.moneda), vigente.moneda)} /mes c/IVA
                  </p>
                  <p className="text-[10px] font-mono uppercase text-[var(--c-muted)]">{estadoEfectivo(vigente)} · vence {formatFecha(vigente.vence_el)}</p>
                </div>
              )}
            </Bloque>
          </div>
        </div>

        {proyectos.length > 0 && (
          <Bloque titulo={`Proyectos activos (${proyectos.length})`}>
            <ul className="grid grid-cols-[minmax(0,1fr)] md:grid-cols-2 gap-4">
              {proyectos.map((p) => {
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
          </Bloque>
        )}

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

        {estrategia}
      </div>
    </div>
  );
};
