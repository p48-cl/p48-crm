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
