import React, { useMemo } from 'react';
import { useCRM } from '../../context/CRMContext';
import { formatCLP } from '../../lib/formatters';

const tarjeta = 'surface p-4 flex flex-col gap-2 min-w-0';
const etiqueta = 'text-[11px] font-mono uppercase tracking-wider text-[var(--c-muted)]';
const valor = 'text-lg font-bold font-mono text-[var(--c-text)] truncate';
const nota = 'text-[10px] text-[var(--c-muted)]';
const barra = 'h-1.5 w-full rounded-full bg-[var(--c-surface-3)] overflow-hidden flex';

const DIA = 86400000;

export const ClientesKpis: React.FC = () => {
  const { empresas, oportunidades, etapas, kpis } = useCRM();

  const m = useMemo(() => {
    const vivas = empresas.filter((e) => !e.archivado);
    const clientes = vivas.filter((e) => e.estado === 'cliente');
    const prospectos = vivas.filter((e) => e.estado === 'prospecto');
    const cerradaIds = new Set(etapas.filter((e) => e.es_ganada || e.es_perdida).map((e) => e.id));
    const conNegocio = new Set(
      oportunidades.filter((o) => !o.archivado && !cerradaIds.has(o.etapa_id)).map((o) => o.empresa_id),
    );
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const renovaciones = clientes
      .filter((e) => e.fecha_renovacion)
      .map((e) => ({
        e,
        dias: Math.round((new Date(e.fecha_renovacion + 'T00:00:00').getTime() - hoy.getTime()) / DIA),
      }))
      .filter((r) => r.dias <= 60)
      .sort((a, b) => a.dias - b.dias);

    const verde = clientes.filter((e) => e.salud === 'verde').length;
    const amarillo = clientes.filter((e) => e.salud === 'amarillo').length;
    const rojo = clientes.filter((e) => e.salud === 'rojo').length;
    const sinSalud = clientes.filter((e) => !e.salud).length;
    const incompletos = clientes.filter((e) => !e.responsable_id || !e.salud).length;

    return {
      clientes: clientes.length,
      verde,
      amarillo,
      rojo,
      sinSalud,
      incompletos,
      renovaciones,
      prospectos: prospectos.length,
      prospectosConNegocio: prospectos.filter((p) => conNegocio.has(p.id)).length,
    };
  }, [empresas, oportunidades, etapas]);

  const mrr = Number(kpis.mrr_clientes_activos) || 0;
  const promedio = m.clientes > 0 ? mrr / m.clientes : 0;
  const vencidas = m.renovaciones.filter((r) => r.dias < 0).length;
  const proxima = m.renovaciones[0];
  const totalSalud = m.verde + m.amarillo + m.rojo + m.sinSalud;
  const pct = (n: number) => (totalSalud > 0 ? (n / totalSalud) * 100 : 0);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
      <div className={tarjeta}>
        <p className={etiqueta}>MRR</p>
        <p className={valor}>{formatCLP(mrr)}</p>
        <p className={nota}>
          {m.clientes > 0 ? `${m.clientes} clientes · ${formatCLP(promedio)} promedio` : 'Sin clientes activos'}
        </p>
      </div>

      <div className={`${tarjeta} lg:col-span-2 xl:col-span-2`}>
        <p className={etiqueta}>Salud de clientes</p>
        {totalSalud === 0 ? (
          <p className={nota}>Sin clientes activos</p>
        ) : (
          <>
            <div className={barra} role="img" aria-label="Salud de clientes">
              <div className="h-full bg-[var(--c-ok)]" style={{ width: `${pct(m.verde)}%` }} />
              <div className="h-full bg-[var(--c-warn)]" style={{ width: `${pct(m.amarillo)}%` }} />
              <div className="h-full bg-[var(--c-danger)]" style={{ width: `${pct(m.rojo)}%` }} />
              <div className="h-full bg-[var(--c-surface-3)]" style={{ width: `${pct(m.sinSalud)}%` }} />
            </div>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--c-text-2)]">
              <li className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--c-ok)]" aria-hidden />Verde <span className="font-mono text-[var(--c-muted)]">{m.verde}</span></li>
              <li className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--c-warn)]" aria-hidden />Amarillo <span className="font-mono text-[var(--c-muted)]">{m.amarillo}</span></li>
              <li className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--c-danger)]" aria-hidden />Rojo <span className="font-mono text-[var(--c-muted)]">{m.rojo}</span></li>
              {m.sinSalud > 0 && (
                <li className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[var(--c-surface-3)]" aria-hidden />Sin evaluar <span className="font-mono text-[var(--c-muted)]">{m.sinSalud}</span></li>
              )}
            </ul>
          </>
        )}
      </div>

      <div className={tarjeta}>
        <p className={etiqueta}>Renovaciones ≤ 60 días</p>
        <p className={`${valor} ${vencidas > 0 ? 'text-[var(--c-danger)]' : ''}`}>{m.renovaciones.length}</p>
        <p className={nota}>
          {vencidas > 0
            ? `${vencidas} vencida${vencidas > 1 ? 's' : ''}`
            : proxima
              ? `Próxima: ${proxima.e.nombre} en ${proxima.dias} días`
              : 'Ninguna en el período'}
        </p>
      </div>

      <div className={tarjeta}>
        <p className={etiqueta}>Clientes por completar</p>
        <p className={`${valor} ${m.incompletos > 0 ? 'text-[var(--c-warn)]' : ''}`}>{m.incompletos}</p>
        <p className={nota}>{m.incompletos > 0 ? 'Sin responsable o sin salud' : 'Ficha completa'}</p>
      </div>

      <div className={tarjeta}>
        <p className={etiqueta}>Prospectos</p>
        <p className={valor}>{m.prospectos}</p>
        <div className={barra} aria-hidden>
          <div
            className="h-full bg-[var(--c-accent)]"
            style={{ width: `${m.prospectos > 0 ? (m.prospectosConNegocio / m.prospectos) * 100 : 0}%` }}
          />
        </div>
        <p className={nota}>{m.prospectosConNegocio} con negocio abierto</p>
      </div>
    </div>
  );
};
