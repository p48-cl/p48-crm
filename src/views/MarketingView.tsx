import React, { useEffect, useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { formatCLP } from '../lib/formatters';

interface Fila {
  empresa_id: string;
  plataforma: string;
  metrica: string;
  periodo: string;
  valor: number;
}
interface Cliente {
  id: string;
  nombre: string;
}

// Columnas del scorecard. mejorSube=false: un valor menor es mejor (posición en Google).
const COLUMNAS: {
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
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filas, setFilas] = useState<Fila[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setCargando(false);
      return;
    }
    let vivo = true;
    (async () => {
      const [c, m] = await Promise.all([
        supabase!.from('empresas').select('id, nombre').eq('estado', 'cliente').eq('archivado', false).order('nombre'),
        supabase!.from('metricas_snapshot').select('empresa_id, plataforma, metrica, periodo, valor').order('periodo', { ascending: false }).limit(2000),
      ]);
      if (!vivo) return;
      setClientes((c.data as Cliente[]) ?? []);
      setFilas(((m.data as any[]) ?? []).map((r) => ({ ...r, valor: Number(r.valor) })));
      setCargando(false);
    })();
    return () => {
      vivo = false;
    };
  }, []);

  // Para cada cliente y métrica: último valor, anterior y fecha del último periodo.
  const datos = useMemo(() => {
    const mapa = new Map<string, Fila[]>();
    for (const f of filas) {
      const k = `${f.empresa_id}|${f.plataforma}|${f.metrica}`;
      const lista = mapa.get(k) ?? [];
      lista.push(f);
      mapa.set(k, lista);
    }
    return mapa;
  }, [filas]);

  const ultimoPeriodo = filas.length ? filas.reduce((a, f) => (f.periodo > a ? f.periodo : a), filas[0].periodo) : null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--c-text)]">Marketing</h1>
        <p className="text-xs text-[var(--c-muted)] mt-0.5">
          Scorecard semanal de clientes activos. Lectura desde el conector, sin editar a mano.
          {ultimoPeriodo && ` Último periodo: ${new Date(ultimoPeriodo + 'T12:00:00').toLocaleDateString('es-CL')}.`}
        </p>
      </div>

      {cargando ? (
        <p className="text-sm text-[var(--c-muted)]">Cargando...</p>
      ) : clientes.length === 0 ? (
        <div className="surface p-6 text-sm text-[var(--c-muted)]">No hay clientes activos todavía.</div>
      ) : (
        <div className="surface overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[var(--c-muted)] border-b border-[var(--c-line)]">
                <th className="p-3 font-medium">Cliente</th>
                {COLUMNAS.map((c) => (
                  <th key={c.clave} className="p-3 font-medium whitespace-nowrap">
                    {c.titulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clientes.map((cli) => (
                <tr key={cli.id} className="border-b border-[var(--c-line)] last:border-0">
                  <td className="p-3 font-medium text-[var(--c-text)] whitespace-nowrap">{cli.nombre}</td>
                  {COLUMNAS.map((col) => {
                    const serie = datos.get(`${cli.id}|${col.plataforma}|${col.metrica}`);
                    if (!serie || serie.length === 0)
                      return (
                        <td key={col.clave} className="p-3 text-[var(--c-muted-2)]">
                          —
                        </td>
                      );
                    const [actual, previo] = serie;
                    return (
                      <td key={col.clave} className="p-3 whitespace-nowrap">
                        <span className="font-mono text-[var(--c-text)]">{col.formato(actual.valor)}</span>{' '}
                        <Variacion actual={actual.valor} previo={previo?.valor} mejorSube={col.mejorSube} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!cargando && filas.length === 0 && (
        <p className="text-xs text-[var(--c-muted)]">
          Aún no hay lecturas. Los datos aparecen cuando se active la lectura semanal del conector.
        </p>
      )}
    </div>
  );
};
