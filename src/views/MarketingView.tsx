import React, { useEffect, useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Play } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { formatCLP } from '../lib/formatters';
import { useAuth } from '../context/AuthContext';

interface Fila {
  empresa_id: string;
  plataforma: string;
  metrica: string;
  periodo: string;
  valor: number;
  es_prueba: boolean;
}
interface Cliente {
  id: string;
  nombre: string;
}

// Métricas del hub. mejorSube=false: un valor menor es mejor (posición en Google).
const METRICAS: {
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

const Tendencia: React.FC<{ puntos: { periodo: string; valor: number }[]; formato: (v: number) => string }> = ({ puntos, formato }) => {
  const W = 640, H = 220, P = 36;
  const vals = puntos.map((p) => p.valor);
  const min = Math.min(...vals), max = Math.max(...vals);
  const rango = max - min || 1;
  const x = (i: number) => P + (i * (W - 2 * P)) / (puntos.length - 1);
  const y = (v: number) => H - P - ((v - min) / rango) * (H - 2 * P);
  const d = puntos.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-56" role="img" aria-label="Tendencia">
      <line x1={P} x2={W - P} y1={H - P} y2={H - P} stroke="var(--c-line)" />
      <path d={d} fill="none" stroke="var(--c-accent)" strokeWidth={2} />
      {puntos.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.valor)} r={3} fill="var(--c-accent)">
            <title>{`${p.periodo}: ${formato(p.valor)}`}</title>
          </circle>
          <text x={x(i)} y={H - 12} textAnchor="middle" fontSize={11} fill="var(--c-muted)">{p.periodo}</text>
        </g>
      ))}
      <text x={P - 6} y={P} textAnchor="end" fontSize={11} fill="var(--c-muted)">{formato(max)}</text>
      <text x={P - 6} y={H - P} textAnchor="end" fontSize={11} fill="var(--c-muted)">{formato(min)}</text>
    </svg>
  );
};

const Variacion: React.FC<{ actual: number; previo?: number; mejorSube: boolean }> = ({ actual, previo, mejorSube }) => {
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

export const MarketingView: React.FC = () => {
  const { currentUser } = useAuth() as any;
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filas, setFilas] = useState<Fila[]>([]);
  const [clienteId, setClienteId] = useState<string>('');
  const [metricaGrafico, setMetricaGrafico] = useState<string>('ses');
  const [cargando, setCargando] = useState(true);
  const [solicitud, setSolicitud] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setCargando(false);
      return;
    }
    let vivo = true;
    (async () => {
      const [c, m] = await Promise.all([
        supabase!.from('empresas').select('id, nombre').eq('estado', 'cliente').eq('archivado', false).order('nombre'),
        supabase!
          .from('metricas_snapshot')
          .select('empresa_id, plataforma, metrica, periodo, valor, es_prueba')
          .order('periodo', { ascending: true })
          .limit(5000),
      ]);
      if (!vivo) return;
      const lista = (c.data as Cliente[]) ?? [];
      setClientes(lista);
      setClienteId((prev) => prev || lista[0]?.id || '');
      setFilas(((m.data as any[]) ?? []).map((r) => ({ ...r, valor: Number(r.valor) })));
      setCargando(false);
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const cliente = clientes.find((c) => c.id === clienteId);

  // Serie por métrica para el cliente seleccionado, ordenada por periodo.
  const serie = useMemo(() => {
    const out = new Map<string, Fila[]>();
    for (const f of filas) {
      if (f.empresa_id !== clienteId) continue;
      const k = `${f.plataforma}|${f.metrica}`;
      const lista = out.get(k) ?? [];
      lista.push(f);
      out.set(k, lista);
    }
    return out;
  }, [filas, clienteId]);

  const esPrueba = filas.some((f) => f.empresa_id === clienteId && f.es_prueba);
  const metricaActiva = METRICAS.find((m) => m.clave === metricaGrafico) ?? METRICAS[0];
  const puntosGrafico = (serie.get(`${metricaActiva.plataforma}|${metricaActiva.metrica}`) ?? []).map((f) => ({
    periodo: new Date(f.periodo + 'T12:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }),
    valor: f.valor,
  }));

  const pedirAnalisis = async () => {
    if (!supabase || !currentUser?.id) return;
    const { error } = await supabase.from('analisis_solicitudes').insert({ solicitado_por: currentUser.id });
    setSolicitud(
      error
        ? 'No se pudo registrar la solicitud.'
        : 'Solicitud registrada. El análisis se ejecuta los lunes o cuando lo corras desde Claude.',
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--c-text)]">Marketing</h1>
          <p className="text-xs text-[var(--c-muted)] mt-0.5">
            Hub por cliente. Lectura semanal del conector; la app solo muestra lo guardado.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-[var(--c-surface)] border border-[var(--c-line)] rounded text-[var(--c-text)]"
            aria-label="Cliente"
          >
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
          <button
            onClick={pedirAnalisis}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-[var(--c-accent)] text-[var(--c-on-accent)]"
          >
            <Play className="w-3.5 h-3.5" /> Ejecutar análisis
          </button>
        </div>
      </div>

      {solicitud && <p className="text-xs text-[var(--c-text-2)]">{solicitud}</p>}
      {esPrueba && (
        <p className="text-[11px] font-mono text-[var(--c-warn)]">Datos de prueba: no son métricas reales del cliente.</p>
      )}

      {cargando ? (
        <p className="text-sm text-[var(--c-muted)]">Cargando...</p>
      ) : clientes.length === 0 ? (
        <div className="surface p-6 text-sm text-[var(--c-muted)]">No hay clientes activos todavía.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {METRICAS.map((m) => {
              const s = serie.get(`${m.plataforma}|${m.metrica}`) ?? [];
              const ultimo = s[s.length - 1];
              const previo = s[s.length - 2];
              return (
                <button
                  key={m.clave}
                  onClick={() => setMetricaGrafico(m.clave)}
                  className={`surface p-4 text-left space-y-1 ${metricaGrafico === m.clave ? 'border-[var(--c-accent)]' : ''}`}
                >
                  <p className="text-[11px] font-mono uppercase tracking-wider text-[var(--c-muted)]">{m.titulo}</p>
                  {ultimo ? (
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold font-mono text-[var(--c-text)]">{m.formato(ultimo.valor)}</span>
                      <Variacion actual={ultimo.valor} previo={previo?.valor} mejorSube={m.mejorSube} />
                    </div>
                  ) : (
                    <span className="text-sm text-[var(--c-muted-2)]">Sin datos</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="surface p-4 space-y-2">
            <p className="text-sm font-semibold text-[var(--c-text)]">
              {metricaActiva.titulo} · {cliente?.nombre}
            </p>
            {puntosGrafico.length > 1 ? (
              <Tendencia puntos={puntosGrafico} formato={metricaActiva.formato} />
            ) : (
              <p className="text-xs text-[var(--c-muted)]">Sin lecturas para este cliente.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};
