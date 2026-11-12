/**
 * Utilidades de formato para P48 (Chile)
 * Moneda: $ 1.234.567 CLP
 * Dólares: US$ 1.234
 * Fechas: dd-mm-aaaa en zona horaria America/Santiago
 */

export function formatCLP(monto: number | null | undefined): string {
  if (monto === null || monto === undefined || isNaN(monto)) return '$ 0 CLP';
  const entero = Math.round(monto);
  const formateado = new Intl.NumberFormat('es-CL', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(entero);
  return `$ ${formateado} CLP`;
}

export type MonedaCRM = 'CLP' | 'USD' | 'UF';

export function formatUF(monto: number | null | undefined): string {
  if (monto === null || monto === undefined || isNaN(monto)) return 'UF 0';
  const formateado = new Intl.NumberFormat('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(monto);
  return `UF ${formateado}`;
}

export function formatMoneda(monto: number | null | undefined, moneda: MonedaCRM = 'CLP'): string {
  if (moneda === 'UF') return formatUF(monto);
  if (moneda === 'USD') {
    if (monto === null || monto === undefined || isNaN(monto)) return 'US$ 0';
    const formateado = new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
    }).format(monto);
    return `US$ ${formateado}`;
  }
  return formatCLP(monto);
}

export function formatFecha(fechaInput: string | Date | null | undefined): string {
  if (!fechaInput) return '—';
  try {
    // Fechas solo-día (YYYY-MM-DD) se interpretan a mediodía local: new Date("2026-12-01") cae en el día anterior en Chile.
    const d = typeof fechaInput === 'string'
      ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(fechaInput) ? `${fechaInput}T12:00:00` : fechaInput)
      : fechaInput;
    if (isNaN(d.getTime())) return String(fechaInput);

    const partes = new Intl.DateTimeFormat('es-CL', {
      timeZone: 'America/Santiago',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).formatToParts(d);

    const dia = partes.find((p) => p.type === 'day')?.value ?? '01';
    const mes = partes.find((p) => p.type === 'month')?.value ?? '01';
    const anio = partes.find((p) => p.type === 'year')?.value ?? '2026';

    return `${dia}-${mes}-${anio}`;
  } catch {
    return String(fechaInput);
  }
}

export function formatFechaHora(fechaInput: string | Date | null | undefined): string {
  if (!fechaInput) return '—';
  try {
    const d = typeof fechaInput === 'string' ? new Date(fechaInput) : fechaInput;
    if (isNaN(d.getTime())) return String(fechaInput);

    const fecha = formatFecha(d);
    const partesHora = new Intl.DateTimeFormat('es-CL', {
      timeZone: 'America/Santiago',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(d);

    const hora = partesHora.find((p) => p.type === 'hour')?.value ?? '00';
    const minuto = partesHora.find((p) => p.type === 'minute')?.value ?? '00';

    return `${fecha} ${hora}:${minuto}`;
  } catch {
    return String(fechaInput);
  }
}

export function formatRUT(rutRaw?: string | null): string {
  if (!rutRaw) return '';
  const limpio = rutRaw.replace(/[^0-9kK]/g, '').toUpperCase();
  if (limpio.length < 2) return limpio;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  const cuerpoFormateado = new Intl.NumberFormat('es-CL').format(parseInt(cuerpo, 10));
  return `${cuerpoFormateado}-${dv}`;
}

// Formato mientras se escribe: 12345678 -> 12.345.678 ; dígito verificador tras guion.
export function formatRUTInput(raw: string): string {
  const limpio = raw.replace(/[^0-9kK]/g, '').toUpperCase().slice(0, 9);
  if (limpio.length <= 1) return limpio;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  return `${new Intl.NumberFormat('es-CL').format(parseInt(cuerpo, 10))}-${dv}`;
}

// Celular chileno: siempre +569 seguido de 8 dígitos, formato "+569 1234 5678".
export function formatTelefonoCL(raw: string): string {
  const d = raw.replace(/\D/g, '');
  if (!d || (d.length < 3 && '569'.startsWith(d))) return '';
  let resto = d.startsWith('56') ? d.slice(2) : d;
  if (!resto) return '+56';
  if (!resto.startsWith('9')) resto = '9' + resto.replace(/^0+/, '');
  const cuerpo = resto.slice(1, 9);
  const bloques = [cuerpo.slice(0, 4), cuerpo.slice(4, 8)].filter(Boolean).join(' ');
  return bloques ? `+569 ${bloques}` : '+569';
}

export function normalizarDominio(raw?: string | null): string {
  if (!raw) return '';
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .split('?')[0];
}

export function sanitizarQueryBusqueda(texto: string): string {
  if (!texto) return '';
  // Escapar %, _, comas y paréntesis para filtros .or() e ilike de Supabase
  return texto.replace(/[%_,()]/g, '').trim();
}

export function esFechaAtrasada(fechaStr?: string | null): boolean {
  if (!fechaStr) return false;
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fecha = new Date(fechaStr);
    return fecha < hoy;
  } catch {
    return false;
  }
}

export function esFechaHoy(fechaStr?: string | null): boolean {
  if (!fechaStr) return false;
  try {
    const hoy = new Date();
    const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    return fechaStr.startsWith(hoyStr);
  } catch {
    return false;
  }
}

// Correlativos únicos: COT-0001, NEG-0001
export function formatCorrelativo(prefijo: 'COT' | 'NEG', numero?: number | null): string {
  if (numero == null) return '';
  return `${prefijo}-${String(numero).padStart(4, '0')}`;
}

// Días desde hoy hasta una fecha YYYY-MM-DD (negativo = vencida)
export function diasHastaFecha(fechaStr?: string | null): number | null {
  if (!fechaStr) return null;
  const [y, m, d] = fechaStr.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.round((new Date(y, m - 1, d).getTime() - hoy.getTime()) / 86400000);
}
