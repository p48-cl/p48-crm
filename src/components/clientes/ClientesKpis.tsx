import React, { useMemo } from 'react';
import { useCRM } from '../../context/CRMContext';
import { formatCLP } from '../../lib/formatters';
import { Kpi, Dona, COLOR_SALUD, estilos } from '../dashboard/ui';
import { metricasCartera } from '../dashboard/metricas';

export const ClientesKpis: React.FC = () => {
  const { empresas, oportunidades, etapas } = useCRM();
  const c = useMemo(() => metricasCartera(empresas, oportunidades, etapas), [empresas, oportunidades, etapas]);
  const n = c.clientes.length;
  const proxima = c.renovaciones[0];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
      <Kpi
        etiqueta="MRR"
        valor={formatCLP(c.mrr)}
        nota={n > 0 ? `${n} clientes · ${formatCLP(c.mrr / n)} promedio` : 'Sin clientes activos'}
      />
      <div className={`${estilos.tarjeta} col-span-2`}>
        <p className={estilos.etiqueta}>Salud de clientes</p>
        {n === 0 ? (
          <p className={estilos.nota}>Sin clientes activos</p>
        ) : (
          <Dona
            rotulo={`Salud de ${n} clientes`}
            centro={
              <>
                <span className="text-lg font-bold font-mono text-[var(--c-text)] leading-none">{n}</span>
                <span className="text-[9px] font-mono uppercase text-[var(--c-muted)] mt-0.5">clientes</span>
              </>
            }
            segmentos={[
              { clave: 'verde', etiqueta: 'Verde', n: c.salud.verde, color: COLOR_SALUD.verde },
              { clave: 'amarillo', etiqueta: 'Amarillo', n: c.salud.amarillo, color: COLOR_SALUD.amarillo },
              { clave: 'rojo', etiqueta: 'Rojo', n: c.salud.rojo, color: COLOR_SALUD.rojo },
              { clave: 'sin', etiqueta: 'Sin evaluar', n: c.salud.sin, color: COLOR_SALUD.sin },
            ]}
          />
        )}
      </div>
      <Kpi
        etiqueta="Renovaciones ≤ 60 días"
        valor={c.renovaciones.length}
        tono={c.renovacionesVencidas > 0 ? 'peligro' : 'normal'}
        nota={
          c.renovacionesVencidas > 0
            ? `${c.renovacionesVencidas} vencida${c.renovacionesVencidas > 1 ? 's' : ''}`
            : proxima
              ? `Próxima: ${proxima.empresa.nombre} en ${proxima.dias} días`
              : 'Ninguna en el período'
        }
      />
      <Kpi
        etiqueta="Clientes por completar"
        valor={c.incompletos}
        tono={c.incompletos > 0 ? 'aviso' : 'normal'}
        nota={c.incompletos > 0 ? 'Sin responsable o sin salud' : 'Ficha completa'}
      />
    </div>
  );
};
