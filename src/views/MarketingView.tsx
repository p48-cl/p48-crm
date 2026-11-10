import React from 'react';
import { MktDashboard } from '../components/marketing/MktDashboard';
import { Ads } from '../components/marketing/Ads';
import { Importador } from '../components/marketing/Importador';
import { SEO } from '../components/marketing/SEO';
import { Organico } from '../components/marketing/Organico';
import { SincronizacionBar } from '../components/marketing/SincronizacionBar';
import { CanalPendiente } from '../components/marketing/CanalPendiente';
import { useCanales, GRUPOS_CANAL, Canal } from '../components/marketing/canales';
import type { SeccionMarketing } from '../components/layout/Sidebar';

interface MarketingViewProps {
  seccion: SeccionMarketing;
  onSeccion: (s: SeccionMarketing) => void;
}

const PUNTO: Record<Canal['estado'], string> = {
  activo: 'bg-[var(--c-ok)]',
  planificado: 'bg-[var(--c-muted-2)]',
  pausado: 'bg-[var(--c-warn)]',
};

// Marketing: sincronización de los MCP con el CRM, navegación por canal (pago / orgánico / analítica).
// La estrategia del cliente vive en su ficha.
export const MarketingView: React.FC<MarketingViewProps> = ({ seccion, onSeccion }) => {
  const canales = useCanales();
  const canal = canales.find((c) => c.plataforma === seccion);

  const boton = (id: string, label: string, estado?: Canal['estado']) => (
    <button
      key={id}
      onClick={() => onSeccion(id)}
      aria-pressed={seccion === id}
      className={`shrink-0 lg:w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs text-left min-h-[34px] ${
        seccion === id
          ? 'bg-[var(--module-soft)] text-[var(--c-text)] ring-1 ring-[var(--module)] font-semibold'
          : 'text-[var(--c-muted)] hover:text-[var(--c-text-2)] hover:bg-[var(--c-surface-2)]'
      }`}
    >
      {estado && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PUNTO[estado]}`} title={estado} />}
      <span className="truncate">{label}</span>
    </button>
  );

  const contenido = () => {
    if (seccion === 'resumen') return <MktDashboard />;
    if (seccion === 'cargar') return <Importador />;
    if (!canal) return <MktDashboard />;
    if (canal.estado !== 'activo') return <CanalPendiente canal={canal} onCargar={() => onSeccion('cargar')} />;
    if (canal.tipo === 'pago' && canal.plataforma !== 'merchant') return <Ads plataforma={canal.plataforma} />;
    if (canal.plataforma === 'gsc') return <SEO />;
    return <Organico plataformas={[canal.plataforma]} nombres={{ [canal.plataforma]: canal.nombre }} />;
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--c-text)]">Marketing</h1>
        <p className="text-xs text-[var(--c-muted)] mt-0.5">
          Datos por canal sincronizados desde los conectores (MCP). La estrategia de cada cliente está en su ficha.
        </p>
      </div>

      <SincronizacionBar />

      <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[200px_minmax(0,1fr)] gap-4 items-start">
        <nav
          aria-label="Canales de marketing"
          className="surface p-2 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible [scrollbar-width:none]"
        >
          {boton('resumen', 'Resumen de cartera')}
          {GRUPOS_CANAL.map((g) => (
            <React.Fragment key={g.tipo}>
              <p className="shrink-0 self-center lg:self-auto px-2 lg:pt-3 lg:pb-1 text-[10px] font-mono uppercase tracking-wider text-[var(--c-muted)]">
                {g.titulo}
              </p>
              {canales.filter((c) => c.tipo === g.tipo).map((c) => boton(c.plataforma, c.nombre, c.estado))}
            </React.Fragment>
          ))}
          <p className="shrink-0 self-center lg:self-auto px-2 lg:pt-3 lg:pb-1 text-[10px] font-mono uppercase tracking-wider text-[var(--c-muted)]">
            Herramientas
          </p>
          {boton('cargar', 'Cargar datos (CSV)')}
        </nav>
        <div className="min-w-0">{contenido()}</div>
      </div>
    </div>
  );
};
