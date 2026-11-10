import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Filter, Plus, Search, X } from 'lucide-react';
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
  moneda: 'CLP' | 'USD' | 'UF';
  iva_pct: number;
  neto_mensual: number;
  neto_unico: number;
}

const ESTADOS = ['borrador', 'enviada', 'aceptada', 'rechazada', 'vencida'] as const;

const ESTILO_ESTADO: Record<string, { label: string; color: string }> = {
  borrador: { label: 'Borrador', color: 'text-[var(--c-muted)]' },
  enviada: { label: 'Enviada', color: 'text-[var(--c-info)]' },
  aceptada: { label: 'Aceptada', color: 'text-[var(--c-ok)] font-medium' },
  rechazada: { label: 'Rechazada', color: 'text-[var(--c-danger)]' },
  vencida: { label: 'Vencida', color: 'text-[var(--c-warn)]' },
};

const selectClase =
  'bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-2 py-1.5 text-xs text-[var(--c-text)] focus:outline-none focus:border-[var(--c-accent)]';

export const CotizacionesView: React.FC<{ onAbrirFicha: (empresaId: string, nueva?: boolean) => void }> = ({ onAbrirFicha }) => {
  const { empresas } = useCRM();
  const [filas, setFilas] = useState<Fila[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState<string>('todos');
  const [mostrarNueva, setMostrarNueva] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setCargando(false);
      return;
    }
    supabase
      .from('v_cotizaciones')
      .select('*')
      .order('numero', { ascending: false })
      .then(({ data, error: err }) => {
        if (err) setError(parseSupabaseError(err));
        else
          setFilas(
            ((data ?? []) as Fila[]).map((f) => ({
              ...f,
              neto_mensual: Number(f.neto_mensual),
              neto_unico: Number(f.neto_unico),
              iva_pct: Number(f.iva_pct),
            }))
          );
        setCargando(false);
      });
  }, []);

  const nombres = useMemo(() => new Map(empresas.map((e) => [e.id, e.nombre])), [empresas]);
  const clientesActivos = useMemo(
    () => empresas.filter((e) => !e.archivado).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [empresas]
  );

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return filas.filter((f) => {
      if (estado !== 'todos' && f.estado !== estado) return false;
      if (!q) return true;
      return (
        String(f.numero).includes(q) ||
        f.titulo.toLowerCase().includes(q) ||
        (nombres.get(f.empresa_id) ?? '').toLowerCase().includes(q)
      );
    });
  }, [filas, busqueda, estado, nombres]);

  const pendientes = filas.filter((f) => f.estado === 'borrador' || f.estado === 'enviada').length;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      {/* Título y acción principal (mismo patrón que Clientes) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-sans text-[var(--c-text)]">Cotizaciones</h1>
          <p className="text-xs text-[var(--c-muted)] mt-0.5">
            {filas.length} cotizaciones · {pendientes} en borrador o enviadas · totales con IVA
          </p>
        </div>
        <button
          onClick={() => setMostrarNueva(true)}
          className="bg-[var(--c-accent)] hover:bg-[var(--c-accent-hover)] active:scale-[0.98] text-[var(--c-on-accent)] font-semibold text-xs py-2 px-3.5 rounded flex items-center gap-1.5 transition-all shadow-sm font-sans"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Nueva cotización</span>
        </button>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="flex flex-wrap items-center gap-3 bg-[var(--c-surface)] p-3 rounded-lg border border-[var(--c-line)]">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-[var(--c-muted)] absolute left-3 top-2.5" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por N°, título o cliente..."
            className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded pl-8 pr-3 py-1.5 text-xs text-[var(--c-text)] placeholder:text-[var(--c-muted-2)] focus:outline-none focus:border-[var(--c-accent)]"
          />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[var(--c-muted)]">
          <Filter className="w-3.5 h-3.5" />
          <select className={selectClase} value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Filtrar por estado">
            <option value="todos">Todos los estados</option>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {ESTILO_ESTADO[e].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla densa (mismo estilo que Clientes) */}
      <div className="bg-[var(--c-surface)] border border-[var(--c-line)] rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--c-surface-2)] border-b border-[var(--c-line)] text-[var(--c-muted)] uppercase font-mono text-[11px]">
              <tr>
                <th className="py-2.5 px-4 font-medium">N°</th>
                <th className="py-2.5 px-3 font-medium">Cotización</th>
                <th className="py-2.5 px-3 font-medium">Cliente</th>
                <th className="py-2.5 px-3 font-medium">Estado</th>
                <th className="py-2.5 px-3 font-medium">Emitida</th>
                <th className="py-2.5 px-3 font-medium">Vence</th>
                <th className="py-2.5 px-3 font-medium text-right">Mensual c/IVA</th>
                <th className="py-2.5 px-3 font-medium text-right">Único c/IVA</th>
                <th className="py-2.5 px-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--c-line)]">
              {cargando ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[var(--c-muted)]">Cargando…</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[var(--c-danger)]">{error}</td>
                </tr>
              ) : visibles.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[var(--c-muted)]">
                    {filas.length === 0
                      ? 'Aún no hay cotizaciones. Pulsa «Nueva cotización» para empezar.'
                      : 'No hay cotizaciones con esos filtros.'}
                  </td>
                </tr>
              ) : (
                visibles.map((c) => {
                  const f = 1 + c.iva_pct / 100;
                  const est = ESTILO_ESTADO[c.estado] ?? { label: c.estado, color: 'text-[var(--c-muted)]' };
                  return (
                    <tr
                      key={c.id}
                      onClick={() => onAbrirFicha(c.empresa_id)}
                      className="hover:bg-[var(--c-surface-2)] cursor-pointer transition-colors group"
                    >
                      <td className="py-2.5 px-4 font-mono text-[var(--c-text-2)]">{c.numero}</td>
                      <td className="py-2.5 px-3 text-[var(--c-text)] font-medium max-w-[260px] truncate">{c.titulo}</td>
                      <td className="py-2.5 px-3 text-[var(--c-text-2)]">{nombres.get(c.empresa_id) ?? '—'}</td>
                      <td className={`py-2.5 px-3 font-mono text-[11px] uppercase ${est.color}`}>{est.label}</td>
                      <td className="py-2.5 px-3 font-mono text-[var(--c-muted)]">{formatFecha(c.fecha_emision)}</td>
                      <td className="py-2.5 px-3 font-mono text-[var(--c-muted)]">{formatFecha(c.vence_el)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-[var(--c-text)]">
                        {c.neto_mensual > 0 ? formatMoneda(Math.round(c.neto_mensual * f), c.moneda === 'UF' ? 'CLP' : c.moneda) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[var(--c-text-2)]">
                        {c.neto_unico > 0 ? formatMoneda(Math.round(c.neto_unico * f), c.moneda === 'UF' ? 'CLP' : c.moneda) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <ChevronRight className="w-4 h-4 text-[var(--c-muted-2)] group-hover:text-[var(--c-text)] inline" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {mostrarNueva && (
        <SelectorCliente
          clientes={clientesActivos}
          onCerrar={() => setMostrarNueva(false)}
          onElegir={(id) => {
            setMostrarNueva(false);
            onAbrirFicha(id, true);
          }}
        />
      )}
    </div>
  );
};

// Mismo patrón que «Nuevo cliente»: un diálogo para elegir a quién cotizar.
const SelectorCliente: React.FC<{
  clientes: { id: string; nombre: string }[];
  onCerrar: () => void;
  onElegir: (id: string) => void;
}> = ({ clientes, onCerrar, onElegir }) => {
  const [q, setQ] = useState('');
  const [elegido, setElegido] = useState('');
  const lista = clientes.filter((c) => c.nombre.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60" onClick={onCerrar}>
      <div
        className="bg-[var(--c-surface)] border border-[var(--c-line)] rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Elegir cliente para la cotización"
      >
        <div className="p-4 border-b border-[var(--c-line)] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--c-text)]">Nueva cotización · elige el cliente</h2>
          <button onClick={onCerrar} className="p-1 text-[var(--c-muted)] hover:text-[var(--c-text)]" aria-label="Cerrar">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3 overflow-hidden flex flex-col">
          <input
            type="text"
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar cliente…"
            className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-3 py-1.5 text-xs text-[var(--c-text)] focus:outline-none focus:border-[var(--c-accent)]"
          />
          <div className="overflow-y-auto border border-[var(--c-line)] rounded divide-y divide-[var(--c-line)]">
            {lista.length === 0 ? (
              <p className="p-4 text-center text-xs text-[var(--c-muted)]">No hay clientes con ese nombre.</p>
            ) : (
              lista.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setElegido(c.id)}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                    elegido === c.id
                      ? 'bg-[var(--c-surface-3)] text-[var(--c-accent)] font-medium'
                      : 'text-[var(--c-text-2)] hover:bg-[var(--c-surface-2)]'
                  }`}
                >
                  {c.nombre}
                </button>
              ))
            )}
          </div>
        </div>
        <div className="p-4 border-t border-[var(--c-line)] flex justify-end gap-2">
          <button onClick={onCerrar} className="px-3 py-1.5 text-xs text-[var(--c-muted)] hover:text-[var(--c-text)]">
            Cancelar
          </button>
          <button
            disabled={!elegido}
            onClick={() => onElegir(elegido)}
            className="px-3.5 py-1.5 text-xs font-semibold bg-[var(--c-accent)] text-[var(--c-on-accent)] rounded disabled:opacity-40"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
};
