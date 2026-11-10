import { fondoCerrable } from '../../lib/fondo';
import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';

interface Props {
  clientes: { id: string; nombre: string }[];
  titulo?: string;
  etiquetaBoton?: string;
  // Si se entrega, el selector permite crear un cliente nuevo desde la búsqueda.
  onCrear?: (nombre: string) => Promise<string | null>;
  onElegir: (id: string) => void;
  onCerrar: () => void;
}

// Selector reutilizable: busca, elige o crea un cliente sin salir del flujo.
export const SelectorCliente: React.FC<Props> = ({
  clientes,
  titulo = 'Elegir cliente',
  etiquetaBoton = 'Continuar',
  onCrear,
  onElegir,
  onCerrar,
}) => {
  const [q, setQ] = useState('');
  const [elegido, setElegido] = useState('');
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const termino = q.trim();
  const lista = clientes.filter((c) => c.nombre.toLowerCase().includes(termino.toLowerCase()));
  const existeExacto = clientes.some((c) => c.nombre.trim().toLowerCase() === termino.toLowerCase());

  const crear = async () => {
    if (!onCrear || !termino) return;
    setCreando(true);
    setError(null);
    const id = await onCrear(termino);
    setCreando(false);
    if (!id) {
      setError('No se pudo crear el cliente. Revisa la conexión e inténtalo de nuevo.');
      return;
    }
    onElegir(id);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60" {...fondoCerrable(onCerrar)}>
      <div
        className="bg-[var(--c-surface)] border border-[var(--c-line)] rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={titulo}
      >
        <div className="p-4 border-b border-[var(--c-line)] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--c-text)]">{titulo}</h2>
          <button onClick={onCerrar} className="p-1 text-[var(--c-muted)] hover:text-[var(--c-text)]" aria-label="Cerrar">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 flex flex-col min-h-0">
          <input
            type="text"
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar o escribir el nombre del cliente…"
            className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-3 py-1.5 text-xs text-[var(--c-text)] focus:outline-none focus:border-[var(--c-accent)]"
          />

          <div className="overflow-y-auto border border-[var(--c-line)] rounded divide-y divide-[var(--c-line)]">
            {lista.length === 0 ? (
              <p className="p-4 text-center text-xs text-[var(--c-muted)]">
                {termino ? 'No hay clientes con ese nombre.' : 'Aún no hay clientes.'}
              </p>
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

          {onCrear && termino && !existeExacto && (
            <button
              onClick={crear}
              disabled={creando}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium border border-dashed border-[var(--c-accent)] text-[var(--c-accent)] rounded hover:bg-[var(--c-surface-2)] disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              {creando ? 'Creando…' : `Crear cliente «${termino}»`}
            </button>
          )}
          {error && <p className="text-[11px] text-[var(--c-danger)]">{error}</p>}
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
            {etiquetaBoton}
          </button>
        </div>
      </div>
    </div>
  );
};
