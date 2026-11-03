import React, { useMemo } from 'react';
import { useCRM } from '../../context/CRMContext';
import { formatCLP } from '../../lib/formatters';

const tarjeta = 'surface p-4 space-y-1';
const etiqueta = 'text-[11px] font-mono uppercase tracking-wider text-[var(--c-muted)]';
const valor = 'text-lg font-bold font-mono text-[var(--c-text)]';

export const PipelineKpis: React.FC = () => {
  const { oportunidades, etapas, kpis } = useCRM();

  const m = useMemo(() => {
    const ganada = new Set(etapas.filter((e) => e.es_ganada).map((e) => e.id));
    const perdida = new Set(etapas.filter((e) => e.es_perdida).map((e) => e.id));
    const vivas = oportunidades.filter((o) => !o.archivado && !ganada.has(o.etapa_id) && !perdida.has(o.etapa_id));
    const ganadas = oportunidades.filter((o) => !o.archivado && ganada.has(o.etapa_id)).length;
    const perdidas = oportunidades.filter((o) => !o.archivado && perdida.has(o.etapa_id)).length;
    const cerradas = ganadas + perdidas;
    return {
      valorAbierto: vivas.reduce((a, o) => a + (Number(o.valor_neto) || 0), 0),
      abiertas: vivas.length,
      tasaCierre: cerradas > 0 ? (ganadas / cerradas) * 100 : null,
      cerradas,
    };
  }, [oportunidades, etapas]);

  const hoy = new Date();
  const trimestre = Math.floor(hoy.getMonth() / 3) + 1;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <div className={tarjeta}>
        <p className={etiqueta}>Valor del pipeline</p>
        <p className={valor}>{formatCLP(m.valorAbierto)}</p>
        <p className="text-[10px] text-[var(--c-muted)]">{m.abiertas} oportunidades abiertas</p>
      </div>
      <div className={tarjeta}>
        <p className={etiqueta}>Forecast ponderado</p>
        <p className={valor}>{formatCLP(kpis.pipeline_ponderado_total)}</p>
        <p className="text-[10px] text-[var(--c-muted)]">Q{trimestre} {hoy.getFullYear()} · probabilidad por etapa</p>
      </div>
      <div className={tarjeta}>
        <p className={etiqueta}>Tasa de cierre</p>
        <p className={valor}>{m.tasaCierre !== null ? `${m.tasaCierre.toFixed(0)}%` : '—'}</p>
        <p className="text-[10px] text-[var(--c-muted)]">
          {m.cerradas > 0 ? `Sobre ${m.cerradas} oportunidades cerradas` : 'Sin oportunidades cerradas aún'}
        </p>
      </div>
      <div className={tarjeta}>
        <p className={etiqueta}>MRR clientes activos</p>
        <p className={valor}>{formatCLP(kpis.mrr_clientes_activos)}</p>
        <p className="text-[10px] text-[var(--c-muted)]">Calculado desde fee de clientes</p>
      </div>
      <div className={tarjeta}>
        <p className={etiqueta}>Seguimientos atrasados</p>
        <p className={`${valor} ${kpis.seguimientos_atrasados_count > 0 ? 'text-[var(--c-danger)]' : ''}`}>
          {kpis.seguimientos_atrasados_count}
        </p>
        <p className="text-[10px] text-[var(--c-muted)]">{kpis.seguimientos_atrasados_count > 0 ? 'Requieren atención' : 'Todo al día'}</p>
      </div>
    </div>
  );
};
