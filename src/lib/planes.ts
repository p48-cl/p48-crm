import { useCallback, useEffect, useState } from 'react';
import { PlanEmpresa } from '../types/crm';
import { supabase } from './supabase';
import { useConfiguracionCRM } from './configuracion';

export interface Plan { nombre: string; valor: number; activo: boolean; orden: number }

// Valores de respaldo (modelo financiero v2.6). Los vigentes se editan en Administración > Comercial.
export const PLANES_DEFECTO: Record<PlanEmpresa, Plan> = {
  A: { nombre: 'Estrategia + Admin ADS', valor: 550000, activo: true, orden: 1 },
  B: { nombre: 'Plan A + Creativos', valor: 1550000, activo: true, orden: 2 },
  C: { nombre: 'Plan B + Contenido orgánico', valor: 2250000, activo: true, orden: 3 },
  D: { nombre: 'Full Stack', valor: 3050000, activo: true, orden: 4 },
  E: { nombre: 'Branding (lump sum)', valor: 2500000, activo: true, orden: 5 },
  personalizado: { nombre: 'Personalizado (precio a medida)', valor: 0, activo: true, orden: 6 },
};

export const SETUP_LISTA = 650000;

const EVENTO_PLANES = 'planes-servicio-cambio';
let cachePlanes: Record<PlanEmpresa, Plan> | null = null;

export async function cargarPlanes(): Promise<Record<PlanEmpresa, Plan>> {
  if (!supabase) return PLANES_DEFECTO;
  const { data, error } = await supabase.from('planes_servicio').select('codigo,nombre,valor_neto_clp,activo,orden');
  if (error || !data || data.length === 0) return PLANES_DEFECTO;
  const mapa = { ...PLANES_DEFECTO };
  for (const f of data as { codigo: PlanEmpresa; nombre: string; valor_neto_clp: number; activo: boolean; orden: number }[]) {
    mapa[f.codigo] = { nombre: f.nombre, valor: Number(f.valor_neto_clp), activo: f.activo, orden: f.orden };
  }
  cachePlanes = mapa;
  return mapa;
}

export async function guardarPlan(codigo: PlanEmpresa, cambios: Partial<Plan>): Promise<string | null> {
  if (!supabase) return 'Supabase no está configurado';
  const fila: Record<string, unknown> = { actualizado_en: new Date().toISOString() };
  if (cambios.nombre !== undefined) fila.nombre = cambios.nombre;
  if (cambios.valor !== undefined) fila.valor_neto_clp = cambios.valor;
  if (cambios.activo !== undefined) fila.activo = cambios.activo;
  if (cambios.orden !== undefined) fila.orden = cambios.orden;
  const { error } = await supabase.from('planes_servicio').update(fila).eq('codigo', codigo);
  if (error) return error.message;
  window.dispatchEvent(new Event(EVENTO_PLANES));
  return null;
}

// Planes vigentes + setup de lista. `codigos` trae solo los activos, ordenados.
export function usePlanes() {
  const [PLANES, setPlanes] = useState<Record<PlanEmpresa, Plan>>(cachePlanes ?? PLANES_DEFECTO);
  const { config } = useConfiguracionCRM();
  const recargar = useCallback(async () => setPlanes(await cargarPlanes()), []);
  useEffect(() => {
    if (!cachePlanes) recargar();
    window.addEventListener(EVENTO_PLANES, recargar);
    return () => window.removeEventListener(EVENTO_PLANES, recargar);
  }, [recargar]);
  const codigos = (Object.keys(PLANES) as PlanEmpresa[]).filter((c) => PLANES[c].activo).sort((a, b) => PLANES[a].orden - PLANES[b].orden);
  return { PLANES, codigos, SETUP_LISTA: config.setup_lista_clp, recargar };
}
