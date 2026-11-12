import React, { useMemo } from 'react';
import { useCRM } from '../../context/CRMContext';
import { formatCLP } from '../../lib/formatters';
import { Kpi, Dona, COLOR_SALUD, estilos } from '../dashboard/ui';
import { metricasCartera } from '../dashboard/metricas';
import { resumen360 } from '../../lib/cliente360';

export const ClientesKpis: React.FC = () => {
  const { empresas, oportunidades, etapas, facturas, cotizaciones, proyectos, tareas, reportes, actividades, contactos } = useCRM();
  const c = useMemo(() => metricasCartera(empresas, oportunidades, etapas), [empresas, oportunidades, etapas]);
  const datos = useMemo(
    () => ({ oportunidades, etapas, facturas, cotizaciones, proyectos, tareas, reportes, actividades, contactos }),
    [oportunidades, etapas, facturas, cotizaciones, proyectos, tareas, reportes, actividades, contactos],
  );
  const res = useMemo(() => c.clientes.map((e) => resumen360(e, datos)), [c.clientes, datos]);

  const n = c.clientes.length;
  const proxima = c.renovaciones[0];
  const porCobrar = res.reduce((a, r) => a + r.porCobrarCLP, 0);
  const vencidas = res.reduce((a, r) => a + r.facturasVencidas, 0);
  const expansion = res.reduce((a, r) => a + r.valorExpansionCLP, 0);
  const negociosExpansion = res.reduce((a, r) => a + r.negociosExpansion, 0);
  const conCritica = res.filter((r) => r.alertas.some((a) => a.nivel === 'peligro')).length;
  const incompletos = res.filter((r) => r.faltan.length > 0).length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
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
        etiqueta="Por cobrar"
        valor={formatCLP(porCobrar)}
        tono={vencidas > 0 ? 'peligro' : 'normal'}
        nota={vencidas > 0 ? `${vencidas} factura${vencidas > 1 ? 's' : ''} vencida${vencidas > 1 ? 's' : ''}` : 'Sin facturas vencidas'}
      />
      <Kpi
        etiqueta="Expansión abierta"
        valor={formatCLP(expansion)}
        nota={`${negociosExpansion} negocio${negociosExpansion === 1 ? '' : 's'} en pipeline de expansión`}
      />
      <Kpi
        etiqueta="Clientes con alerta crítica"
        valor={conCritica}
        tono={conCritica > 0 ? 'peligro' : 'normal'}
        nota={conCritica > 0 ? 'Factura o renovación vencida' : 'Ninguna'}
      />
      <Kpi
        etiqueta="Clientes por completar"
        valor={incompletos}
        tono={incompletos > 0 ? 'aviso' : 'normal'}
        nota={incompletos > 0 ? 'Faltan RUT, responsable, salud, contacto, plan o renovación' : 'Ficha completa'}
      />
    </div>
  );
};
