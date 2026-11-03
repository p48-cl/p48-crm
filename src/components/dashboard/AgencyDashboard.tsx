import React, { useCallback, useEffect, useState } from 'react';
import { Gauge, Layers, CalendarRange, Users, Briefcase, ListChecks } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { parseSupabaseError } from '../../lib/errorHandler';
import { formatCLP } from '../../lib/formatters';
import {
  DashResultados,
  DashEmbudoEtapa,
  DashForecastMes,
  DashPipelineResponsable,
  DashClienteCartera,
  DashTareasResponsable,
} from '../../types/crm';

const card = 'surface p-5 space-y-4';
const titulo = 'text-xs font-semibold text-[#F5F5F5]';
const subtitulo = 'text-[11px] text-[#8E8E93]';

const mesCorto = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('es-CL', { month: 'short', year: '2-digit' });

const Cabecera: React.FC<{ icon: React.ReactNode; title: string; sub: string }> = ({ icon, title, sub }) => (
  <div className="flex items-center justify-between">
    <div>
      <h3 className={titulo}>{title}</h3>
      <p className={subtitulo}>{sub}</p>
    </div>
    <span className="text-[#888]">{icon}</span>
  </div>
);

const Vacio: React.FC<{ texto: string }> = ({ texto }) => (
  <p className="text-xs text-[#666] text-center py-6">{texto}</p>
);

export const AgencyDashboard: React.FC = () => {
  const [resultados, setResultados] = useState<DashResultados | null>(null);
  const [embudo, setEmbudo] = useState<DashEmbudoEtapa[]>([]);
  const [forecast, setForecast] = useState<DashForecastMes[]>([]);
  const [porResponsable, setPorResponsable] = useState<DashPipelineResponsable[]>([]);
  const [cartera, setCartera] = useState<DashClienteCartera[]>([]);
  const [tareas, setTareas] = useState<DashTareasResponsable[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    setCargando(true);
    setError(null);
    try {
      const [r, e, f, p, c, t] = await Promise.all([
        supabase.from('v_dash_resultados').select('*').maybeSingle(),
        supabase.from('v_dash_embudo').select('*').order('orden'),
        supabase.from('v_dash_forecast_mensual').select('*').order('mes'),
        supabase.from('v_dash_pipeline_responsable').select('*').order('valor_ponderado_total', { ascending: false }),
        supabase.from('v_dash_cartera_clientes').select('*').order('dias_a_renovacion', { ascending: true, nullsFirst: false }),
        supabase.from('v_dash_tareas_responsable').select('*').order('vencidas', { ascending: false }),
      ]);
      const fallo = [r, e, f, p, c, t].find((x) => x.error);
      if (fallo?.error) throw fallo.error;
      setResultados((r.data as DashResultados) ?? null);
      setEmbudo((e.data as DashEmbudoEtapa[]) ?? []);
      setForecast((f.data as DashForecastMes[]) ?? []);
      setPorResponsable((p.data as DashPipelineResponsable[]) ?? []);
      setCartera((c.data as DashClienteCartera[]) ?? []);
      setTareas((t.data as DashTareasResponsable[]) ?? []);
    } catch (err) {
      setError(parseSupabaseError(err));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (!isSupabaseConfigured) return null;

  const maxEmbudo = Math.max(...embudo.map((x) => Number(x.alcanzaron) || 0), 1);
  const maxForecast = Math.max(...forecast.map((x) => Number(x.valor_ponderado) || 0), 1);
  const maxResp = Math.max(...porResponsable.map((x) => Number(x.valor_ponderado_total) || 0), 1);

  return (
    <section className="space-y-4" aria-label="Dashboard de agencia">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-[#F5F5F5]">Dashboard de agencia</h2>
        <button
          type="button"
          onClick={cargar}
          disabled={cargando}
          className="text-[11px] font-mono uppercase text-[#8E8E93] hover:text-[#BEFF00] disabled:opacity-50"
        >
          {cargando ? 'Cargando…' : 'Actualizar'}
        </button>
      </div>

      {error && (
        <p className="text-xs text-[#E8005A] border border-[#E8005A]/40 rounded p-3">{error}</p>
      )}

      {/* Resultados comerciales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          { l: 'Tasa de cierre', v: resultados?.tasa_cierre_pct != null ? `${resultados.tasa_cierre_pct}%` : '—', s: `${resultados?.ganadas ?? 0} ganadas · ${resultados?.perdidas ?? 0} perdidas` },
          { l: 'Ciclo de venta', v: resultados?.ciclo_venta_dias != null ? `${resultados.ciclo_venta_dias} días` : '—', s: 'Promedio en ganadas' },
          { l: 'Valor ganado', v: formatCLP(Number(resultados?.valor_ganado_clp) || 0), s: 'Neto acumulado' },
          { l: 'Clientes activos', v: String(cartera.length), s: 'Estado cliente' },
        ].map((k) => (
          <div key={k.l} className="surface p-4 space-y-1">
            <p className="text-[11px] font-mono text-[#8E8E93] uppercase tracking-wider">{k.l}</p>
            <p className="text-lg font-mono font-bold text-[#F5F5F5] break-words">{k.v}</p>
            <p className="text-[10px] text-[#666]">{k.s}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Embudo */}
        <div className={card}>
          <Cabecera icon={<Layers className="w-4 h-4" />} title="Embudo comercial" sub="Aproximado: oportunidades que hoy están en esa etapa o más allá" />
          {embudo.length === 0 ? (
            <Vacio texto="Sin oportunidades todavía." />
          ) : (
            <div className="space-y-2.5">
              {embudo.map((e) => {
                const n = Number(e.alcanzaron) || 0;
                return (
                  <div key={e.etapa_id} className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[#CCC]">{e.nombre}</span>
                      <span className="font-mono text-[#8E8E93]">{n}</span>
                    </div>
                    <div className="w-full bg-[#1C1C1C] h-2 rounded overflow-hidden">
                      <div style={{ width: `${Math.round((n / maxEmbudo) * 100)}%` }} className="bg-[#BEFF00] h-full rounded" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Forecast */}
        <div className={card}>
          <Cabecera icon={<CalendarRange className="w-4 h-4" />} title="Forecast por mes de cierre" sub="Valor ponderado de oportunidades abiertas (CLP)" />
          {forecast.length === 0 ? (
            <Vacio texto="Sin fechas de cierre estimadas." />
          ) : (
            <div className="space-y-2.5">
              {forecast.map((f) => (
                <div key={f.mes} className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#CCC] capitalize">{mesCorto(f.mes)} · {f.oportunidades} op.</span>
                    <span className="font-mono text-[#8E8E93]">{formatCLP(Number(f.valor_ponderado) || 0)}</span>
                  </div>
                  <div className="w-full bg-[#1C1C1C] h-2 rounded overflow-hidden">
                    <div style={{ width: `${Math.round(((Number(f.valor_ponderado) || 0) / maxForecast) * 100)}%` }} className="bg-[#666] h-full rounded" />
                  </div>
                  <p className="text-[10px] text-[#666] font-mono">Neto {formatCLP(Number(f.valor_neto) || 0)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pipeline por responsable */}
        <div className={card}>
          <Cabecera icon={<Users className="w-4 h-4" />} title="Pipeline por responsable" sub="Oportunidades abiertas en CLP" />
          {porResponsable.length === 0 ? (
            <Vacio texto="Sin responsables activos." />
          ) : (
            <div className="space-y-3">
              {porResponsable.map((p) => (
                <div key={p.responsable_id} className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#CCC] truncate">{p.responsable} · {p.oportunidades_abiertas} op.</span>
                    <span className="font-mono text-[#8E8E93]">{formatCLP(Number(p.valor_ponderado_total) || 0)}</span>
                  </div>
                  <div className="w-full bg-[#1C1C1C] h-2 rounded overflow-hidden">
                    <div style={{ width: `${Math.round(((Number(p.valor_ponderado_total) || 0) / maxResp) * 100)}%` }} className="bg-[#BEFF00] h-full rounded" />
                  </div>
                  <p className="text-[10px] text-[#666] font-mono">Neto {formatCLP(Number(p.valor_neto_total) || 0)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tareas por responsable */}
        <div className={card}>
          <Cabecera icon={<ListChecks className="w-4 h-4" />} title="Tareas por responsable" sub="Pendientes, vencidas y de hoy" />
          {tareas.length === 0 ? (
            <Vacio texto="Sin tareas." />
          ) : (
            <div className="divide-y divide-[#222]">
              {tareas.map((t) => (
                <div key={t.responsable_id} className="py-2 flex items-center justify-between text-[11px]">
                  <span className="text-[#CCC] truncate pr-3">{t.responsable}</span>
                  <span className="font-mono text-[#8E8E93] whitespace-nowrap">
                    {t.pendientes} pend · {t.vencidas} venc · {t.hoy} hoy
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cartera de clientes */}
      <div className={card}>
        <Cabecera icon={<Briefcase className="w-4 h-4" />} title="Cartera de clientes" sub="MRR, plan y renovaciones (primero las más próximas)" />
        {cartera.length === 0 ? (
          <Vacio texto="Aún no hay clientes activos." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {cartera.map((c) => {
              const pronto = c.dias_a_renovacion != null && c.dias_a_renovacion <= 60;
              return (
                <div key={c.empresa_id} className="p-3 bg-[#101010] border border-[#262626] rounded space-y-1">
                  <div className="flex justify-between gap-2">
                    <span className="text-xs text-[#F5F5F5] font-medium truncate">{c.nombre}</span>
                    <span className="font-mono text-[10px] text-[#8E8E93] uppercase whitespace-nowrap">
                      {c.plan ? `Plan ${c.plan}` : 'Sin plan'}
                    </span>
                  </div>
                  <p className="font-mono text-[11px] text-[#CCC]">
                    MRR {c.mrr_actual_clp != null ? formatCLP(Number(c.mrr_actual_clp)) : '—'}
                  </p>
                  <p className={`font-mono text-[10px] ${pronto ? 'text-[#BEFF00]' : 'text-[#666]'}`}>
                    {c.dias_a_renovacion == null
                      ? 'Renovación sin fecha'
                      : c.dias_a_renovacion < 0
                      ? `Renovación vencida hace ${Math.abs(c.dias_a_renovacion)} días`
                      : `Renueva en ${c.dias_a_renovacion} días`}
                    {c.salud ? ` · Salud ${c.salud}` : ''}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
