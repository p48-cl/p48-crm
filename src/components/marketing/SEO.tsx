import React, { useEffect, useMemo, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { Variacion, fechaCorta, useDatosMarketing } from './comun';

interface Kw {
  keyword: string;
  periodo: string;
  posicion: number | null;
  posicion_anterior: number | null;
  volumen: number | null;
  dificultad: number | null;
  url: string | null;
}

const select = 'px-2.5 py-1.5 text-xs bg-[var(--c-surface)] border border-[var(--c-line)] rounded text-[var(--c-text)]';

const resumen = (rows: Kw[]) => {
  const pos = rows.map((r) => r.posicion).filter((v): v is number => v !== null);
  return {
    total: rows.length,
    top3: pos.filter((p) => p <= 3).length,
    top10: pos.filter((p) => p <= 10).length,
    media: pos.length ? pos.reduce((a, b) => a + b, 0) / pos.length : null,
  };
};

export const SEO: React.FC = () => {
  const { clientes, cargando } = useDatosMarketing();
  const [clienteSel, setClienteSel] = useState('');
  const [filas, setFilas] = useState<Kw[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState<string | null>(null);

  const clienteId = clienteSel || clientes[0]?.id || '';

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !clienteId) return;
    let vivo = true;
    supabase
      .from('seo_keywords')
      .select('keyword,periodo,posicion,posicion_anterior,volumen,dificultad,url')
      .eq('empresa_id', clienteId)
      .order('periodo', { ascending: true })
      .limit(5000)
      .then(({ data, error: err }) => {
        if (!vivo) return;
        if (err) setError(err.message);
        setFilas(((data ?? []) as Kw[]).map((r) => ({
          ...r,
          posicion: r.posicion === null ? null : Number(r.posicion),
          posicion_anterior: r.posicion_anterior === null ? null : Number(r.posicion_anterior),
          volumen: r.volumen === null ? null : Number(r.volumen),
          dificultad: r.dificultad === null ? null : Number(r.dificultad),
        })));
      });
    return () => { vivo = false; };
  }, [clienteId]);

  const periodos = useMemo(() => [...new Set(filas.map((f) => f.periodo))].sort(), [filas]);
  const ultima = periodos[periodos.length - 1];
  const previa = periodos[periodos.length - 2];

  const actual = useMemo(() => filas.filter((f) => f.periodo === ultima), [filas, ultima]);
  const anterior = useMemo(() => filas.filter((f) => f.periodo === previa), [filas, previa]);
  const rA = resumen(actual);
  const rP = resumen(anterior);

  const tabla = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return actual
      .filter((r) => !q || r.keyword.includes(q))
      .sort((a, b) => (a.posicion ?? 999) - (b.posicion ?? 999));
  }, [actual, busqueda]);

  if (cargando) return <p className="text-sm text-[var(--c-muted)]">Cargando...</p>;
  if (clientes.length === 0) return <div className="surface p-6 text-sm text-[var(--c-muted)]">No hay clientes activos todavía.</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <select value={clienteId} onChange={(e) => setClienteSel(e.target.value)} className={select} aria-label="Cliente">
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <span className="text-[11px] text-[var(--c-muted)]">
          {ultima ? `Semana ${fechaCorta(ultima)}${previa ? ` vs ${fechaCorta(previa)}` : ''}` : 'Sin datos. Carga un CSV en Cargar datos › SEO.'}
        </span>
      </div>

      {error && <p className="text-xs text-[var(--c-danger)] border border-[var(--c-danger)]/40 rounded p-2">{error}</p>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="surface p-4 space-y-1">
          <p className="text-[11px] font-mono uppercase tracking-wider text-[var(--c-muted)]">Palabras clave</p>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold font-mono text-[var(--c-text)]">{rA.total}</span>
            <Variacion actual={rA.total} previo={rP.total || undefined} mejorSube />
          </div>
        </div>
        <div className="surface p-4 space-y-1">
          <p className="text-[11px] font-mono uppercase tracking-wider text-[var(--c-muted)]">Top 3</p>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold font-mono text-[var(--c-text)]">{rA.top3}</span>
            <Variacion actual={rA.top3} previo={rP.top3 || undefined} mejorSube />
          </div>
        </div>
        <div className="surface p-4 space-y-1">
          <p className="text-[11px] font-mono uppercase tracking-wider text-[var(--c-muted)]">Top 10</p>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold font-mono text-[var(--c-text)]">{rA.top10}</span>
            <Variacion actual={rA.top10} previo={rP.top10 || undefined} mejorSube />
          </div>
        </div>
        <div className="surface p-4 space-y-1">
          <p className="text-[11px] font-mono uppercase tracking-wider text-[var(--c-muted)]">Posición media</p>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold font-mono text-[var(--c-text)]">{rA.media === null ? '—' : rA.media.toFixed(1)}</span>
            {rA.media !== null && rP.media !== null && <Variacion actual={rA.media} previo={rP.media} mejorSube={false} />}
          </div>
        </div>
      </div>

      <div className="surface p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-[var(--c-text)]">Palabras clave</p>
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar palabra clave"
            className={`${select} w-56`}
          />
        </div>
        {tabla.length === 0 ? (
          <p className="text-xs text-[var(--c-muted)]">Sin palabras clave en la última semana.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] font-mono uppercase tracking-wider text-[var(--c-muted)]">
                  <th className="py-2 pr-3 font-normal">Palabra clave</th>
                  <th className="py-2 pr-3 font-normal text-right">Pos.</th>
                  <th className="py-2 pr-3 font-normal text-right">Cambio</th>
                  <th className="py-2 pr-3 font-normal text-right">Volumen</th>
                  <th className="py-2 pr-3 font-normal text-right">Dificultad</th>
                  <th className="py-2 pr-3 font-normal">URL</th>
                </tr>
              </thead>
              <tbody>
                {tabla.map((r) => {
                  const delta = r.posicion !== null && r.posicion_anterior !== null ? r.posicion_anterior - r.posicion : null;
                  return (
                    <tr key={r.keyword} className="border-t border-[var(--c-line)] text-[var(--c-text-2)]">
                      <td className="py-2 pr-3 text-[var(--c-text)]">{r.keyword}</td>
                      <td className="py-2 pr-3 text-right font-mono">{r.posicion ?? '—'}</td>
                      <td className={`py-2 pr-3 text-right font-mono ${delta === null || delta === 0 ? 'text-[var(--c-muted)]' : delta > 0 ? 'text-[var(--c-ok)]' : 'text-[var(--c-danger)]'}`}>
                        {delta === null ? '—' : delta === 0 ? '=' : delta > 0 ? `▲ ${delta}` : `▼ ${Math.abs(delta)}`}
                      </td>
                      <td className="py-2 pr-3 text-right font-mono">{r.volumen?.toLocaleString('es-CL') ?? '—'}</td>
                      <td className="py-2 pr-3 text-right font-mono">{r.dificultad ?? '—'}</td>
                      <td className="py-2 pr-3 max-w-[220px] truncate text-[var(--c-muted)]">{r.url ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
