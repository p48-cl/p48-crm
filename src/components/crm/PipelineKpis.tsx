import React, { useMemo } from 'react';
import { useCRM } from '../../context/CRMContext';
import { formatCLP } from '../../lib/formatters';
import { Kpi } from '../dashboard/ui';
import { metricasPipeline, resultadosPeriodo } from '../dashboard/metricas';

export const PipelineKpis: React.FC<{ pipeline?: 'captacion' | 'expansion' }> = ({ pipeline }) => {
  const { oportunidades, etapas } = useCRM();
  const p = useMemo(() => metricasPipeline(oportunidades, etapas, pipeline), [oportunidades, etapas, pipeline]);
  const r = useMemo(() => resultadosPeriodo(oportunidades, etapas, null, null, pipeline), [oportunidades, etapas, pipeline]);
  const pctPonderado = p.valorCLP > 0 ? (p.ponderadoCLP / p.valorCLP) * 100 : null;

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      <Kpi
        acento="var(--c-accent)"
        etiqueta="Pipeline abierto"
        valor={formatCLP(p.valorCLP)}
        nota={`${p.abiertas.length} negocios${p.valorUSD > 0 ? ` · US$ ${p.valorUSD.toLocaleString('es-CL')} aparte` : ''}`}
      />
      <Kpi
        acento="var(--c-info)"
        etiqueta="Forecast ponderado"
        valor={formatCLP(p.ponderadoCLP)}
        nota={pctPonderado !== null ? `${pctPonderado.toFixed(0)}% del abierto` : 'Sin negocios en CLP'}
      />
      <Kpi
        acento="var(--c-ok)"
        etiqueta="Tasa de cierre"
        valor={r.tasaCierre !== null ? `${r.tasaCierre.toFixed(0)}%` : '—'}
        progreso={r.tasaCierre}
        nota={`${r.ganadas.length} ganadas · ${r.perdidas.length} perdidas`}
      />
      <Kpi
        acento="var(--c-danger)"
        etiqueta="Seguimientos atrasados"
        valor={p.atrasados}
        tono={p.atrasados > 0 ? 'peligro' : 'normal'}
        nota={p.sinAccion > 0 ? `${p.sinAccion} sin próxima acción` : p.atrasados > 0 ? 'Requieren acción hoy' : 'Todo al día'}
      />
    </div>
  );
};
