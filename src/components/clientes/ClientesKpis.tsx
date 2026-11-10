import React, { useMemo } from 'react';
import { useCRM } from '../../context/CRMContext';
import { formatCLP } from '../../lib/formatters';

const tarjeta = 'surface p-4 space-y-1';
const etiqueta = 'text-[11px] font-mono uppercase tracking-wider text-[var(--c-muted)]';
const valor = 'text-lg font-bold font-mono text-[var(--c-text)]';
const nota = 'text-[10px] text-[var(--c-muted)]';

const DIA = 86400000;

export const ClientesKpis: React.FC = () => {
  const { empresas, oportunidades, etapas, kpis } = useCRM();

  const m = useMemo(() => {
    const vivas = empresas.filter((e) => !e.archivado);
    const clientes = vivas.filter((e) => e.estado === 'cliente');
    const prospectos = vivas.filter((e) => e.estado === 'prospecto');
    const cerrada = new Set(etapas.filter((e) => e.es_ganada || e.es_perdida).map((e) => e.id));
    const conNegocio = new Set(
      oportunidades.filter((o) => !o.archivado && !cerrada.has(o.etapa_id)).map((o) => o.empresa_id),
    );
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const renovaciones = clientes
      .filter((e) => e.fecha_renovacion)
      .map((e) => ({ e, dias: Math.round((new Date(e.fecha_renovacion + 'T00:00:00').getTime() - hoy.getTime()) / DIA) }))
      .filter((r) => r.dias <= 60)
      .sort((a, b) => a.dias - b.dias);
    return {
      clientes: clientes.length,
      prospectos: prospectos.length,
      prospectosConNegocio: prospectos.filter((p) => conNegocio.has(p.id)).length,
      sinResponsable: clientes.filter((e) => !e.responsable_id).length,
      verde: clientes.filter((e) => e.salud === 'verde').length,
      amarillo: clientes.filter((e) => e.salud === 'amarillo').length,
      rojo: clientes.filter((e) => e.salud === 'rojo').length,
      sinSalud: clientes.filter((e) => !e.salud).length,
      renovaciones,
    };
  }, [empresas, oportunidades, etapas]);

  const vencidas = m.renovaciones.filter((r) => r.dias < 0).length;
  const prox = m.renovaciones[0];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
      <div className={tarjeta}>
        <p className={etiqueta}>Clientes activos</p>
        <p className={valor}>{m.clientes}</p>
        <p className={nota}>{m.sinResponsable > 0 ? `${m.sinResponsable} sin responsable` : 'Todos con responsable'}</p>
      </div>
      <div className={tarjeta}>
        <p className={etiqueta}>MRR clientes activos</p>
        <p className={valor}>{formatCLP(kpis.mrr_clientes_activos)}</p>
        <p className={nota}>
          {m.clientes > 0 ? `Promedio ${formatCLP(kpis.mrr_clientes_activos / m.clientes)} por cliente` : 'Sin clientes activos'}
        </p>
      </div>
      <div className={tarjeta}>
        <p className={etiqueta}>Salud de cartera</p>
        <p className={`${valor} flex items-center gap-3`}>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--c-ok)]" />{m.verde}</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--c-warn)]" />{m.amarillo}</span>
          <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[var(--c-danger)]" />{m.rojo}</span>
        </p>
        <p className={nota}>{m.sinSalud > 0 ? `${m.sinSalud} sin evaluar` : 'Todos evaluados'}</p>
      </div>
      <div className={tarjeta}>
        <p className={etiqueta}>Renovaciones ≤ 60 días</p>
        <p className={`${valor} ${vencidas > 0 ? 'text-[var(--c-danger)]' : ''}`}>{m.renovaciones.length}</p>
        <p className={nota}>
          {vencidas > 0
            ? `${vencidas} vencida${vencidas > 1 ? 's' : ''}`
            : prox
              ? `Próxima: ${prox.e.nombre} (${prox.dias} d)`
              : 'Ninguna en el período'}
        </p>
      </div>
      <div className={tarjeta}>
        <p className={etiqueta}>Prospectos</p>
        <p className={valor}>{m.prospectos}</p>
        <p className={nota}>{m.prospectosConNegocio} con negocio abierto</p>
      </div>
    </div>
  );
};
