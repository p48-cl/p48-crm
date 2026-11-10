import React, { useEffect, useMemo, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { FiltroPeriodo, KpisCanal, Rango, Variacion, fechaCorta, useDatosMarketing, useMetricasCliente, ventanas } from './comun';
import { KPIS_CANAL } from './canales';
import { ThOrdenable } from '../common/ThOrdenable';
import { useOrden } from '../../lib/orden';

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
  const [rango, setRango] = useState<Rango>(1);
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
  const v = useMemo(() => ventanas(periodos, rango), [periodos, rango]);
  // La posición es una foto: se compara el último corte de la ventana con el corte anterior a ella.
  const ultima = v.actual[v.actual.length - 1];
  const previa = v.previa[v.previa.length - 1];

  const { filas: medidas } = useMetricasCliente(clienteId, ['gsc']);
  const periodosMedidas = useMemo(() => [...new Set(medidas.map((m) => m.periodo))], [medidas]);
  const vm = useMemo(() => ventanas(periodosMedidas, rango), [periodosMedidas, rango]);

  const actual = useMemo(() => filas.filter((f) => f.periodo === ultima), [filas, ultima]);
  const anterior = useMemo(() => filas.filter((f) => f.periodo === previa), [filas, previa]);
  const rA = resumen(actual);
  const rP = resumen(anterior);

  const ordKw = useOrden<'keyword' | 'posicion' | 'cambio' | 'volumen' | 'dificultad' | 'url'>('posicion', 'asc');
  const tabla = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const filtradas = actual.filter((r) => !q || r.keyword.includes(q));
    return ordKw.ordenar(filtradas, (r, k) => {
      switch (k) {
        case 'keyword': return r.keyword;
        case 'posicion': return r.posicion ?? 999;
        case 'cambio': return r.posicion !== null && r.posicion_anterior !== null ? r.posicion_anterior - r.posicion : -999;
        case 'volumen': return r.volumen ?? -1;
        case 'dificultad': return r.dificultad ?? -1;
        case 'url': return r.url ?? '';
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actual, busqueda, ordKw.clave, ordKw.dir]);

  if (cargando) return <p className="text-sm text-[var(--c-muted)]">Cargando...</p>;
  if (clientes.length === 0) return <div className="surface p-6 text-sm text-[var(--c-muted)]">No hay clientes activos todavía.</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <select value={clienteId} onChange={(e) => setClienteSel(e.target.value)} className={select} aria-label="Cliente">
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <div className="flex flex-wrap items-center gap-2">
          <FiltroPeriodo valor={rango} onChange={setRango} />
          <span className="text-[11px] text-[var(--c-muted)]">
            {ultima ? `Corte ${fechaCorta(ultima)}${previa ? ` vs ${fechaCorta(previa)}` : ''}` : 'Sin datos. Carga un CSV en Cargar datos › SEO.'}
          </span>
        </div>
      </div>

      {error && <p className="text-xs text-[var(--c-danger)] border border-[var(--c-danger)]/40 rounded p-2">{error}</p>}

      {medidas.length > 0 && <KpisCanal kpis={KPIS_CANAL.gsc} filas={medidas} ventana={vm} />}

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
          <p className="text-xs text-[var(--c-muted)]">Sin palabras clave en el corte seleccionado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] font-mono uppercase tracking-wider text-[var(--c-muted)]">
                  <ThOrdenable etiqueta="Palabra clave" className="py-2 pr-3 font-normal" activa={ordKw.clave === 'keyword'} dir={ordKw.dir} onClick={() => ordKw.alternar('keyword')} />
                  <ThOrdenable etiqueta="Pos." className="py-2 pr-3 font-normal" alinear="right" activa={ordKw.clave === 'posicion'} dir={ordKw.dir} onClick={() => ordKw.alternar('posicion')} />
                  <ThOrdenable etiqueta="Cambio" className="py-2 pr-3 font-normal" alinear="right" activa={ordKw.clave === 'cambio'} dir={ordKw.dir} onClick={() => ordKw.alternar('cambio')} />
                  <ThOrdenable etiqueta="Volumen" className="py-2 pr-3 font-normal" alinear="right" activa={ordKw.clave === 'volumen'} dir={ordKw.dir} onClick={() => ordKw.alternar('volumen')} />
                  <ThOrdenable etiqueta="Dificultad" className="py-2 pr-3 font-normal" alinear="right" activa={ordKw.clave === 'dificultad'} dir={ordKw.dir} onClick={() => ordKw.alternar('dificultad')} />
                  <ThOrdenable etiqueta="URL" className="py-2 pr-3 font-normal" activa={ordKw.clave === 'url'} dir={ordKw.dir} onClick={() => ordKw.alternar('url')} />
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
