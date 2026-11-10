import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { formatCLP, formatFechaHora } from '../../lib/formatters';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMContext';

interface CambioAuditoria {
  id: number;
  antes: Record<string, unknown> | null;
  despues: Record<string, unknown> | null;
  usuario_id: string | null;
  created_at: string;
}

interface Props {
  empresaId: string;
}

// Historial de cambios de fee y plan. Lo lee solo un admin (la auditoría es de admin).
export const HistorialFee: React.FC<Props> = ({ empresaId }) => {
  const { isAdmin } = useAuth();
  const { miembros } = useCRM();
  const [cambios, setCambios] = useState<CambioAuditoria[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin || !supabase) return;
    let vigente = true;
    (async () => {
      const { data, error: err } = await supabase
        .from('audit_log')
        .select('id, antes, despues, usuario_id, created_at')
        .eq('tabla', 'empresas')
        .eq('registro_id', empresaId)
        .eq('accion', 'update')
        .order('created_at', { ascending: false })
        .limit(100);
      if (!vigente) return;
      if (err) {
        setError(err.message);
        return;
      }
      // Solo cambios reales de fee o plan (ignora actualizaciones sin efecto)
      const reales = ((data ?? []) as CambioAuditoria[]).filter(
        (c) => c.antes?.fee_mensual_clp !== c.despues?.fee_mensual_clp || c.antes?.plan !== c.despues?.plan,
      );
      setCambios(reales.slice(0, 15));
    })();
    return () => {
      vigente = false;
    };
  }, [empresaId, isAdmin]);

  if (!isAdmin) return null;

  return (
    <div className="ficha-card p-4 space-y-3">
      <h3 className="text-xs font-semibold text-[var(--c-text)]">Historial de fee y plan</h3>
      {error && <p className="text-[11px] text-[var(--c-danger)]">{error}</p>}
      {!error && cambios.length === 0 && (
        <p className="text-xs text-[var(--c-muted)] py-2">Sin cambios de fee o plan registrados.</p>
      )}
      <div className="space-y-2">
        {cambios.map((c) => {
          const autor = miembros.find((m) => m.user_id && m.user_id === c.usuario_id);
          const feeAntes = Number(c.antes?.fee_mensual_clp ?? 0);
          const feeDespues = Number(c.despues?.fee_mensual_clp ?? 0);
          const planAntes = (c.antes?.plan as string | null) ?? 'sin plan';
          const planDespues = (c.despues?.plan as string | null) ?? 'sin plan';
          return (
            <div key={c.id} className="p-2.5 bg-[var(--c-field)] rounded-lg border border-[var(--c-line)] text-xs space-y-1">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[var(--c-text)]">
                  {feeAntes !== feeDespues && (
                    <>
                      Fee {formatCLP(feeAntes)} → {formatCLP(feeDespues)}
                    </>
                  )}
                  {feeAntes !== feeDespues && planAntes !== planDespues && ' · '}
                  {planAntes !== planDespues && (
                    <>
                      Plan {planAntes} → {planDespues}
                    </>
                  )}
                </span>
                <span className="font-mono text-[10px] text-[var(--c-muted)] shrink-0">{formatFechaHora(c.created_at)}</span>
              </div>
              <p className="text-[10px] font-mono text-[var(--c-muted)]">{autor?.nombre ?? 'Sistema'}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
