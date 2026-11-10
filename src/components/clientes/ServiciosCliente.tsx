import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatCLP } from '../../lib/formatters';

interface ServicioCliente {
  id: string;
  empresa_id: string;
  nombre: string;
  monto_clp: number;
  activo: boolean;
  inicio: string | null;
  notas: string | null;
}

interface Props {
  empresaId: string;
  // Llamar tras cualquier cambio para recalcular el MRR de la ficha
  onCambio: () => void;
  // Solo admin activa, pausa o elimina; cualquier miembro puede agregar
  puedeEditar: boolean;
}

const input =
  'bg-[var(--c-field)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)] font-mono';

export const ServiciosCliente: React.FC<Props> = ({ empresaId, onCambio, puedeEditar }) => {
  const [servicios, setServicios] = useState<ServicioCliente[]>([]);
  const [nombre, setNombre] = useState('');
  const [monto, setMonto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    if (!supabase) return;
    const { data, error: err } = await supabase
      .from('servicios_cliente')
      .select('id, empresa_id, nombre, monto_clp, activo, inicio, notas')
      .eq('empresa_id', empresaId)
      .order('creado_en', { ascending: true });
    if (err) {
      setError(err.message);
      return;
    }
    setServicios((data ?? []) as ServicioCliente[]);
  }, [empresaId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const agregar = async (e: React.FormEvent) => {
    e.preventDefault();
    const montoNum = Math.round(Number(monto));
    if (!nombre.trim() || !monto || Number.isNaN(montoNum) || montoNum === 0) {
      setError('Indica un nombre y un monto distinto de cero. Usa monto negativo para un descuento.');
      return;
    }
    if (!supabase) return;
    setGuardando(true);
    const { error: err } = await supabase.from('servicios_cliente').insert({
      empresa_id: empresaId,
      nombre: nombre.trim(),
      monto_clp: montoNum,
      activo: true,
    });
    setGuardando(false);
    if (err) {
      setError(err.message);
      return;
    }
    setNombre('');
    setMonto('');
    setError(null);
    await cargar();
    onCambio();
  };

  const toggleActivo = async (s: ServicioCliente) => {
    if (!supabase) return;
    const { error: err } = await supabase.from('servicios_cliente').update({ activo: !s.activo }).eq('id', s.id);
    if (err) {
      setError(err.message);
      return;
    }
    await cargar();
    onCambio();
  };

  const eliminar = async (s: ServicioCliente) => {
    if (!supabase) return;
    if (!window.confirm(`¿Eliminar "${s.nombre}" del MRR de este cliente?`)) return;
    const { error: err } = await supabase.from('servicios_cliente').delete().eq('id', s.id);
    if (err) {
      setError(err.message);
      return;
    }
    await cargar();
    onCambio();
  };

  const activos = servicios.filter((s) => s.activo).reduce((acc, s) => acc + s.monto_clp, 0);

  return (
    <div className="ficha-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-[var(--c-text)]">Servicios y descuentos mensuales</h3>
        <span className="text-[10px] font-mono text-[var(--c-muted)]">Se suman al fee para el MRR</span>
      </div>

      {servicios.length === 0 ? (
        <p className="text-xs text-[var(--c-muted)] py-2">Sin servicios adicionales. El MRR es solo el fee mensual.</p>
      ) : (
        <div className="space-y-2">
          {servicios.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 p-2.5 bg-[var(--c-field)] rounded-lg border border-[var(--c-line)] text-xs">
              <button
                type="button"
                onClick={() => toggleActivo(s)}
                disabled={!puedeEditar}
                className={`shrink-0 font-mono text-[10px] uppercase px-2 py-0.5 rounded-full border border-[var(--c-line)] ${s.activo ? 'text-[var(--c-ok)]' : 'text-[var(--c-muted)] line-through'}`}
              >
                {s.activo ? 'Activo' : 'Pausado'}
              </button>
              <span className="flex-1 min-w-0 truncate text-[var(--c-text)]">{s.nombre}</span>
              <span className={`font-mono ${s.monto_clp < 0 ? 'text-[var(--c-danger)]' : 'text-[var(--c-text)]'}`}>
                {s.monto_clp < 0 ? `− ${formatCLP(Math.abs(s.monto_clp))}` : formatCLP(s.monto_clp)}
              </span>
              {puedeEditar && (
                <button type="button" onClick={() => eliminar(s)} aria-label={`Eliminar ${s.nombre}`} className="text-[var(--c-muted)] hover:text-[var(--c-danger)]">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
          <div className="flex justify-end text-[11px] font-mono text-[var(--c-muted)]">
            Suma de servicios activos: {activos < 0 ? '−' : ''}{formatCLP(Math.abs(activos))}
          </div>
        </div>
      )}

      <form onSubmit={agregar} className="grid grid-cols-1 sm:grid-cols-[1fr_140px_auto] gap-2 pt-2 border-t border-[var(--c-line)]">
        <input className={`${input} font-sans`} placeholder="Ej: Campañas Meta, Descuento fidelidad" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <input className={input} type="number" placeholder="Monto CLP (− descuento)" value={monto} onChange={(e) => setMonto(e.target.value)} />
        <button
          type="submit"
          disabled={guardando}
          className="flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-semibold bg-[var(--c-accent)] text-[var(--c-on-accent)] rounded disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Agregar</span>
        </button>
      </form>
      {error && <p className="text-[11px] text-[var(--c-danger)]">{error}</p>}
    </div>
  );
};
