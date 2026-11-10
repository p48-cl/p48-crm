import React, { useEffect, useState } from 'react';
import { Mail, Phone, ChevronRight } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { formatCLP, formatFecha, formatMoneda, formatRUT, formatCorrelativo } from '../../lib/formatters';
import { estadoEfectivo, redondear, MonedaCotizacion } from '../../lib/cotizaciones';
import type { Actividad, Contacto, Empresa, Oportunidad, Tarea } from '../../types/crm';

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
  diasAlertaCotizacion?: number;
}

const Fila: React.FC<{ etiqueta: string; children: React.ReactNode }> = ({ etiqueta, children }) => (
  <div className="flex items-baseline justify-between gap-3 text-xs">
    <span className="text-[10px] font-mono uppercase text-[var(--c-muted)] shrink-0">{etiqueta}</span>
    <span className="text-[var(--c-text)] text-right min-w-0 truncate">{children}</span>
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
  alertas, accesosConcedidos, accesosTotal, enlaces, estrategia, onIr, onAbrirNegocio, diasAlertaCotizacion = 7,
}) => {
  const [cotizaciones, setCotizaciones] = useState<CotRes[]>([]);

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
  const todasAlertas = [...alertas, ...alertasCot];

  const ultimasActividades = [...actividades]
    .sort((a, b) => b.fecha_actividad.localeCompare(a.fecha_actividad))
    .slice(0, 3);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[300px_minmax(0,1fr)] gap-5 items-start">
      {/* Izquierda: ficha del cliente y alertas */}
      <div className="space-y-4">
        <div className="ficha-card p-4 space-y-3">
          <h3 className="text-xs font-semibold text-[var(--c-text)]">Cliente</h3>

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
            {empresa.dominio_web && (
              <Fila etiqueta="Web">
                <a href={`https://${empresa.dominio_web}`} target="_blank" rel="noreferrer" className="hover:text-[var(--c-accent)] underline">{empresa.dominio_web}</a>
              </Fila>
            )}
            {empresa.rut && <Fila etiqueta="RUT"><span className="font-mono">{formatRUT(empresa.rut)}</span></Fila>}
            {industria && <Fila etiqueta="Industria">{industria}</Fila>}
            <Fila etiqueta="Responsable">{responsable ?? 'Sin asignar'}</Fila>
            <Fila etiqueta="Plan">{empresa.plan ? (empresa.plan === 'personalizado' ? 'Personalizado' : `Plan ${empresa.plan}`) : 'Sin plan'}</Fila>
            <Fila etiqueta="Fee mensual"><span className="font-mono">{empresa.fee_mensual_clp ? formatCLP(empresa.fee_mensual_clp) : '—'}</span></Fila>
            <Fila etiqueta="Renovación">
              {empresa.fecha_renovacion ? `${formatFecha(empresa.fecha_renovacion)} · ${empresa.renovacion_tipo === 'automatica' ? 'auto' : 'manual'}` : '—'}
            </Fila>
          </div>

          {accesosTotal > 0 && (
            <button onClick={() => onIr('marketing')} className="w-full flex items-center justify-between pt-3 border-t border-[var(--c-line)] text-[11px] text-[var(--c-muted)] hover:text-[var(--c-text-2)]">
              <span>Accesos admin</span>
              <span className={`font-mono ${accesosConcedidos < accesosTotal ? 'text-[var(--c-warn)]' : 'text-[var(--c-ok)]'}`}>{accesosConcedidos}/{accesosTotal}</span>
            </button>
          )}

          <div className="space-y-2 pt-3 border-t border-[var(--c-line)]">{enlaces}</div>
        </div>

        <Tarjeta titulo={`Alertas${todasAlertas.length ? ` (${todasAlertas.length})` : ''}`}>
          {todasAlertas.length === 0 ? (
            <p className="text-xs text-[var(--c-muted)]">Sin alertas abiertas.</p>
          ) : (
            <ul className="space-y-1">
              {todasAlertas.map((a) => (
                <li key={a.texto}>
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

      {/* Derecha: lo accionable */}
      <div className="space-y-4">
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
    </div>
  );
};
