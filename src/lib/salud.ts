import type { SaludCliente } from '../types/crm';

// Nombres de la salud de cuenta: se usan igual en tarjetas, tablas y ficha
export const SALUD_ETIQUETA: Record<SaludCliente, string> = {
  verde: 'Saludable',
  amarillo: 'En alerta',
  rojo: 'En riesgo',
};
