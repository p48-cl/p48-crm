import React, { useState } from 'react';
import { MktDashboard } from '../components/marketing/MktDashboard';
import { ClienteHub } from '../components/marketing/ClienteHub';
import { Estrategia } from '../components/marketing/Estrategia';
import { Ads } from '../components/marketing/Ads';
import { Importador } from '../components/marketing/Importador';
import { SEO } from '../components/marketing/SEO';

// Secciones de Mkt Inteligence.
const SECCIONES = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'estrategia', label: 'Estrategia' },
  { id: 'seo', label: 'SEO' },
  { id: 'ads', label: 'Ads' },
  { id: 'cliente', label: 'Cliente' },
  { id: 'cargar', label: 'Cargar datos' },
] as const;

export const MarketingView: React.FC<{ onAbrirFicha?: (empresaId: string) => void }> = ({ onAbrirFicha }) => {
  const [seccion, setSeccion] = useState<(typeof SECCIONES)[number]['id']>('dashboard');
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--c-text)]">Mkt Inteligence</h1>
        <p className="text-xs text-[var(--c-muted)] mt-0.5">
          Datos de marketing de la cartera. Lectura semanal del conector; la app solo muestra lo guardado.
        </p>
      </div>
      <div className="flex items-center gap-1 p-1 bg-[var(--c-surface)] border border-[var(--c-line)] rounded-lg text-xs w-fit">
        {SECCIONES.map((s) => (
          <button
            key={s.id}
            onClick={() => setSeccion(s.id)}
            aria-pressed={seccion === s.id}
            className={`px-3 py-1.5 rounded-md font-medium min-h-[36px] ${
              seccion === s.id ? 'bg-[var(--c-surface-3)] text-[var(--c-text)]' : 'text-[var(--c-muted)] hover:text-[var(--c-text-2)]'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      {seccion === 'dashboard' && <MktDashboard />}
      {seccion === 'estrategia' && <Estrategia />}
      {seccion === 'seo' && <SEO />}
      {seccion === 'ads' && <Ads />}
      {seccion === 'cargar' && <Importador />}
      {seccion === 'cliente' && <ClienteHub onAbrirFicha={onAbrirFicha} />}
    </div>
  );
};
