import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';

// Configuración del sistema (fila única en configuracion_crm). Editable solo por admins.
export interface ConfiguracionCRM {
  tema_defecto: 'claro' | 'oscuro';
  dias_alerta_renovacion: number;
  dias_sin_actividad: number;
  vista_clientes_defecto: 'tabla' | 'tarjetas';
}

export const CONFIGURACION_DEFAULT: ConfiguracionCRM = {
  tema_defecto: 'claro',
  dias_alerta_renovacion: 60,
  dias_sin_actividad: 30,
  vista_clientes_defecto: 'tabla',
};

const EVENTO_CAMBIO = 'configuracion-crm-cambio';

export async function cargarConfiguracion(): Promise<ConfiguracionCRM> {
  if (!supabase) return CONFIGURACION_DEFAULT;
  const { data, error } = await supabase
    .from('configuracion_crm')
    .select('tema_defecto, dias_alerta_renovacion, dias_sin_actividad, vista_clientes_defecto')
    .eq('id', 1)
    .maybeSingle();
  // Si la tabla aún no existe o no hay permiso, se usan los valores por defecto.
  if (error || !data) return CONFIGURACION_DEFAULT;
  return { ...CONFIGURACION_DEFAULT, ...data };
}

export async function guardarConfiguracion(cambios: Partial<ConfiguracionCRM>): Promise<string | null> {
  if (!supabase) return 'Supabase no está configurado';
  const { error } = await supabase
    .from('configuracion_crm')
    .update({ ...cambios, actualizado_en: new Date().toISOString() })
    .eq('id', 1);
  if (error) return error.message;
  window.dispatchEvent(new Event(EVENTO_CAMBIO));
  return null;
}

export function useConfiguracionCRM(activo = true) {
  const [config, setConfig] = useState<ConfiguracionCRM>(CONFIGURACION_DEFAULT);
  const [cargando, setCargando] = useState(false);

  const recargar = useCallback(async () => {
    setCargando(true);
    setConfig(await cargarConfiguracion());
    setCargando(false);
  }, []);

  useEffect(() => {
    if (!activo) return;
    recargar();
    window.addEventListener(EVENTO_CAMBIO, recargar);
    return () => window.removeEventListener(EVENTO_CAMBIO, recargar);
  }, [activo, recargar]);

  return { config, cargando, recargar };
}
