// Resumen 360 de un cliente: negocios, cotizaciones, facturación, proyectos, reportes, completitud y alertas.
// Pura: recibe los datos ya cargados en CRMContext y no consulta nada.
import type {
  Actividad, Contacto, Empresa, Factura, Proyecto, Reporte, Tarea, VOportunidad, Etapa, CotizacionVista,
} from '../types/crm';
import { estadoEfectivo } from './cotizaciones';
import { metricasProyectos } from '../components/dashboard/metricas';

export type NivelAlerta = 'peligro' | 'aviso';
export interface AlertaCliente { nivel: NivelAlerta; texto: string }

export interface DatosCliente360 {
  oportunidades: VOportunidad[];
  etapas: Etapa[];
  facturas: Factura[];
  cotizaciones: CotizacionVista[];
  proyectos: Proyecto[];
  tareas: Tarea[];
  reportes: Reporte[];
  actividades: Actividad[];
  contactos: Contacto[];
}

export interface Resumen360 {
  negociosCaptacion: number;
  negociosExpansion: number;
  valorExpansionCLP: number;
  cotizacionesEnviadas: number;
  cotizacionesVencidas: number;
  porCobrarCLP: number;
  facturasVencidas: number;
  montoVencidoCLP: number;
  cobradoMesCLP: number;
  proyectosActivos: number;
  proyectosAtrasados: number;
  ultimoReporte: string | null;
  ultimaActividad: string | null;
  completitud: number;
  faltan: string[];
  alertas: AlertaCliente[];
}

const hoyChile = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
const soloFecha = (s: string) => s.slice(0, 10);
// Diferencia en días entre dos fechas YYYY-MM-DD (positivo si `hasta` es posterior)
const diasEntre = (desde: string, hasta: string) =>
  Math.round((Date.parse(soloFecha(hasta)) - Date.parse(soloFecha(desde))) / 86400000);
const maxFecha = (xs: (string | null | undefined)[]) => {
  const v = xs.filter((x): x is string => !!x).map(soloFecha).sort();
  return v.length ? v[v.length - 1] : null;
};
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

export function resumen360(empresa: Empresa, d: DatosCliente360): Resumen360 {
  const hoy = hoyChile();
  const esCliente = empresa.estado === 'cliente';
  const pipelineDe = (etapaId: string) => d.etapas.find((e) => e.id === etapaId)?.pipeline ?? 'captacion';

  // Negocios abiertos
  const cerrada = (etapaId: string) => {
    const et = d.etapas.find((e) => e.id === etapaId);
    return !!(et?.es_ganada || et?.es_perdida);
  };
  const ops = d.oportunidades.filter((o) => o.empresa_id === empresa.id && !o.archivado && !cerrada(o.etapa_id));
  const exp = ops.filter((o) => pipelineDe(o.etapa_id) === 'expansion');
  const valorExpansionCLP = exp.filter((o) => o.moneda === 'CLP').reduce((a, o) => a + Number(o.valor_neto || 0), 0);

  // Facturación
  const facs = d.facturas.filter((f) => f.empresa_id === empresa.id && !f.archivado);
  const pendientes = facs.filter((f) => f.estado_pago === 'pendiente');
  const vencidas = pendientes.filter((f) => !!f.fecha_vencimiento && soloFecha(f.fecha_vencimiento) < hoy);
  const mesActual = hoy.slice(0, 7);
  const cobradoMesCLP = facs
    .filter((f) => f.estado_pago === 'pagada' && !!f.fecha_pago && soloFecha(f.fecha_pago).startsWith(mesActual))
    .reduce((a, f) => a + Number(f.monto_total || 0), 0);

  // Cotizaciones
  const cots = d.cotizaciones.filter((c) => c.empresa_id === empresa.id);
  const efectivas = cots.map((c) => ({ c, estado: estadoEfectivo({ estado: c.estado, vence_el: c.vence_el }) }));
  const cotizacionesVencidas = efectivas.filter((x) => x.estado === 'vencida').length;
  const enviadas = efectivas.filter((x) => x.estado === 'enviada');
  const sinRespuesta = enviadas.filter((x) => diasEntre(x.c.fecha_emision, hoy) > 7).length;

  // Proyectos y reportes
  const proys = d.proyectos.filter((p) => p.empresa_id === empresa.id && !p.archivado && p.estado !== 'finalizado');
  const proyectosAtrasados = metricasProyectos(proys, d.tareas).conAtraso;
  const reps = d.reportes.filter((r) => r.empresa_id === empresa.id && !r.archivado);
  const ultimoReporte = maxFecha(reps.map((r) => r.periodo ?? r.created_at ?? null));

  // Actividad
  const ultimaActividad = maxFecha(d.actividades.filter((a) => a.empresa_id === empresa.id).map((a) => a.fecha_actividad));

  // Completitud (clientes exigen plan y renovación)
  const checks: [string, boolean][] = [
    ['RUT', !!empresa.rut],
    ['Responsable', !!empresa.responsable_id],
    ['Salud', !!empresa.salud],
    ['Contacto principal', d.contactos.some((c) => c.empresa_id === empresa.id && c.es_principal)],
  ];
  if (esCliente) checks.push(['Plan', !!empresa.plan], ['Renovación', !!empresa.fecha_renovacion]);
  const faltan = checks.filter(([, ok]) => !ok).map(([n]) => n);
  const completitud = Math.round(((checks.length - faltan.length) / checks.length) * 100);

  // Alertas
  const alertas: AlertaCliente[] = [];
  if (vencidas.length) {
    const monto = vencidas.reduce((a, f) => a + Number(f.monto_total || 0), 0);
    alertas.push({ nivel: 'peligro', texto: `${plural(vencidas.length, 'factura vencida', 'facturas vencidas')} · ${monto.toLocaleString('es-CL')} CLP` });
  }
  if (esCliente && empresa.fecha_renovacion) {
    const dias = diasEntre(hoy, empresa.fecha_renovacion);
    if (dias < 0) alertas.push({ nivel: 'peligro', texto: `Renovación vencida hace ${-dias} días` });
    else if (dias <= 60) alertas.push({ nivel: 'aviso', texto: `Renueva en ${dias} días` });
  }
  if (cotizacionesVencidas) alertas.push({ nivel: 'aviso', texto: plural(cotizacionesVencidas, 'cotización vencida', 'cotizaciones vencidas') });
  if (sinRespuesta) alertas.push({ nivel: 'aviso', texto: `${plural(sinRespuesta, 'cotización', 'cotizaciones')} sin respuesta hace más de 7 días` });
  if (proyectosAtrasados) alertas.push({ nivel: 'aviso', texto: `${plural(proyectosAtrasados, 'proyecto atrasado', 'proyectos atrasados')}` });
  if (esCliente) {
    if (!ultimoReporte) alertas.push({ nivel: 'aviso', texto: 'Sin reportes cargados' });
    else if (diasEntre(ultimoReporte, hoy) > 45) alertas.push({ nivel: 'aviso', texto: `Último reporte hace ${diasEntre(ultimoReporte, hoy)} días` });
  }
  const atrasados = ops.filter((o) => o.estado_seguimiento === 'atrasado').length;
  if (atrasados) alertas.push({ nivel: 'aviso', texto: `${plural(atrasados, 'negocio con próxima acción atrasada', 'negocios con próxima acción atrasada')}` });
  const sinAccion = ops.filter((o) => o.estado_seguimiento === 'sin_accion').length;
  if (sinAccion) alertas.push({ nivel: 'aviso', texto: `${plural(sinAccion, 'negocio sin próxima acción', 'negocios sin próxima acción')}` });
  if (esCliente && faltan.length) alertas.push({ nivel: 'aviso', texto: `Ficha incompleta: falta ${faltan.join(', ').toLowerCase()}` });
  alertas.sort((a, b) => (a.nivel === b.nivel ? 0 : a.nivel === 'peligro' ? -1 : 1));

  return {
    negociosCaptacion: ops.length - exp.length,
    negociosExpansion: exp.length,
    valorExpansionCLP,
    cotizacionesEnviadas: enviadas.length,
    cotizacionesVencidas,
    porCobrarCLP: pendientes.reduce((a, f) => a + Number(f.monto_total || 0), 0),
    facturasVencidas: vencidas.length,
    montoVencidoCLP: vencidas.reduce((a, f) => a + Number(f.monto_total || 0), 0),
    cobradoMesCLP,
    proyectosActivos: proys.length,
    proyectosAtrasados,
    ultimoReporte,
    ultimaActividad,
    completitud,
    faltan,
    alertas,
  };
}
