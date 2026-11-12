import React, { useState } from 'react';
import { EstrategiaCard } from '../clientes/EstrategiaCliente';
import { CuentasCliente } from '../clientes/CuentasCliente';
import { UltimoAnalisis } from './UltimoAnalisis';
import { MetricasPorCanal } from './MetricasPorCanal';

type Seccion = 'analisis' | 'estrategia' | 'cuentas' | 'metricas';

const SECCIONES: { id: Seccion; label: string }[] = [
  { id: 'analisis', label: 'Último análisis' },
  { id: 'estrategia', label: 'Estrategia' },
  { id: 'cuentas', label: 'Cuentas y permisos' },
  { id: 'metricas', label: 'Métricas por canal' },
];

interface Props {
  empresaId: string;
  nombre: string;
  industriaId?: string | null;
  cliente: boolean;
  notas: string;
  onNotas: (valor: string) => void;
}

// Sub-navegación de Marketing dentro de la ficha. Prospectos solo ven la estrategia.
export const MarketingFicha: React.FC<Props> = ({ empresaId, nombre, industriaId, cliente, notas, onNotas }) => {
  const [seccion, setSeccion] = useState<Seccion>('analisis');

  if (!cliente) return <EstrategiaCard empresaId={empresaId} nombreCliente={nombre} />;

  return (
    <div className="space-y-5">
      <nav className="flex gap-1 overflow-x-auto border-b border-[var(--c-line)]" aria-label="Secciones de marketing">
        {SECCIONES.map((s) => {
          const activa = seccion === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSeccion(s.id)}
              aria-current={activa ? 'page' : undefined}
              className={`shrink-0 px-3 py-2 text-xs font-semibold border-b-2 -mb-px transition-colors ${
                activa ? 'border-[var(--c-accent)] text-[var(--c-text)]' : 'border-transparent text-[var(--c-muted)] hover:text-[var(--c-text)]'
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </nav>

      {seccion === 'analisis' && <UltimoAnalisis empresaId={empresaId} />}
      {seccion === 'estrategia' && <EstrategiaCard empresaId={empresaId} nombreCliente={nombre} />}
      {seccion === 'cuentas' && <CuentasCliente empresaId={empresaId} notas={notas} onNotas={onNotas} />}
      {seccion === 'metricas' && <MetricasPorCanal empresaId={empresaId} industriaId={industriaId} />}
    </div>
  );
};
