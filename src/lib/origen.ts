import type { Empresa } from '../types/crm';

export type OrigenCliente = NonNullable<Empresa['origen']>;

export const ORIGEN_ETIQUETA: Record<OrigenCliente, string> = {
  lead: 'lead',
  referido: 'referido',
  manual: 'manual',
  cliente_existente: 'cliente existente',
  otro: 'otro',
};

export const OPCIONES_ORIGEN: { valor: OrigenCliente | ''; texto: string }[] = [
  { valor: '', texto: 'Sin definir' },
  { valor: 'manual', texto: 'Manual' },
  { valor: 'referido', texto: 'Referido' },
  { valor: 'cliente_existente', texto: 'Cliente existente' },
  { valor: 'otro', texto: 'Otro' },
];
