import React, { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { parseSupabaseError } from '../lib/errorHandler';
import { formatFecha, formatMoneda } from '../lib/formatters';
import { useCRM } from '../context/CRMContext';

interface Fila {
  id: string;
  numero: number;
  empresa_id: string;
  titulo: string;
  estado: string;
  fecha_emision: string;
  vence_el: string;
  moneda: 'CLP' | 'USD';
  iva_pct: number;
  neto_mensual: number;
  neto_unico: number;
}

const ESTADOS = ['todas', 'borrador', 'enviada', 'aceptada', 'rechazada', 'vencida'] as const;
const campo = 'bg-[var(--c-surface)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)]';

export const CotizacionesView: React.FC<{ onAbrirFicha: (empresaId: string) => void }> = ({ onAbrirFicha }) => {
  const { empresas } = useCRM();
  const [filas, setFilas] = useState<Fila[]>([]);
  const [estado, setEstado] = useState<(typeof ESTADOS)[number]>('todas');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [nuevaEmpresa, setNuevaEmpresa] = useState('');

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) { setCargando(false); return; }
    supabase.from('v_cotizaciones').select('*').order('numero', { ascending: false }).then(({ data, error: err }) => {
      if (err) setError(parseSupabaseError(err));
      else setFilas(((data ?? []) as Fila[]).map((f) => ({ ...f, neto_mensual: Number(f.neto_mensual), neto_unico: Number(f.neto_unico), iva_pct: Number(f.iva_pct) })));
      setCargando(false);
    });
  }, []);

  const nombre = useMemo(() => new Map(empresas.map((e) => [e.id, e.nombre])), [empresas]);
  const visibles = filas.filter((f) => estado === 'todas' || f.estado === estado);
  const activas = empresas.filter((e) => !e.archivado).sort((a, b) => a.nombre.localeCompare(b.nombre));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--c-text)]">Cotizaciones</h1>
          <p className="text-xs text-[var(--c-muted)]">Todas las cotizaciones por cuenta. Totales con IVA.</p>
        </div>
        <div className="flex gap-2">
          <select className={campo} value={nuevaEmpresa} onChange={(e) => setNuevaEmpresa(e.target.value)} aria-label="Cuenta para nueva cotización">
            <option value="">Elegir cuenta…</option>
            {activas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
          <button
            disabled={!nuevaEmpresa}
            onClick={() => onAbrirFicha(nuevaEmpresa)}
            className="text-xs font-medium bg-[var(--c-accent)] text-[var(--c-on-accent)] px-3 py-1.5 rounded flex items-center gap-1 disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5" /> Nueva
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {ESTADOS.map((e) => (
          <button key={e} onClick={() => setEstado(e)} className={`px-2.5 py-1 rounded text-[11px] font-mono uppercase border ${estado === e ? 'border-[var(--c-accent)] text-[var(--c-accent)]' : 'border-[var(--c-line)] text-[var(--c-muted)]'}`}>{e}</button>
        ))}
      </div>

      {error && <p className="text-xs text-[var(--c-danger)]">{error}</p>}
      {cargando ? (
        <p className="text-xs text-[var(--c-muted)]">Cargando…</p>
      ) : visibles.length === 0 ? (
        <p className="text-xs text-[var(--c-muted)] py-8 text-center">No hay cotizaciones{estado !== 'todas' ? ` en estado ${estado}` : ''}. Elige una cuenta y pulsa Nueva.</p>
      ) : (
        <div className="divide-y divide-[var(--c-line)] border border-[var(--c-line)] rounded-lg">
          {visibles.map((c) => {
            const f = 1 + c.iva_pct / 100;
            return (
              <button key={c.id} onClick={() => onAbrirFicha(c.empresa_id)} className="w-full text-left p-3 hover:bg-[var(--c-surface-2)] flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <p className="font-medium text-[var(--c-text)] truncate">N° {c.numero} · {c.titulo}</p>
                  <p className="text-[11px] text-[var(--c-muted)]">{nombre.get(c.empresa_id) ?? 'Cuenta'} · emitida {formatFecha(c.fecha_emision)} · vence {formatFecha(c.vence_el)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono text-[var(--c-text)]">{formatMoneda(Math.round(c.neto_mensual * f), c.moneda)} /mes</p>
                  {c.neto_unico > 0 && <p className="font-mono text-[11px] text-[var(--c-muted)]">+ {formatMoneda(Math.round(c.neto_unico * f), c.moneda)} único</p>}
                  <p className="text-[10px] font-mono uppercase text-[var(--c-muted)]">{c.estado}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
