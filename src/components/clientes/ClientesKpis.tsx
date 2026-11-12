import React, { useMemo } from 'react';
import { useCRM } from '../../context/CRMContext';
import { formatCLP } from '../../lib/formatters';
import { Kpi, Dona, COLOR_SALUD, estilos } from '../dashboard/ui';
import { metricasCartera, hoyIso } from '../dashboard/metricas';
import { resumen360 } from '../../lib/cliente360';
import { estadoEfectivo } from '../../lib/cotizaciones';
import { SALUD_ETIQUETA } from '../../lib/salud';
import { IngresosChart } from './IngresosChart';

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;
const netoCotizacion = (q: { neto_mensual: number | null; neto_unico: number | null }) =>
  Number(q.neto_mensual ?? 0) + Number(q.neto_unico ?? 0);

// Las 8 tarjetas comparten altura para que la grilla no cambie de tamaño según su contenido.
const ALTO_TARJETA = 'h-44';

export const ClientesKpis: React.FC = () => {
  const { empresas, oportunidades, etapas, facturas, cotizaciones, proyectos, tareas, reportes, actividades, contactos, agencia } = useCRM();
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
  const idsClientes = useMemo(() => new Set(c.clientes.map((e) => e.id)), [c.clientes]);

  const hoy = hoyIso();
  const mesActual = hoy.slice(0, 7);
  const agenciaId = agencia?.id;

  // Mismos criterios que IngresosChart: sin agencia, sin anuladas.
  const ingresos = useMemo(() => {
    const activas = facturas.filter((f) => f.estado_pago !== 'anulada' && f.empresa_id !== agenciaId);
    const facturadoMes = activas
      .filter((f) => f.fecha_emision.slice(0, 7) === mesActual)
      .reduce((a, f) => a + Number(f.monto_neto || 0), 0);
    const montoVencido = facturas
      .filter((f) => !f.archivado && f.estado_pago === 'pendiente' && idsClientes.has(f.empresa_id) && !!f.fecha_vencimiento && f.fecha_vencimiento.slice(0, 10) < hoy)
      .reduce((a, f) => a + Number(f.monto_total || 0), 0);
    return { facturadoMes, montoVencido };
  }, [facturas, agenciaId, mesActual, hoy, idsClientes]);

  const cot = useMemo(() => {
    const facturadas = new Set(facturas.filter((f) => f.estado_pago !== 'anulada' && f.cotizacion_id).map((f) => f.cotizacion_id as string));
    const validas = cotizaciones.filter((q) => !q.archivado && q.empresa_id !== agenciaId && q.moneda === 'CLP');
    const abiertas = validas.filter((q) => estadoEfectivo({ estado: q.estado, vence_el: q.vence_el }) === 'enviada');
    const sinFacturar = validas.filter((q) => q.estado === 'aceptada' && !facturadas.has(q.id));
    return {
      abiertas: abiertas.length,
      montoAbiertas: abiertas.reduce((a, q) => a + netoCotizacion(q), 0),
      sinFacturar: sinFacturar.length,
      montoSinFacturar: sinFacturar.reduce((a, q) => a + netoCotizacion(q), 0),
    };
  }, [cotizaciones, facturas, agenciaId]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi
          className={ALTO_TARJETA}
          acento="var(--c-accent)"
          etiqueta="MRR"
          valor={formatCLP(c.mrr)}
          nota={n > 0 ? `${n} clientes · ${formatCLP(c.mrr / n)} promedio` : 'Sin clientes activos'}
        />
        <Kpi
          className={ALTO_TARJETA}
          acento="var(--c-ok)"
          etiqueta="Facturado del mes"
          valor={formatCLP(ingresos.facturadoMes)}
          nota="Neto, sin IVA"
        />
        <Kpi
          className={ALTO_TARJETA}
          acento="var(--c-warn)"
          etiqueta="Por cobrar"
          valor={formatCLP(porCobrar)}
          tono={vencidas > 0 ? 'peligro' : 'normal'}
          nota={vencidas > 0 ? plural(vencidas, 'factura vencida', 'facturas vencidas') : 'Sin facturas vencidas'}
        />
        <Kpi
          className={ALTO_TARJETA}
          acento="var(--c-danger)"
          etiqueta="Vencido"
          valor={formatCLP(ingresos.montoVencido)}
          tono={vencidas > 0 ? 'peligro' : 'normal'}
          nota={vencidas > 0 ? plural(vencidas, 'factura', 'facturas') : 'Ninguna'}
        />
        <Kpi
          className={ALTO_TARJETA}
          acento="var(--c-muted)"
          etiqueta="Cotizaciones abiertas"
          valor={formatCLP(cot.montoAbiertas)}
          nota={plural(cot.abiertas, 'cotización enviada', 'cotizaciones enviadas')}
        />
        <Kpi
          className={ALTO_TARJETA}
          acento="var(--c-info)"
          etiqueta="Por facturar"
          valor={formatCLP(cot.montoSinFacturar)}
          tono={cot.sinFacturar > 0 ? 'aviso' : 'normal'}
          nota={plural(cot.sinFacturar, 'cotización aceptada', 'cotizaciones aceptadas')}
        />
        <Kpi
          className={ALTO_TARJETA}
          acento="var(--c-info)"
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
        <div className={`${estilos.tarjeta} ${ALTO_TARJETA} flex flex-col`} style={{ borderTop: '3px solid var(--c-ok)' }}>
          <p className={estilos.etiqueta} style={{ color: 'var(--c-ok)' }}>Salud de clientes</p>
          {n === 0 ? (
            <p className={estilos.nota}>Sin clientes activos</p>
          ) : (
            <div className="flex-1 flex items-center min-h-0">
              <Dona
                rotulo={`Salud de ${n} clientes`}
                tamano={88}
                centro={
                  <>
                    <span className="font-mono text-lg text-[var(--c-text)] leading-none">{n}</span>
                    <span className="text-[10px] text-[var(--c-muted)] mt-0.5">{n === 1 ? 'cliente' : 'clientes'}</span>
                  </>
                }
                segmentos={[
                  { clave: 'verde', etiqueta: SALUD_ETIQUETA.verde, n: c.salud.verde, color: COLOR_SALUD.verde },
                  { clave: 'amarillo', etiqueta: SALUD_ETIQUETA.amarillo, n: c.salud.amarillo, color: COLOR_SALUD.amarillo },
                  { clave: 'rojo', etiqueta: SALUD_ETIQUETA.rojo, n: c.salud.rojo, color: COLOR_SALUD.rojo },
                  { clave: 'sin', etiqueta: 'Sin evaluar', n: c.salud.sin, color: COLOR_SALUD.sin },
                ]}
              />
            </div>
          )}
        </div>
      </div>
      <IngresosChart />
    </div>
  );
};
