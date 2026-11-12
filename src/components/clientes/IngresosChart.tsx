import React, { useMemo, useState } from 'react';
import { useCRM } from '../../context/CRMContext';
import { formatCLP } from '../../lib/formatters';
import { estilos } from '../dashboard/ui';
import { useConfiguracionCRM } from '../../lib/configuracion';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// Ventas mensuales en CLP: facturado (base) y, encima, cotizaciones aceptadas que aún no tienen factura.
// Una cotización facturada cuenta solo en su factura, así no se suma dos veces.
export const IngresosChart: React.FC = () => {
  const { facturas, cotizaciones, agencia } = useCRM();
  const { config } = useConfiguracionCRM();
  const ivaPct = Number(config.iva_pct ?? 19);
  const [conIva, setConIva] = useState(false);
  const [rango, setRango] = useState<6 | 12>(12);

  const datos = useMemo(() => {
    const hoy = new Date();
    const meses = Array.from({ length: rango }, (_, i) => {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - (rango - 1 - i), 1);
      return { clave: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, etiqueta: MESES[d.getMonth()], facturado: 0, pendiente: 0 };
    });
    const idx = new Map(meses.map((m, i) => [m.clave, i]));
    const cotizacionesFacturadas = new Set<string>();
    for (const f of facturas) {
      if (f.estado_pago === 'anulada' || f.empresa_id === agencia?.id) continue;
      if (f.cotizacion_id) cotizacionesFacturadas.add(f.cotizacion_id);
      const i = idx.get(f.fecha_emision.slice(0, 7));
      if (i !== undefined) meses[i].facturado += Number(conIva ? f.monto_total : f.monto_neto);
    }
    for (const c of cotizaciones) {
      if (c.archivado || c.empresa_id === agencia?.id || c.estado !== 'aceptada' || c.moneda !== 'CLP') continue;
      if (cotizacionesFacturadas.has(c.id)) continue;
      const i = idx.get(c.fecha_emision.slice(0, 7));
      if (i === undefined) continue;
      const neto = Number(c.neto_mensual ?? 0) + Number(c.neto_unico ?? 0);
      meses[i].pendiente += conIva ? neto * (1 + ivaPct / 100) : neto;
    }
    const maximo = Math.max(1, ...meses.map((m) => m.facturado + m.pendiente));
    return {
      meses,
      maximo,
      totalFact: meses.reduce((a, m) => a + m.facturado, 0),
      totalPend: meses.reduce((a, m) => a + m.pendiente, 0),
    };
  }, [facturas, cotizaciones, agencia, conIva, rango, ivaPct]);

  const W = 720, H = 190, base = 165, alto = 140;
  const paso = W / datos.meses.length;
  const ancho = Math.min(28, paso * 0.5);

  return (
    <div className={estilos.tarjeta} style={{ borderTop: '3px solid var(--c-accent)' }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={estilos.etiqueta} style={{ color: 'var(--c-accent)' }}>Ventas por mes · CLP {conIva ? 'con IVA' : 'sin IVA'}</p>
        <div className="flex items-center gap-3 text-[11px] font-mono text-[var(--c-muted)]">
          <button type="button" onClick={() => setConIva((v) => !v)} className="hover:text-[var(--c-text)]">{conIva ? 'Ver sin IVA' : 'Ver con IVA'}</button>
          <button type="button" onClick={() => setRango((r) => (r === 12 ? 6 : 12))} className="hover:text-[var(--c-text)]">{rango === 12 ? 'Últimos 6 meses' : 'Últimos 12 meses'}</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-4 mt-1 text-[11px] text-[var(--c-muted)]">
        <span><span className="inline-block w-2 h-2 rounded-sm mr-1" style={{ background: 'var(--c-ok)' }} />Facturado {formatCLP(datos.totalFact)}</span>
        <span><span className="inline-block w-2 h-2 rounded-sm mr-1" style={{ background: 'var(--c-info)' }} />Aceptadas sin factura {formatCLP(datos.totalPend)}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full mt-2" role="img" aria-label="Ventas mensuales: facturado y cotizaciones aceptadas sin factura">
        {[0, 0.5, 1].map((p) => (
          <g key={p}>
            <line x1="0" x2={W} y1={base - alto * p} y2={base - alto * p} stroke="var(--c-line)" strokeWidth="1" />
            <text x="2" y={base - alto * p - 3} fontSize="9" fontFamily="monospace" fill="var(--c-muted)">{p > 0 ? formatCLP(datos.maximo * p) : ''}</text>
          </g>
        ))}
        {datos.meses.map((m, i) => {
          const cx = paso * i + paso / 2;
          const hF = (m.facturado / datos.maximo) * alto;
          const hP = (m.pendiente / datos.maximo) * alto;
          return (
            <g key={m.clave}>
              <title>{`${m.etiqueta} · Facturado ${formatCLP(m.facturado)} · Aceptadas sin factura ${formatCLP(m.pendiente)}`}</title>
              <rect x={cx - ancho / 2} y={base - hF} width={ancho} height={hF} fill="var(--c-ok)" />
              <rect x={cx - ancho / 2} y={base - hF - hP} width={ancho} height={hP} rx="2" fill="var(--c-info)" />
              <text x={cx} y={base + 14} textAnchor="middle" fontSize="10" fontFamily="monospace" fill="var(--c-muted)">{m.etiqueta}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
