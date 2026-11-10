import React, { useMemo, useState } from 'react';
import { KPIS_CANAL } from './canales';
import { FiltroPeriodo, KpisCanal, Rango, fechaCorta, useDatosMarketing, useMetricasCliente, ventanas } from './comun';

const select = 'px-2.5 py-1.5 text-xs bg-[var(--c-surface)] border border-[var(--c-line)] rounded text-[var(--c-text)]';

// Canales orgánicos y de analítica: cada plataforma muestra sus métricas básicas con filtro de periodo.
export const Organico: React.FC<{ plataformas: string[]; nombres?: Record<string, string> }> = ({ plataformas, nombres }) => {
  const redes = plataformas.map((id) => ({ id, nombre: nombres?.[id] ?? id }));
  const { clientes, cargando } = useDatosMarketing();
  const [clienteSel, setClienteSel] = useState('');
  const [rango, setRango] = useState<Rango>(4);

  const clienteId = clienteSel || clientes[0]?.id || '';
  const { filas, error } = useMetricasCliente(clienteId, plataformas);

  const conDatos = useMemo(() => redes.filter((r) => filas.some((f) => f.plataforma === r.id)), [filas, plataformas]);

  if (cargando) return <p className="text-sm text-[var(--c-muted)]">Cargando...</p>;
  if (clientes.length === 0) return <div className="surface p-6 text-sm text-[var(--c-muted)]">No hay clientes activos todavía.</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <select value={clienteId} onChange={(e) => setClienteSel(e.target.value)} className={select} aria-label="Cliente">
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <FiltroPeriodo valor={rango} onChange={setRango} />
      </div>

      {error && <p className="text-xs text-[var(--c-danger)] border border-[var(--c-danger)]/40 rounded p-2">{error}</p>}

      {conDatos.length === 0 ? (
        <div className="surface p-6 text-xs text-[var(--c-muted)]">
          Sin métricas de {redes.map((r) => r.nombre).join(', ')} para este cliente. Aparecerán tras la próxima sincronización o al cargar un CSV.
        </div>
      ) : (
        conDatos.map((red) => {
          const delCanal = filas.filter((f) => f.plataforma === red.id);
          const ventana = ventanas(delCanal.map((f) => f.periodo), rango);
          const rotulo = ventana.actual.length > 0 ? `${fechaCorta(ventana.actual[0])} – ${fechaCorta(ventana.actual[ventana.actual.length - 1])}` : '';
          return (
            <section key={red.id} aria-label={red.nombre} className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[var(--c-text)]">{red.nombre}</p>
                {rotulo && <span className="text-[10px] font-mono text-[var(--c-muted)]">{rotulo}</span>}
              </div>
              <KpisCanal kpis={KPIS_CANAL[red.id] ?? []} filas={delCanal} ventana={ventana} />
            </section>
          );
        })
      )}
    </div>
  );
};
