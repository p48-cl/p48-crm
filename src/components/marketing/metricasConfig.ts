import { useCallback, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import type { KpiCanal } from './canales';

// Fila de metricas_canal_config: métricas que se muestran por canal según el rubro del cliente
export interface FilaConfig {
  id: string;
  industria_id: string | null;
  plataforma: string;
  metrica: string;
  titulo: string;
  agrega: KpiCanal['agrega'];
  formato: KpiCanal['formato'];
  mejor_sube: boolean;
  orden: number;
  activo: boolean;
}

let cache: FilaConfig[] | null = null;

// Carga la configuración completa (la usan la ficha y el editor de administración)
export function useConfigMetricas() {
  const [filas, setFilas] = useState<FilaConfig[] | null>(cache);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    const { data, error: err } = await supabase
      .from('metricas_canal_config')
      .select('*')
      .order('orden', { ascending: true });
    if (err) {
      setError(err.message);
      return;
    }
    cache = (data ?? []) as FilaConfig[];
    setError(null);
    setFilas(cache);
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return { filas, error, recargar };
}

// Métricas de una plataforma para un rubro: las del rubro si existen; si no, las por defecto
export function kpisParaRubro(filas: FilaConfig[], industriaId: string | null | undefined, plataforma: string): KpiCanal[] {
  const activas = filas.filter((f) => f.activo && f.plataforma === plataforma);
  const delRubro = industriaId ? activas.filter((f) => f.industria_id === industriaId) : [];
  const elegidas = delRubro.length > 0 ? delRubro : activas.filter((f) => f.industria_id === null);
  return [...elegidas]
    .sort((a, b) => a.orden - b.orden)
    .map((f) => ({ metrica: f.metrica, titulo: f.titulo, agrega: f.agrega, formato: f.formato, mejorSube: f.mejor_sube }));
}
