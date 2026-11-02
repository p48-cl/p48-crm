export function parseSupabaseError(error: any): string {
  if (!error) return 'Error desconocido';

  // Código P0001: RAISE EXCEPTION en Postgres / PLpgSQL
  // Viene en español y contiene la regla de negocio segura para el usuario
  if (error.code === 'P0001' && error.message) {
    return error.message;
  }

  // Código 42501: Permisos insuficientes / RLS denegado
  if (error.code === '42501' || error.message?.toLowerCase().includes('permission denied') || error.message?.toLowerCase().includes('violates row-level security')) {
    return 'No tienes permiso para hacer esto.';
  }

  // Si contiene mensaje personalizado de P48
  if (typeof error.message === 'string' && error.message.startsWith('P48:')) {
    return error.message.replace(/^P48:\s*/, '');
  }

  // Error genérico sin detalles técnicos expuestos
  return 'Ocurrió un inconveniente al procesar la solicitud. Por favor intenta nuevamente.';
}
