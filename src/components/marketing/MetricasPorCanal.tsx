import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { formatCLP } from '../../lib/formatters';
import { CANALES, GRUPOS_CANAL, KpiCanal, Canal, useCanales } from './canales';
import { kpisParaRubro, useConfigMetricas } from './metricasConfig';
import { Variacion, fechaCorta, formatearValor, useMetricasCliente, ventanas, valorVentana } from './comun';

const PLATAFORMAS = CANALES.map((c) => c.plataforma);

interface Camp { campana_nombre: string; periodo: string; costo_clp: number; conversiones: number; valor_conversion_clp: number }

const TarjetaCanal: React.FC<{
  canal: Canal;
  kpis: KpiCanal[];
  filas: ReturnType<typeof useMetricasCliente>['filas'];
  ventana: { actual: string[]; previa: string[] };
  campanas: Camp[];
}> = ({ canal, kpis, filas, ventana, campanas }) => {
  const tieneDatos = kpis.some((k) => valorVentana(filas, k.metrica, ventana.actual, k.agrega) !== undefined);
  const esPrueba = filas.some((f) => f.plataforma === canal.plataforma && f.es_prueba);

  return (
    <div className="surface p-4 space-y-3">
      <p className="text-sm font-semibold text-[var(--c-text)]">
        {canal.nombre}
        {esPrueba && <span className="ml-2 font-mono text-[10px] uppercase text-[var(--c-warn)]">Prueba</span>}
      </p>
      {kpis.length === 0 ? (
        <p className="text-xs text-[var(--c-muted)]">Sin métricas configuradas para este rubro. Se definen en Administración &gt; Métricas por canal.</p>
      ) : !tieneDatos ? (
        <p className="text-xs text-[var(--c-muted)]">Sin datos en la última semana.</p>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {kpis.map((k) => {
            const a = valorVentana(filas, k.metrica, ventana.actual, k.agrega);
            const b = valorVentana(filas, k.metrica, ventana.previa, k.agrega);
            return (
              <div key={k.metrica} className="rounded bg-[var(--c-surface-2)] p-3 space-y-0.5">
                <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--c-muted)]">{k.titulo}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-bold font-mono text-[var(--c-text)]">{a === undefined ? '—' : formatearValor(a, k.formato)}</span>
                  {a !== undefined && b !== undefined && <Variacion actual={a} previo={b} mejorSube={k.mejorSube ?? true} />}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {canal.plataforma === 'google_ads' && campanas.length > 0 && (
        <div className="divide-y divide-[var(--c-line)] border-t border-[var(--c-line)]">
          {campanas.map((c) => (
            <div key={c.campana_nombre} className="py-2 flex items-center justify-between gap-3 text-xs">
              <span className="text-[var(--c-text)] truncate">{c.campana_nombre}</span>
              <span className="font-mono text-[var(--c-muted)] shrink-0">
                {formatCLP(c.costo_clp)} · {c.conversiones} conv.
                {c.costo_clp > 0 && c.valor_conversion_clp > 0 ? ` · ROAS ${(c.valor_conversion_clp / c.costo_clp).toFixed(1)}x` : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Métricas de la última semana vs la anterior, solo para canales conectados.
export const MetricasPorCanal: React.FC<{ empresaId: string; industriaId?: string | null }> = ({ empresaId, industriaId }) => {
  const canales = useCanales();
  const { filas: configFilas, error: errorConfig } = useConfigMetricas();
  const { filas, error } = useMetricasCliente(empresaId, PLATAFORMAS);
  const [camps, setCamps] = useState<Camp[]>([]);
  const [verSinConectar, setVerSinConectar] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !empresaId) return;
    let vivo = true;
    supabase
      .from('metricas_campanas')
      .select('campana_nombre,periodo,costo_clp,conversiones,valor_conversion_clp')
      .eq('empresa_id', empresaId)
      .order('periodo', { ascending: true })
      .limit(500)
      .then(({ data }) => {
        if (!vivo) return;
        setCamps(((data ?? []) as Camp[]).map((r) => ({ ...r, costo_clp: Number(r.costo_clp), conversiones: Number(r.conversiones), valor_conversion_clp: Number(r.valor_conversion_clp) })));
      });
    return () => { vivo = false; };
  }, [empresaId]);

  const periodos = [...new Set(filas.map((f) => f.periodo))].sort();
  const ventana = ventanas(periodos, 1);
  const ultimaSemana = ventana.actual[ventana.actual.length - 1];
  const ultimaCamp = [...new Set(camps.map((c) => c.periodo))].sort().pop();
  const campsSemana = camps.filter((c) => c.periodo === ultimaCamp);

  // Conectado para este cliente: ya llegaron datos de la plataforma
  const conectado = (c: Canal) => filas.some((f) => f.plataforma === c.plataforma);
  const conectados = canales.filter(conectado);
  const sinConectar = canales.filter((c) => !conectado(c));

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold text-[var(--c-text)]">Métricas por canal</h3>
        <span className="text-[11px] font-mono text-[var(--c-muted)]">
          {ultimaSemana ? `Semana ${fechaCorta(ultimaSemana)} vs anterior` : 'Sin datos'}
        </span>
      </div>
      {(error || errorConfig) && <p className="text-xs text-[var(--c-danger)]">{error ?? errorConfig}</p>}

      {GRUPOS_CANAL.map((g) => {
        const lista = conectados.filter((c) => c.tipo === g.tipo);
        if (lista.length === 0) return null;
        return (
          <div key={g.tipo} className="space-y-2">
            <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--c-muted)]">{g.titulo}</p>
            <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-2 gap-3">
              {lista.map((c) => (
                <TarjetaCanal
                  key={c.plataforma}
                  canal={c}
                  kpis={kpisParaRubro(configFilas ?? [], industriaId, c.plataforma)}
                  filas={filas}
                  ventana={ventana}
                  campanas={c.plataforma === 'google_ads' ? campsSemana : []}
                />
              ))}
            </div>
          </div>
        );
      })}

      {sinConectar.length > 0 && (
        <div className="surface p-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-[var(--c-muted)]">{sinConectar.length} canales sin datos</span>
            <button
              onClick={() => setVerSinConectar(!verSinConectar)}
              className="flex items-center gap-1 text-[11px] text-[var(--c-accent)] hover:underline"
            >
              {verSinConectar ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              Conectar
            </button>
          </div>
          {verSinConectar && (
            <ul className="divide-y divide-[var(--c-line)]">
              {sinConectar.map((c) => (
                <li key={c.plataforma} className="py-2 space-y-0.5">
                  <p className="text-xs font-semibold text-[var(--c-text)]">{c.nombre}</p>
                  <p className="text-[11px] text-[var(--c-muted)]">{c.muestra}</p>
                  <p className="text-[10px] font-mono text-[var(--c-muted-2)]">
                    Sin datos para este cliente. Conector {c.conector} · fuente {c.estado}.
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
};
