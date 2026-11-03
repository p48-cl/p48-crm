import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { formatCLP } from '../../lib/formatters';

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
      setClientes((c.data as Cliente[]) ?? []);
      setFilas(((m.data as any[]) ?? []).map((r) => ({ ...r, valor: Number(r.valor) })));
      setCuentas((k.data as CuentaMkt[]) ?? []);
      setCargando(false);
    })();
    return () => {
      vivo = false;
    };
  }, []);

  return { clientes, filas, cuentas, cargando };
};
