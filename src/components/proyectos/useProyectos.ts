import { useCallback, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import type { Proyecto, ProyectoFase, ProyectoMiembro, TareaDependencia } from '../../types/crm';

// Proyectos, fases, miembros y dependencias que el usuario puede ver (el filtro lo hace la base de datos).
export function useProyectos() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [fases, setFases] = useState<ProyectoFase[]>([]);
  const [miembrosProyecto, setMiembrosProyecto] = useState<ProyectoMiembro[]>([]);
  const [dependencias, setDependencias] = useState<TareaDependencia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setCargando(false);
      return;
    }
    const [p, f, m, d] = await Promise.all([
      supabase.from('proyectos').select('*').eq('archivado', false).order('created_at', { ascending: false }),
      supabase.from('proyecto_fases').select('*').order('orden', { ascending: true }),
      supabase.from('proyecto_miembros').select('*'),
      supabase.from('tarea_dependencias').select('*'),
    ]);
    const fallo = p.error ?? f.error ?? m.error ?? d.error;
    setError(fallo ? fallo.message : null);
    setProyectos((p.data as Proyecto[]) ?? []);
    setFases((f.data as ProyectoFase[]) ?? []);
    setMiembrosProyecto((m.data as ProyectoMiembro[]) ?? []);
    setDependencias((d.data as TareaDependencia[]) ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return { proyectos, fases, miembrosProyecto, dependencias, cargando, error, recargar };
}
