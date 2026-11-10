import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { formatFechaHora } from '../../lib/formatters';
import { mensajeEnCola, proximaCorrida } from './proximaCorrida';

interface Solicitud { estado: string; created_at: string; procesado_en: string | null; error: string | null }

// Estado de sincronización con los MCP y botón «Actualizar» (deja una solicitud en cola;
// la procesa Claude con el MCP en la revisión horaria o en la corrida del domingo 20:00).
export const SincronizacionBar: React.FC = () => {
  const { currentUser } = useAuth();
  const [ultima, setUltima] = useState<Solicitud | null>(null);
  const [enCola, setEnCola] = useState(0);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    const [u, c] = await Promise.all([
      supabase.from('analisis_solicitudes').select('estado,created_at,procesado_en,error').in('estado', ['listo', 'error']).order('procesado_en', { ascending: false, nullsFirst: false }).limit(1).maybeSingle(),
      supabase.from('analisis_solicitudes').select('id', { count: 'exact', head: true }).in('estado', ['pendiente', 'procesando']),
    ]);
    setUltima((u.data as Solicitud | null) ?? null);
    setEnCola(c.count ?? 0);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const actualizar = async () => {
    if (!supabase || !currentUser?.id) return;
    const { error } = await supabase.from('analisis_solicitudes').insert({ solicitado_por: currentUser.id, origen: 'manual' });
    setMensaje(error ? 'No se pudo registrar la solicitud.' : mensajeEnCola());
    if (!error) cargar();
  };

  return (
    <div className="surface p-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--c-muted)]">Última sincronización</p>
        <p className={`font-mono ${ultima?.estado === 'error' ? 'text-[var(--c-danger)]' : 'text-[var(--c-text)]'}`}>
          {ultima ? `${formatFechaHora(ultima.procesado_en ?? ultima.created_at)}${ultima.estado === 'error' ? ` · error: ${ultima.error ?? 'sin detalle'}` : ''}` : 'Aún no hay sincronizaciones'}
        </p>
      </div>
      <p className="text-[11px] text-[var(--c-muted)]">Próxima corrida: {proximaCorrida()}</p>
      <button
        onClick={actualizar}
        disabled={enCola > 0}
        className="flex items-center gap-1.5 px-3 py-1.5 font-semibold rounded bg-[var(--c-accent)] text-[var(--c-on-accent)] disabled:opacity-50"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${enCola > 0 ? 'animate-spin' : ''}`} />
        {enCola > 0 ? 'En cola' : 'Actualizar'}
      </button>
      {mensaje && <p className="basis-full text-[11px] text-[var(--c-text-2)]">{mensaje}</p>}
    </div>
  );
};
