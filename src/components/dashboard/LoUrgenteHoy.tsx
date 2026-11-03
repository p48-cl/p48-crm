import React, { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

// Plataformas que el conector puede leer: solo estas generan alerta de atraso.
const PLATAFORMAS_CONECTOR = ['google_ads', 'ga4', 'gsc', 'gbp', 'merchant'] as const;
const DIAS_ATRASO = 7;

const NOMBRES: Record<string, string> = {
  google_ads: 'Google Ads',
  ga4: 'GA4',
  gsc: 'Search Console',
  gbp: 'Business Profile',
  merchant: 'Merchant Center',
};

interface CuentaAtrasada {
  id: string;
  empresa: string;
  plataforma: string;
  dias: number | null;
}

interface Props {
  seguimientosAtrasados: number;
  tareasHoy: number;
  onNavigateKanban: () => void;
  onNavigateTasks: () => void;
}

export const LoUrgenteHoy: React.FC<Props> = ({
  seguimientosAtrasados,
  tareasHoy,
  onNavigateKanban,
  onNavigateTasks,
}) => {
  const [atrasadas, setAtrasadas] = useState<CuentaAtrasada[]>([]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    let vivo = true;
    supabase
      .from('cuentas_cliente')
      .select('id, plataforma, ultima_lectura, empresas(nombre)')
      .eq('estado', 'concedido')
      .eq('archivado', false)
      .in('plataforma', [...PLATAFORMAS_CONECTOR])
      .then(({ data, error }) => {
        if (!vivo || error || !data) return;
        const ahora = Date.now();
        const lista: CuentaAtrasada[] = [];
        for (const c of data as any[]) {
          const dias = c.ultima_lectura
            ? Math.floor((ahora - new Date(c.ultima_lectura).getTime()) / 86400000)
            : null;
          if (dias === null || dias > DIAS_ATRASO) {
            const emp = Array.isArray(c.empresas) ? c.empresas[0] : c.empresas;
            lista.push({
              id: c.id,
              empresa: emp?.nombre ?? 'Cliente',
              plataforma: NOMBRES[c.plataforma] ?? c.plataforma,
              dias,
            });
          }
        }
        setAtrasadas(lista);
      });
    return () => {
      vivo = false;
    };
  }, []);

  const hayAlgo = seguimientosAtrasados > 0 || atrasadas.length > 0 || tareasHoy > 0;
  if (!hayAlgo) return null;

  return (
    <section className="surface p-4 space-y-3" aria-label="Lo urgente hoy">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-[var(--c-danger)]" />
        <h2 className="text-sm font-semibold text-[var(--c-text)]">Lo urgente hoy</h2>
      </div>
      <ul className="space-y-2 text-xs">
        {seguimientosAtrasados > 0 && (
          <li>
            <button onClick={onNavigateKanban} className="text-left text-[var(--c-text)] hover:underline">
              <span className="font-mono font-bold text-[var(--c-danger)]">{seguimientosAtrasados}</span>{' '}
              seguimientos atrasados
            </button>
          </li>
        )}
        {atrasadas.map((c) => (
          <li key={c.id} className="text-[var(--c-text-2)]">
            <span className="font-medium text-[var(--c-text)]">{c.empresa}</span> · {c.plataforma} ·{' '}
            <span className="text-[var(--c-danger)] font-mono">
              {c.dias === null ? 'sin lecturas' : `atrasada ${c.dias} días`}
            </span>
          </li>
        ))}
        {tareasHoy > 0 && (
          <li>
            <button onClick={onNavigateTasks} className="text-left text-[var(--c-text)] hover:underline">
              <span className="font-mono font-bold text-[var(--c-text)]">{tareasHoy}</span> tareas para hoy
            </button>
          </li>
        )}
      </ul>
    </section>
  );
};
