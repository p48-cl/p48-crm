import React, { useCallback, useEffect, useState } from 'react';
import { Play, Sparkles } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { formatFecha, formatFechaHora } from '../../lib/formatters';
import { ChipSenal, TonoChip } from '../common/ChipSenal';

interface Hallazgo { tipo: 'alerta' | 'oportunidad' | 'ok'; canal?: string; texto: string }
interface Analisis {
  id: string;
  periodo_desde: string;
  periodo_hasta: string;
  resumen: string;
  hallazgos: Hallazgo[];
  fuentes: string[];
  created_at: string;
}
interface Solicitud { id: string; estado: string; created_at: string; error: string | null }

const TONO: Record<Hallazgo['tipo'], TonoChip> = { alerta: 'danger', oportunidad: 'warn', ok: 'ok' };
const ETIQUETA: Record<Hallazgo['tipo'], string> = { alerta: 'Alerta', oportunidad: 'Oportunidad', ok: 'OK' };

// Último análisis de marketing del cliente (lo escribe Claude con los MCP) y solicitud de análisis manual.
// Las solicitudes pendientes se procesan en la revisión diaria o en la corrida del domingo 20:00.
export const UltimoAnalisis: React.FC<{ empresaId: string }> = ({ empresaId }) => {
  const { currentUser } = useAuth();
  const [analisis, setAnalisis] = useState<Analisis | null>(null);
  const [pendiente, setPendiente] = useState<Solicitud | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase || !empresaId) return;
    setCargando(true);
    const [a, s] = await Promise.all([
      supabase.from('analisis_cliente').select('*').eq('empresa_id', empresaId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase
        .from('analisis_solicitudes')
        .select('id,estado,created_at,error')
        .eq('empresa_id', empresaId)
        .in('estado', ['pendiente', 'procesando', 'error'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    setAnalisis((a.data as Analisis | null) ?? null);
    setPendiente((s.data as Solicitud | null) ?? null);
    setCargando(false);
  }, [empresaId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const solicitar = async () => {
    if (!supabase || !currentUser?.id) return;
    const { error } = await supabase
      .from('analisis_solicitudes')
      .insert({ solicitado_por: currentUser.id, empresa_id: empresaId, origen: 'manual' });
    setMensaje(error ? 'No se pudo registrar la solicitud.' : 'Solicitud registrada. Se procesa en la revisión diaria o el domingo 20:00.');
    if (!error) cargar();
  };

  if (cargando) return null;
  const enCola = pendiente && pendiente.estado !== 'error';

  return (
    <div className="ficha-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold text-[var(--c-text)] flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[var(--c-accent)]" /> Último análisis
        </h3>
        <button
          onClick={solicitar}
          disabled={Boolean(enCola)}
          className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded bg-[var(--c-accent)] text-[var(--c-on-accent)] disabled:opacity-50"
        >
          <Play className="w-3 h-3" /> {enCola ? 'En cola' : 'Solicitar análisis'}
        </button>
      </div>

      {enCola && (
        <p className="text-[11px] font-mono text-[var(--c-muted)]">
          Solicitud {pendiente!.estado} desde {formatFechaHora(pendiente!.created_at)}
        </p>
      )}
      {pendiente?.estado === 'error' && (
        <p className="text-[11px] text-[var(--c-danger)]">Último intento con error: {pendiente.error ?? 'sin detalle'}</p>
      )}
      {mensaje && <p className="text-[11px] text-[var(--c-text-2)]">{mensaje}</p>}

      {analisis ? (
        <>
          <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--c-muted)]">
            {formatFecha(analisis.periodo_desde)} → {formatFecha(analisis.periodo_hasta)} · {analisis.fuentes.join(', ') || 'sin fuentes'}
          </p>
          <p className="text-xs text-[var(--c-text-2)] whitespace-pre-wrap leading-relaxed break-words">{analisis.resumen}</p>
          {analisis.hallazgos.length > 0 && (
            <ul className="space-y-1.5">
              {analisis.hallazgos.map((h, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-[var(--c-text-2)]">
                  <ChipSenal tono={TONO[h.tipo] ?? 'neutro'} className="shrink-0">{ETIQUETA[h.tipo] ?? h.tipo}</ChipSenal>
                  <span className="min-w-0 break-words">{h.canal ? <b className="text-[var(--c-text)]">{h.canal}: </b> : null}{h.texto}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <p className="text-[11px] text-[var(--c-muted)]">Aún no hay análisis. Se genera el domingo 20:00 o al solicitarlo.</p>
      )}
    </div>
  );
};
