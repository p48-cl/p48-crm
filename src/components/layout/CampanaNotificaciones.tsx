import React, { useCallback, useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import {
  cargarNotificaciones,
  marcarNotificacionesLeidas,
  type Notificacion,
} from '../../lib/notificaciones';

const INTERVALO_MS = 120000;

const FECHA = new Intl.DateTimeFormat('es-CL', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Santiago',
});

export const CampanaNotificaciones: React.FC = () => {
  const [items, setItems] = useState<Notificacion[] | null>(null);
  const [abierta, setAbierta] = useState(false);

  const recargar = useCallback(async () => {
    setItems(await cargarNotificaciones());
  }, []);

  useEffect(() => {
    recargar();
    const id = window.setInterval(recargar, INTERVALO_MS);
    return () => window.clearInterval(id);
  }, [recargar]);

  // Si la migración aún no está aplicada, no se muestra nada.
  if (items === null) return null;

  const noLeidas = items.filter((n) => !n.leida_en);

  const alternar = () => {
    const abrir = !abierta;
    setAbierta(abrir);
    if (abrir) recargar();
  };

  const marcarTodas = async () => {
    const ids = noLeidas.map((n) => n.id);
    if (ids.length === 0) return;
    const error = await marcarNotificacionesLeidas(ids);
    if (!error) {
      const ahora = new Date().toISOString();
      setItems(items.map((n) => (n.leida_en ? n : { ...n, leida_en: ahora })));
    }
  };

  const marcarUna = async (n: Notificacion) => {
    if (n.leida_en) return;
    const error = await marcarNotificacionesLeidas([n.id]);
    if (!error) {
      setItems((prev) => prev?.map((x) => (x.id === n.id ? { ...x, leida_en: new Date().toISOString() } : x)) ?? prev);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={alternar}
        aria-label={noLeidas.length > 0 ? `Notificaciones, ${noLeidas.length} sin leer` : 'Notificaciones'}
        className="relative p-1.5 text-[var(--c-muted)] hover:text-[var(--c-text)] transition-colors rounded hover:bg-[var(--c-surface-2)]"
      >
        <Bell className="w-4 h-4" />
        {noLeidas.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[var(--c-accent)] text-[var(--c-on-accent)] text-[10px] font-mono font-bold flex items-center justify-center">
            {noLeidas.length > 9 ? '9+' : noLeidas.length}
          </span>
        )}
      </button>

      {abierta && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAbierta(false)} aria-hidden="true" />
          <div className="absolute right-0 mt-1 w-80 max-h-[70vh] overflow-y-auto bg-[var(--c-surface)] border border-[var(--c-line)] rounded shadow-xl z-50 text-xs">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--c-line)]">
              <span className="font-semibold text-[var(--c-text)]">Notificaciones</span>
              {noLeidas.length > 0 && (
                <button type="button" onClick={marcarTodas} className="text-[11px] text-[var(--c-muted)] hover:text-[var(--c-text)]">
                  Marcar todas como leídas
                </button>
              )}
            </div>
            {items.length === 0 ? (
              <p className="px-3 py-6 text-center text-[var(--c-muted)]">Sin notificaciones.</p>
            ) : (
              <ul>
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => marcarUna(n)}
                      className={`w-full text-left px-3 py-2 border-b border-[var(--c-line)] hover:bg-[var(--c-surface-2)] ${
                        n.leida_en ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.leida_en && <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[var(--c-accent)] shrink-0" />}
                        <div className="min-w-0">
                          <p className="font-medium text-[var(--c-text)] truncate">{n.titulo}</p>
                          {n.detalle && (
                            <p className="text-[var(--c-text-2)] whitespace-pre-line mt-0.5">{n.detalle}</p>
                          )}
                          <p className="font-mono text-[10px] text-[var(--c-muted)] mt-1">
                            {FECHA.format(new Date(n.created_at))}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
};
