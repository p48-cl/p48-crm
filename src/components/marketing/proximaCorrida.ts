// Próxima corrida de Claude que procesa solicitudes de análisis de marketing.
// Horario real (tareas programadas, America/Santiago):
//  - Revisión diaria: lunes a sábado 12:00 (procesa solicitudes pendientes).
//  - Análisis semanal: domingo 20:00 (también procesa pendientes).

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

// Partes de fecha/hora en Santiago, sin depender de la zona del navegador.
function ahoraSantiago(fecha: Date) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Santiago',
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
    })
      .formatToParts(fecha)
      .map((x) => [x.type, x.value]),
  );
  return { y: Number(p.year), m: Number(p.month), d: Number(p.day), h: Number(p.hour) % 24, min: Number(p.minute) };
}

// Devuelve la próxima corrida como texto legible ("hoy a las 12:00", "el domingo a las 20:00").
export function proximaCorrida(ahora: Date = new Date()): string {
  const { y, m, d, h, min } = ahoraSantiago(ahora);
  const minutosAhora = h * 60 + min;
  // Recorremos días calendario a partir de hoy (aritmética UTC sobre la fecha local de Santiago).
  for (let i = 0; i < 8; i++) {
    const base = new Date(Date.UTC(y, m - 1, d + i));
    const dow = base.getUTCDay(); // 0 = domingo
    const horaSlot = dow === 0 ? 20 : 12;
    const minutosSlot = horaSlot * 60;
    if (i === 0 && minutosSlot <= minutosAhora) continue;
    const hora = `${horaSlot}:00`;
    if (i === 0) return `hoy a las ${hora}`;
    if (i === 1) return `mañana a las ${hora}`;
    return `el ${DIAS[dow]} a las ${hora}`;
  }
  return 'en la próxima revisión';
}

// Texto para la confirmación tras pedir un análisis.
export const mensajeEnCola = (ahora?: Date) =>
  `En cola. Claude la procesa ${proximaCorrida(ahora)} (revisión de lunes a sábado 12:00 o análisis del domingo 20:00).`;
