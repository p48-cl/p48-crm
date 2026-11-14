import { supabase, isSupabaseConfigured } from './supabase';

export type TipoNotificacion = 'cobro_vencido' | 'cobro_por_vencer' | 'cotizacion_sin_respuesta' | 'resumen_diario';

export interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  prioridad: 'alta' | 'normal';
  titulo: string;
  detalle: string | null;
  leida_en: string | null;
  created_at: string;
}

// Devuelve null si la tabla aún no existe o no hay permiso: la campanita se oculta en ese caso.
export async function cargarNotificaciones(limite = 30): Promise<Notificacion[] | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data, error } = await supabase
    .from('notificaciones')
    .select('id, tipo, prioridad, titulo, detalle, leida_en, created_at')
    .order('created_at', { ascending: false })
    .limit(limite);
  if (error) return null;
  return (data ?? []) as Notificacion[];
}

export async function marcarNotificacionesLeidas(ids: string[]): Promise<string | null> {
  if (!supabase || ids.length === 0) return null;
  const { error } = await supabase
    .from('notificaciones')
    .update({ leida_en: new Date().toISOString() })
    .in('id', ids)
    .is('leida_en', null);
  return error ? error.message : null;
}
