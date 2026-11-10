import React, { useMemo } from 'react';
import { useCRM } from '../../context/CRMContext';
import { formatCLP } from '../../lib/formatters';

const tarjeta = 'surface p-4 flex flex-col gap-2 min-w-0';
const etiqueta = 'text-[11px] font-mono uppercase tracking-wider text-[var(--c-muted)]';
const valor = 'text-lg font-bold font-mono text-[var(--c-text)] truncate';
const nota = 'text-[10px] text-[var(--c-muted)]';
const barra = 'h-1.5 w-full rounded-full bg-[var(--c-surface-3)] overflow-hidden flex';

export const PipelineKpis: React.FC = () => {
  const { oportunidades, etapas, kpis } = useCRM();

  const m = useMemo(() => {
    const ganadaIds = new Set(etapas.filter((e) => e.es_ganada).map((e) => e.id));
    const perdidaIds = new Set(etapas.filter((e) => e.es_perdida).map((e) => e.id));
    const vivas = oportunidades.filter((o) => !o.archivado);
    const abiertas = vivas.filter((o) => !ganadaIds.has(o.etapa_id) && !perdidaIds.has(o.etapa_id));
    const abiertasCLP = abiertas.filter((o) => o.moneda === 'CLP');
    const valorCLP = abiertasCLP.reduce((a, o) => a + (Number(o.valor_neto) || 0), 0);
    const valorUSD = abiertas
      .filter((o) => o.moneda !== 'CLP')
      .reduce((a, o) => a + (Number(o.valor_neto) || 0), 0);
    const ganadas = vivas.filter((o) => ganadaIds.has(o.etapa_id)).length;
    const perdidas = vivas.filter((o) => perdidaIds.has(o.etapa_id)).length;
    const cerradas = ganadas + perdidas;

    // Distribución por etapa: peso por valor en CLP; si no hay valor, por cantidad.
    const porEtapa = etapas
      .filter((e) => e.activa && !e.es_ganada && !e.es_perdida)
      .map((e) => {
        const ops = abiertas.filter((o) => o.etapa_id === e.id);
        const valorE = ops
          .filter((o) => o.moneda === 'CLP')
          .reduce((a, o) => a + (Number(o.valor_neto) || 0), 0);
        return { id: e.id, nombre: e.nombre, color: e.color || '#888888', n: ops.length, valor: valorE };
      })
      .filter((e) => e.n > 0);
    const usaValor = porEtapa.some((e) => e.valor > 0);
    const peso = (e: { valor: number; n: number }) => (usaValor ? e.valor : e.n);
    const totalPeso = porEtapa.reduce((a, e) => a + peso(e), 0);

    return {
      abiertas: abiertas.length,
      valorCLP,
      valorUSD,
      tasaCierre: cerradas > 0 ? (ganadas / cerradas) * 100 : null,
      ganadas,
      perdidas,
      porEtapa: porEtapa.map((e) => ({ ...e, pct: totalPeso > 0 ? (peso(e) / totalPeso) * 100 : 0 })),
    };
  }, [oportunidades, etapas]);

  const ponderado = Number(kpis.pipeline_ponderado_total) || 0;
  const pctPonderado = m.valorCLP > 0 ? (ponderado / m.valorCLP) * 100 : null;
  const trimestre = Math.floor(new Date().getMonth() / 3) + 1;
  const atrasados = kpis.seguimientos_atrasados_count;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      <div className={tarjeta}>
        <p className={etiqueta}>Pipeline abierto</p>
        <p className={valor}>{formatCLP(m.valorCLP)}</p>
        <p className={nota}>
          {m.abiertas} negocios
          {m.valorUSD > 0 && ` · US$ ${m.valorUSD.toLocaleString('es-CL')} aparte`}
        </p>
      </div>

      <div className={tarjeta}>
        <p className={etiqueta}>Forecast ponderado</p>
        <p className={valor}>{formatCLP(ponderado)}</p>
        <p className={nota}>
          {pctPonderado !== null ? `${pctPonderado.toFixed(0)}% del abierto · Q${trimestre}` : `Q${trimestre} ${new Date().getFullYear()}`}
        </p>
      </div>

      <div className={tarjeta}>
        <p className={etiqueta}>Tasa de cierre</p>
        <p className={valor}>{m.tasaCierre !== null ? `${m.tasaCierre.toFixed(0)}%` : '—'}</p>
        <div className={barra} aria-hidden>
          <div className="h-full bg-[var(--c-accent)]" style={{ width: `${m.tasaCierre ?? 0}%` }} />
        </div>
        <p className={nota}>{m.ganadas} ganadas · {m.perdidas} perdidas</p>
      </div>

      <div className={tarjeta}>
        <p className={etiqueta}>Seguimientos atrasados</p>
        <p className={`${valor} ${atrasados > 0 ? 'text-[var(--c-danger)]' : ''}`}>{atrasados}</p>
        <p className={nota}>{atrasados > 0 ? 'Requieren acción hoy' : 'Todo al día'}</p>
      </div>

      <div className={`${tarjeta} lg:col-span-2 xl:col-span-2`}>
        <p className={etiqueta}>Distribución por etapa</p>
        {m.porEtapa.length === 0 ? (
          <p className={nota}>Sin negocios abiertos</p>
        ) : (
          <>
            <div className={barra} role="img" aria-label="Distribución del pipeline por etapa">
              {m.porEtapa.map((e) => (
                <div key={e.id} style={{ width: `${e.pct}%`, background: e.color }} title={`${e.nombre}: ${e.pct.toFixed(0)}%`} />
              ))}
            </div>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--c-text-2)]">
              {m.porEtapa.map((e) => (
                <li key={e.id} className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: e.color }} aria-hidden />
                  {e.nombre}
                  <span className="font-mono text-[var(--c-muted)]">{e.n} · {e.pct.toFixed(0)}%</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
};
