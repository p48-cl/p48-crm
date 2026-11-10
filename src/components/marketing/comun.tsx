import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { formatCLP } from '../../lib/formatters';
import type { Agrega, FormatoKpi, KpiCanal } from './canales';

export interface Fila {
  empresa_id: string;
  plataforma: string;
  metrica: string;
  periodo: string;
  valor: number;
  es_prueba: boolean;
}
export interface Cliente {
  id: string;
  nombre: string;
}
export interface CuentaMkt {
  empresa_id: string;
  plataforma: string;
  etiqueta: string | null;
  estado: string;
  cuenta_externa: string | null;
  ultima_lectura: string | null;
}

// Métricas del hub. mejorSube=false: un valor menor es mejor (posición en Google).
export const METRICAS: {
  clave: string;
  plataforma: string;
  metrica: string;
  titulo: string;
  mejorSube: boolean;
  formato: (v: number) => string;
}[] = [
  { clave: 'ses', plataforma: 'ga4', metrica: 'sesiones', titulo: 'Sesiones GA4', mejorSube: true, formato: (v) => v.toLocaleString('es-CL') },
  { clave: 'clics', plataforma: 'gsc', metrica: 'clics', titulo: 'Clics GSC', mejorSube: true, formato: (v) => v.toLocaleString('es-CL') },
  { clave: 'pos', plataforma: 'gsc', metrica: 'posicion', titulo: 'Posición media', mejorSube: false, formato: (v) => v.toFixed(1) },
  { clave: 'inv', plataforma: 'google_ads', metrica: 'inversion', titulo: 'Inversión Ads', mejorSube: true, formato: (v) => formatCLP(v) },
  { clave: 'roas', plataforma: 'google_ads', metrica: 'roas', titulo: 'ROAS', mejorSube: true, formato: (v) => `${v.toFixed(1)}x` },
  { clave: 'res', plataforma: 'gbp', metrica: 'resenas', titulo: 'Reseñas GBP', mejorSube: true, formato: (v) => v.toLocaleString('es-CL') },
];

export const fechaCorta = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });

export const Variacion: React.FC<{ actual: number; previo?: number; mejorSube: boolean }> = ({ actual, previo, mejorSube }) => {
  if (previo === undefined || previo === 0) return null;
  const pct = ((actual - previo) / Math.abs(previo)) * 100;
  if (Math.abs(pct) < 0.5) return <Minus className="w-3 h-3 text-[var(--c-muted)] inline" />;
  const sube = pct > 0;
  const bueno = sube === mejorSube;
  const Icono = sube ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-mono ${bueno ? 'text-[var(--c-ok)]' : 'text-[var(--c-danger)]'}`}>
      <Icono className="w-3 h-3" />
      {Math.abs(pct).toFixed(0)}%
    </span>
  );
};

// Gráficos en SVG propio (no hay librería de gráficos en el proyecto).
export const Tendencia: React.FC<{ puntos: { etiqueta: string; valor: number }[]; formato: (v: number) => string }> = ({ puntos, formato }) => {
  const W = 640, H = 220, P = 40;
  const vals = puntos.map((p) => p.valor);
  const min = Math.min(...vals), max = Math.max(...vals);
  const rango = max - min || 1;
  const x = (i: number) => P + (i * (W - 2 * P)) / Math.max(puntos.length - 1, 1);
  const y = (v: number) => H - P - ((v - min) / rango) * (H - 2 * P);
  const d = puntos.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-56" role="img" aria-label="Tendencia">
      <line x1={P} x2={W - P} y1={H - P} y2={H - P} stroke="var(--c-line)" />
      <path d={d} fill="none" stroke="var(--c-accent)" strokeWidth={2} />
      {puntos.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.valor)} r={3} fill="var(--c-accent)">
            <title>{`${p.etiqueta}: ${formato(p.valor)}`}</title>
          </circle>
          <text x={x(i)} y={H - 12} textAnchor="middle" fontSize={11} fill="var(--c-muted)">{p.etiqueta}</text>
        </g>
      ))}
      <text x={P - 6} y={P} textAnchor="end" fontSize={11} fill="var(--c-muted)">{formato(max)}</text>
      <text x={P - 6} y={H - P} textAnchor="end" fontSize={11} fill="var(--c-muted)">{formato(min)}</text>
    </svg>
  );
};

export const Barras: React.FC<{ puntos: { etiqueta: string; valor: number }[]; formato: (v: number) => string }> = ({ puntos, formato }) => {
  const W = 640, H = 220, P = 40;
  const max = Math.max(...puntos.map((p) => p.valor), 1);
  const ancho = (W - 2 * P) / Math.max(puntos.length, 1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-56" role="img" aria-label="Barras por semana">
      <line x1={P} x2={W - P} y1={H - P} y2={H - P} stroke="var(--c-line)" />
      {puntos.map((p, i) => {
        const alto = (p.valor / max) * (H - 2 * P);
        return (
          <g key={i}>
            <rect x={P + i * ancho + ancho * 0.2} y={H - P - alto} width={ancho * 0.6} height={alto} rx={3} fill="var(--c-accent)">
              <title>{`${p.etiqueta}: ${formato(p.valor)}`}</title>
            </rect>
            <text x={P + i * ancho + ancho / 2} y={H - 12} textAnchor="middle" fontSize={11} fill="var(--c-muted)">{p.etiqueta}</text>
          </g>
        );
      })}
      <text x={P - 6} y={P} textAnchor="end" fontSize={11} fill="var(--c-muted)">{formato(max)}</text>
    </svg>
  );
};

// Carga clientes activos, métricas semanales y cuentas. La app solo muestra lo guardado.
export const useDatosMarketing = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filas, setFilas] = useState<Fila[]>([]);
  const [cuentas, setCuentas] = useState<CuentaMkt[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setCargando(false);
      return;
    }
    let vivo = true;
    (async () => {
      const [c, m, k] = await Promise.all([
        supabase!.from('empresas').select('id, nombre').eq('estado', 'cliente').eq('archivado', false).order('nombre'),
        supabase!
          .from('metricas_snapshot')
          .select('empresa_id, plataforma, metrica, periodo, valor, es_prueba')
          .order('periodo', { ascending: true })
          .limit(5000),
        supabase!
          .from('cuentas_cliente')
          .select('empresa_id, plataforma, etiqueta, estado, cuenta_externa, ultima_lectura')
          .eq('archivado', false),
      ]);
      if (!vivo) return;
      // Solo clientes: los datos de la cuenta interna de la agencia no entran en los totales.
      const lista = (c.data as Cliente[]) ?? [];
      const ids = new Set(lista.map((x) => x.id));
      setClientes(lista);
      setFilas(((m.data as any[]) ?? []).filter((r) => ids.has(r.empresa_id)).map((r) => ({ ...r, valor: Number(r.valor) })));
      setCuentas(((k.data as CuentaMkt[]) ?? []).filter((r) => ids.has(r.empresa_id)));
      setCargando(false);
    })();
    return () => {
      vivo = false;
    };
  }, []);

  return { clientes, filas, cuentas, cargando };
};

// Métricas de una plataforma para un cliente (tabla metricas_snapshot).
export interface Medida {
  plataforma: string;
  metrica: string;
  periodo: string;
  valor: number;
}

export function useMetricasCliente(clienteId: string, plataformas: string[]) {
  const [filas, setFilas] = useState<Medida[]>([]);
  const [error, setError] = useState<string | null>(null);
  const clave = plataformas.join(',');

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !clienteId || !clave) return;
    let vivo = true;
    supabase
      .from('metricas_snapshot')
      .select('plataforma,metrica,periodo,valor')
      .eq('empresa_id', clienteId)
      .in('plataforma', clave.split(','))
      .order('periodo', { ascending: true })
      .limit(5000)
      .then(({ data, error: err }) => {
        if (!vivo) return;
        setError(err ? err.message : null);
        setFilas(((data ?? []) as Medida[]).map((p) => ({ ...p, valor: Number(p.valor) })));
      });
    return () => {
      vivo = false;
    };
  }, [clienteId, clave]);

  return { filas, error };
}

// Filtro de periodo: cuántas semanas recientes se consideran. 0 = todo el histórico.
export type Rango = 1 | 4 | 12 | 0;
const RANGOS: { valor: Rango; etiqueta: string }[] = [
  { valor: 1, etiqueta: 'Última semana' },
  { valor: 4, etiqueta: '4 semanas' },
  { valor: 12, etiqueta: '12 semanas' },
  { valor: 0, etiqueta: 'Todo' },
];

export const FiltroPeriodo: React.FC<{ valor: Rango; onChange: (r: Rango) => void }> = ({ valor, onChange }) => (
  <div role="group" aria-label="Periodo" className="inline-flex flex-wrap gap-1 p-0.5 rounded-md bg-[var(--c-surface-2)]">
    {RANGOS.map((r) => (
      <button
        key={r.valor}
        type="button"
        onClick={() => onChange(r.valor)}
        aria-pressed={valor === r.valor}
        className={`px-2.5 py-1 text-xs rounded ${
          valor === r.valor
            ? 'bg-[var(--c-surface)] text-[var(--c-text)] font-semibold ring-1 ring-[var(--module)]'
            : 'text-[var(--c-muted)] hover:text-[var(--c-text-2)]'
        }`}
      >
        {r.etiqueta}
      </button>
    ))}
  </div>
);

// Periodos de la ventana actual y de la inmediatamente anterior de igual largo (para comparar).
export function ventanas(periodos: string[], n: Rango): { actual: string[]; previa: string[] } {
  const orden = [...new Set(periodos)].sort();
  if (n === 0) return { actual: orden, previa: [] };
  return { actual: orden.slice(-n), previa: orden.slice(-2 * n, -n) };
}

export const formatearValor = (v: number, f: FormatoKpi) => {
  if (f === 'clp') return formatCLP(v);
  if (f === 'pct') return `${(v * 100).toFixed(1)}%`;
  if (f === 'decimal') return v.toFixed(1);
  if (f === 'x') return `${v.toFixed(1)}x`;
  return Math.round(v).toLocaleString('es-CL');
};

// Valor de una métrica en una ventana: suma, promedio o último registro disponible.
export function valorVentana(filas: Medida[], metrica: string, periodos: string[], agrega: Agrega): number | undefined {
  const porSemana = periodos
    .map((p) => filas.filter((f) => f.metrica === metrica && f.periodo === p))
    .filter((rs) => rs.length > 0)
    .map((rs) => rs.reduce((a, r) => a + r.valor, 0));
  if (porSemana.length === 0) return undefined;
  if (agrega === 'suma') return porSemana.reduce((a, b) => a + b, 0);
  if (agrega === 'promedio') return porSemana.reduce((a, b) => a + b, 0) / porSemana.length;
  return porSemana[porSemana.length - 1];
}

// Métricas básicas de una plataforma: tarjetas con variación, gráfico de la principal y tabla completa.
export const KpisCanal: React.FC<{
  kpis: KpiCanal[];
  filas: Medida[];
  ventana: { actual: string[]; previa: string[] };
}> = ({ kpis, filas, ventana }) => {
  const metricas = [...new Set(filas.filter((f) => ventana.actual.includes(f.periodo)).map((f) => f.metrica))];
  const config = (m: string) => kpis.find((k) => k.metrica === m);
  const principal = kpis[0];
  const puntos = principal
    ? ventana.actual.flatMap((p) => {
        const rs = filas.filter((f) => f.metrica === principal.metrica && f.periodo === p);
        return rs.length > 0 ? [{ etiqueta: fechaCorta(p), valor: rs.reduce((a, r) => a + r.valor, 0) }] : [];
      })
    : [];

  if (metricas.length === 0) return <p className="text-xs text-[var(--c-muted)]">Sin datos en el periodo seleccionado.</p>;

  const formatoDe = (m: string) => (v: number) => formatearValor(v, config(m)?.formato ?? 'entero');

  return (
    <div className="space-y-4">
      {kpis.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map((k) => {
            const a = valorVentana(filas, k.metrica, ventana.actual, k.agrega);
            const b = valorVentana(filas, k.metrica, ventana.previa, k.agrega);
            return (
              <div key={k.metrica} className="surface p-4 space-y-1">
                <p className="text-[11px] font-mono uppercase tracking-wider text-[var(--c-muted)]">{k.titulo}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold font-mono text-[var(--c-text)]">
                    {a === undefined ? '—' : formatearValor(a, k.formato)}
                  </span>
                  {a !== undefined && b !== undefined && <Variacion actual={a} previo={b} mejorSube={k.mejorSube ?? true} />}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {principal && puntos.length >= 2 && (
        <div className="surface p-4 space-y-2">
          <p className="text-sm font-semibold text-[var(--c-text)]">{principal.titulo} por semana</p>
          {principal.agrega === 'suma' ? (
            <Barras puntos={puntos} formato={formatoDe(principal.metrica)} />
          ) : (
            <Tendencia puntos={puntos} formato={formatoDe(principal.metrica)} />
          )}
        </div>
      )}

      <div className="surface overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[10px] font-mono uppercase tracking-wider text-[var(--c-muted)]">
              <th className="py-2 px-3 font-normal">Métrica</th>
              <th className="py-2 px-3 font-normal text-right">Valor</th>
              <th className="py-2 px-3 font-normal text-right">Vs periodo anterior</th>
            </tr>
          </thead>
          <tbody>
            {metricas.map((m) => {
              const k = config(m);
              const agrega = k?.agrega ?? 'suma';
              const a = valorVentana(filas, m, ventana.actual, agrega);
              const b = valorVentana(filas, m, ventana.previa, agrega);
              return (
                <tr key={m} className="border-t border-[var(--c-line)] text-[var(--c-text-2)]">
                  <td className="py-2 px-3 capitalize">{m.replace(/_/g, ' ')}</td>
                  <td className="py-2 px-3 text-right font-mono text-[var(--c-text)]">
                    {a === undefined ? '—' : formatearValor(a, k?.formato ?? 'entero')}
                  </td>
                  <td className="py-2 px-3 text-right">
                    {a !== undefined && b !== undefined && <Variacion actual={a} previo={b} mejorSube={k?.mejorSube ?? true} />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
