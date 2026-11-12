import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';

// Configuración del sistema (fila única en configuracion_crm). Editable solo por admins.
export interface ConfiguracionCRM {
  tema_defecto: 'claro' | 'oscuro';
  dias_alerta_renovacion: number;
  dias_sin_actividad: number;
  vista_clientes_defecto: 'tabla' | 'tarjetas';
  setup_lista_clp: number;
  cotizacion_validez_dias: number;
  iva_pct: number;
  comision_base: string;
  condiciones_base: string;
  medios_pago: string[];
  // Etiqueta y color por estado de cotización (vacío = valores por defecto)
  estados_cotizacion: Record<string, { etiqueta?: string; color?: string }>;
}

export const CONFIGURACION_DEFAULT: ConfiguracionCRM = {
  tema_defecto: 'claro',
  dias_alerta_renovacion: 60,
  dias_sin_actividad: 30,
  vista_clientes_defecto: 'tabla',
  setup_lista_clp: 650000,
  cotizacion_validez_dias: 15,
  iva_pct: 19,
  comision_base:
    'Comisión de gestión de pauta: 15% de la inversión mensual en plataformas, con escala descendente hasta 8% según el monto invertido. La inversión en pauta se paga directamente a cada plataforma y no está incluida en esta cotización.',
  condiciones_base:
    'Valores netos en pesos chilenos, más IVA. Cotización válida por el plazo indicado. El servicio inicia con la aceptación y la entrega de accesos de administrador a las plataformas.',
  medios_pago: ['Transferencia', 'Cheque', 'Tarjeta', 'Efectivo'],
  estados_cotizacion: {},
};

const COLUMNAS =
  'tema_defecto, dias_alerta_renovacion, dias_sin_actividad, vista_clientes_defecto, setup_lista_clp, cotizacion_validez_dias, iva_pct, comision_base, condiciones_base, medios_pago, estados_cotizacion';

// Última configuración cargada: evita parpadeos y consultas repetidas entre componentes.
let cache: ConfiguracionCRM | null = null;
try {
  const guardado = localStorage.getItem('jamp-config');
  if (guardado) cache = { ...CONFIGURACION_DEFAULT, ...JSON.parse(guardado) };
} catch { /* sin almacenamiento: se usan los valores por defecto */ }

const EVENTO_CAMBIO = 'configuracion-crm-cambio';

export async function cargarConfiguracion(): Promise<ConfiguracionCRM> {
  if (!supabase) return CONFIGURACION_DEFAULT;
  const { data, error } = await supabase
    .from('configuracion_crm')
    .select(COLUMNAS)
    .eq('id', 1)
    .maybeSingle();
  // Si la tabla aún no existe o no hay permiso, se usan los valores por defecto.
  if (error || !data) return CONFIGURACION_DEFAULT;
  cache = { ...CONFIGURACION_DEFAULT, ...data };
  try { localStorage.setItem('jamp-config', JSON.stringify(cache)); } catch { /* ignorar */ }
  return cache;
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
  const [config, setConfig] = useState<ConfiguracionCRM>(cache ?? CONFIGURACION_DEFAULT);
  const [cargando, setCargando] = useState(false);
  // true cuando la configuración ya vino de la base (o está en caché): evita aplicar el tema por defecto antes de tiempo
  const [lista, setLista] = useState(cache !== null);

  const recargar = useCallback(async () => {
    setCargando(true);
    setConfig(await cargarConfiguracion());
    setCargando(false);
    setLista(true);
  }, []);

  useEffect(() => {
    if (!activo) return;
    recargar();
    window.addEventListener(EVENTO_CAMBIO, recargar);
    return () => window.removeEventListener(EVENTO_CAMBIO, recargar);
  }, [activo, recargar]);

  return { config, cargando, recargar, lista };
}
