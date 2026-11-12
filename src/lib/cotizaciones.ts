// Reglas compartidas de cotizaciones. Facturación en CLP; UF solo como referencia con snapshot.

export type MonedaCotizacion = 'CLP' | 'UF';

export const hoyChile = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });

// Una cotización enviada cuya fecha de vencimiento ya pasó se muestra como vencida.
// No cambia el dato guardado: el estado sigue siendo 'enviada' hasta que alguien lo edite.
export const estadoEfectivo = (c: { estado: string; vence_el: string }): string =>
  c.estado === 'enviada' && c.vence_el.slice(0, 10) < hoyChile() ? 'vencida' : c.estado;

// CLP sin decimales; UF con 2 decimales.
export const redondear = (n: number, moneda: MonedaCotizacion): number =>
  moneda === 'UF' ? Math.round(n * 100) / 100 : Math.round(n);

// Convierte un monto entre CLP y UF con el valor UF congelado en la cotización.
export const convertirMoneda = (monto: number, desde: MonedaCotizacion, hasta: MonedaCotizacion, valorUf: number): number => {
  if (desde === hasta) return monto;
  return hasta === 'UF' ? redondear(monto / valorUf, 'UF') : Math.round(monto * valorUf);
};

// Estados de cotización: el código fija cuáles existen; Administración edita etiqueta y color.
export const ESTADOS_COTIZACION = ['borrador', 'enviada', 'aceptada', 'rechazada', 'vencida'] as const;
export const COLORES_ESTADO: Record<string, { texto: string; var: string; nombre: string }> = {
  muted: { texto: 'text-[var(--c-muted)]', var: 'var(--c-muted-2)', nombre: 'Gris' },
  info: { texto: 'text-[var(--c-info)]', var: 'var(--c-info)', nombre: 'Azul' },
  ok: { texto: 'text-[var(--c-ok)]', var: 'var(--c-ok)', nombre: 'Verde' },
  warn: { texto: 'text-[var(--c-warn)]', var: 'var(--c-warn)', nombre: 'Ámbar' },
  danger: { texto: 'text-[var(--c-danger)]', var: 'var(--c-danger)', nombre: 'Rojo' },
  accent: { texto: 'text-[var(--c-accent)]', var: 'var(--c-accent)', nombre: 'Lima' },
};
export const ESTADO_DEFECTO: Record<string, { etiqueta: string; color: string }> = {
  borrador: { etiqueta: 'Borrador', color: 'muted' },
  enviada: { etiqueta: 'Enviada', color: 'info' },
  aceptada: { etiqueta: 'Aceptada', color: 'ok' },
  rechazada: { etiqueta: 'Rechazada', color: 'danger' },
  vencida: { etiqueta: 'Vencida', color: 'warn' },
};
export const estiloEstado = (cfg: Record<string, { etiqueta?: string; color?: string }> | undefined, estado: string) => {
  const base = ESTADO_DEFECTO[estado] ?? { etiqueta: estado, color: 'muted' };
  const etiqueta = cfg?.[estado]?.etiqueta?.trim() || base.etiqueta;
  const color = COLORES_ESTADO[cfg?.[estado]?.color ?? ''] ? (cfg?.[estado]?.color as string) : base.color;
  return { etiqueta, clase: COLORES_ESTADO[color].texto, color: COLORES_ESTADO[color].var };
};
