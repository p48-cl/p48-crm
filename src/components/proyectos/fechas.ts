// Fechas ISO (YYYY-MM-DD) sin problemas de zona horaria.
export const aFecha = (iso: string) => new Date(iso + 'T12:00:00');
export const aIso = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};
export const hoyIso = () => aIso(new Date());
export const sumarDias = (iso: string, n: number) => {
  const d = aFecha(iso);
  d.setDate(d.getDate() + n);
  return aIso(d);
};
export const diasEntre = (desde: string, hasta: string) =>
  Math.round((aFecha(hasta).getTime() - aFecha(desde).getTime()) / 86400000);
const esFinDeSemana = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

// Primer día hábil igual o posterior a la fecha
export const diaHabil = (iso: string) => {
  const d = aFecha(iso);
  while (esFinDeSemana(d)) d.setDate(d.getDate() + 1);
  return aIso(d);
};
// Último día de una tarea de n días hábiles que empieza en `inicio` (incluye el día de inicio)
export const finHabil = (inicio: string, n: number) => {
  const d = aFecha(diaHabil(inicio));
  let restantes = Math.max(n, 1) - 1;
  while (restantes > 0) {
    d.setDate(d.getDate() + 1);
    if (!esFinDeSemana(d)) restantes--;
  }
  return aIso(d);
};
export const siguienteHabil = (iso: string) => diaHabil(sumarDias(iso, 1));
export const mesLargo = (d: Date) => d.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
export const diaCorto = (iso: string) => aFecha(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
