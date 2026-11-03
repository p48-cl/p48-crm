import { PlanEmpresa } from '../types/crm';

// Precios netos del modelo financiero v2.6 (Supuestos). Fuente de verdad: el modelo.
export const PLANES: Record<PlanEmpresa, { nombre: string; valor: number }> = {
  A: { nombre: 'Estrategia + Admin ADS', valor: 550000 },
  B: { nombre: 'Plan A + Creativos', valor: 1550000 },
  C: { nombre: 'Plan B + Contenido orgánico', valor: 2250000 },
  D: { nombre: 'Full Stack', valor: 3050000 },
  E: { nombre: 'Branding (lump sum)', valor: 2500000 },
};

export const SETUP_LISTA = 650000;
