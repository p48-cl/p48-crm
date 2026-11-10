import React, { useMemo } from 'react';
import { useCRM } from '../../context/CRMContext';
import { formatCLP } from '../../lib/formatters';
import { Kpi, BarraApilada, estilos } from '../dashboard/ui';
import { metricasPipeline, resultadosPeriodo } from '../dashboard/metricas';

export const PipelineKpis: React.FC = () => {
  const { oportunidades, etapas } = useCRM();
  const p = useMemo(() => metricasPipeline(oportunidades, etapas), [oportunidades, etapas]);
  const r = useMemo(() => resultadosPeriodo(oportunidades, etapas, null), [oportunidades, etapas]);
  const pctPonderado = p.valorCLP > 0 ? (p.ponderadoCLP / p.valorCLP) * 100 : null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      <Kpi
        etiqueta="Pipeline abierto"
        valor={formatCLP(p.valorCLP)}
        nota={`${p.abiertas.length} negocios${p.valorUSD > 0 ? ` · US$ ${p.valorUSD.toLocaleString('es-CL')} aparte` : ''}`}
      />
      <Kpi
        etiqueta="Forecast ponderado"
        valor={formatCLP(p.ponderadoCLP)}
        nota={pctPonderado !== null ? `${pctPonderado.toFixed(0)}% del abierto` : 'Sin negocios en CLP'}
      />
      <Kpi
        etiqueta="Tasa de cierre"
        valor={r.tasaCierre !== null ? `${r.tasaCierre.toFixed(0)}%` : '—'}
        progreso={r.tasaCierre}
        nota={`${r.ganadas.length} ganadas · ${r.perdidas.length} perdidas`}
      />
      <Kpi
        etiqueta="Seguimientos atrasados"
        valor={p.atrasados}
        tono={p.atrasados > 0 ? 'peligro' : 'normal'}
        nota={p.sinAccion > 0 ? `${p.sinAccion} sin próxima acción` : p.atrasados > 0 ? 'Requieren acción hoy' : 'Todo al día'}
      />
      <div className={`${estilos.tarjeta} col-span-2`}>
        <p className={estilos.etiqueta}>Distribución por etapa</p>
        {p.abiertas.length === 0 ? (
          <p className={estilos.nota}>Sin negocios abiertos</p>
        ) : (
          <BarraApilada
            rotulo="Distribución del pipeline por etapa"
            segmentos={p.porEtapa.map((e) => ({ clave: e.id, etiqueta: e.nombre, n: e.n, color: e.color }))}
          />
        )}
      </div>
    </div>
  );
};
