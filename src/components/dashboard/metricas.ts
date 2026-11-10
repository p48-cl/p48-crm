import type { Empresa, Etapa, Tarea, VOportunidad, Proyecto } from '../../types/crm';

// Cálculos compartidos de Overview, Pipeline y Clientes. Funciones puras: no leen la base.

const DIA = 86400000;

export const hoyIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const diasHasta = (iso: string) => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.round((new Date(iso.slice(0, 10) + 'T00:00:00').getTime() - hoy.getTime()) / DIA);
};

export type Periodo = 'mes' | 'trimestre' | 'anio' | '12m';
export const PERIODOS: { id: Periodo; label: string }[] = [
  { id: 'mes', label: 'Este mes' },
  { id: 'trimestre', label: 'Trimestre' },
  { id: 'anio', label: 'Este año' },
  { id: '12m', label: '12 meses' },
];

/** Fecha ISO (YYYY-MM-DD) de inicio del período. */
export const inicioPeriodo = (p: Periodo): string => {
  const d = new Date();
  let ini: Date;
  if (p === 'mes') ini = new Date(d.getFullYear(), d.getMonth(), 1);
  else if (p === 'trimestre') ini = new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1);
  else if (p === 'anio') ini = new Date(d.getFullYear(), 0, 1);
  else ini = new Date(d.getFullYear() - 1, d.getMonth(), d.getDate());
  return `${ini.getFullYear()}-${String(ini.getMonth() + 1).padStart(2, '0')}-${String(ini.getDate()).padStart(2, '0')}`;
};

export function clasificarEtapas(etapas: Etapa[]) {
  return {
    ganada: new Set(etapas.filter((e) => e.es_ganada).map((e) => e.id)),
    perdida: new Set(etapas.filter((e) => e.es_perdida).map((e) => e.id)),
  };
}

const num = (v: unknown) => Number(v) || 0;

/** Métricas del pipeline abierto: valor en CLP (USD aparte), ponderado y distribución por etapa. */
export function metricasPipeline(oportunidades: VOportunidad[], etapas: Etapa[]) {
  const { ganada, perdida } = clasificarEtapas(etapas);
  const vivas = oportunidades.filter((o) => !o.archivado);
  const abiertas = vivas.filter((o) => !ganada.has(o.etapa_id) && !perdida.has(o.etapa_id));
  const clp = abiertas.filter((o) => o.moneda === 'CLP');
  const porEtapa = etapas
    .filter((e) => e.activa && !e.es_ganada && !e.es_perdida)
    .sort((a, b) => a.orden - b.orden)
    .map((e) => {
      const ops = abiertas.filter((o) => o.etapa_id === e.id);
      return {
        id: e.id,
        nombre: e.nombre,
        color: e.color || '#888888',
        n: ops.length,
        valor: ops.filter((o) => o.moneda === 'CLP').reduce((a, o) => a + num(o.valor_neto), 0),
      };
    });
  return {
    abiertas,
    valorCLP: clp.reduce((a, o) => a + num(o.valor_neto), 0),
    ponderadoCLP: clp.reduce((a, o) => a + num(o.valor_ponderado), 0),
    valorUSD: abiertas.filter((o) => o.moneda !== 'CLP').reduce((a, o) => a + num(o.valor_neto), 0),
    atrasados: abiertas.filter((o) => o.estado_seguimiento === 'atrasado').length,
    sinAccion: abiertas.filter((o) => o.estado_seguimiento === 'sin_accion').length,
    porEtapa,
  };
}

/** Fecha en que se cerró: fecha_cierre_real; si falta, updated_at. */
const fechaCierre = (o: VOportunidad) => (o.fecha_cierre_real ?? o.updated_at ?? o.created_at ?? '').slice(0, 10);

/** Resultados de cierre dentro del período (desde inclusive). */
export function resultadosPeriodo(oportunidades: VOportunidad[], etapas: Etapa[], desde: string | null) {
  const { ganada, perdida } = clasificarEtapas(etapas);
  const enRango = (o: VOportunidad) => !desde || fechaCierre(o) >= desde;
  const vivas = oportunidades.filter((o) => !o.archivado);
  const ganadas = vivas.filter((o) => ganada.has(o.etapa_id) && enRango(o));
  const perdidas = vivas.filter((o) => perdida.has(o.etapa_id) && enRango(o));
  const nuevas = vivas.filter((o) => !desde || (o.created_at ?? '').slice(0, 10) >= desde);
  const cerradas = ganadas.length + perdidas.length;
  const ciclos = ganadas
    .filter((o) => o.created_at)
    .map((o) => (new Date(fechaCierre(o) + 'T00:00:00').getTime() - new Date(o.created_at!).getTime()) / DIA)
    .filter((d) => d >= 0);
  return {
    ganadas,
    perdidas,
    nuevas,
    valorGanadoCLP: ganadas.filter((o) => o.moneda === 'CLP').reduce((a, o) => a + num(o.valor_neto), 0),
    tasaCierre: cerradas > 0 ? (ganadas.length / cerradas) * 100 : null,
    cicloDias: ciclos.length ? Math.round(ciclos.reduce((a, d) => a + d, 0) / ciclos.length) : null,
  };
}

/** Forecast ponderado por mes de cierre estimado (próximos N meses; lo vencido se agrupa en "Atrasado"). */
export function forecastMensual(abiertas: VOportunidad[], meses = 6) {
  const base = new Date();
  base.setDate(1);
  const claves = Array.from({ length: meses }, (_, i) => {
    const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const filas = new Map<string, { n: number; ponderado: number }>(claves.map((k) => [k, { n: 0, ponderado: 0 }]));
  let atrasado = { n: 0, ponderado: 0 };
  let sinFecha = 0;
  for (const o of abiertas) {
    if (o.moneda !== 'CLP') continue;
    if (!o.fecha_cierre_estimada) { sinFecha++; continue; }
    const k = o.fecha_cierre_estimada.slice(0, 7);
    if (k < claves[0]) atrasado = { n: atrasado.n + 1, ponderado: atrasado.ponderado + num(o.valor_ponderado) };
    else if (filas.has(k)) {
      const f = filas.get(k)!;
      f.n++;
      f.ponderado += num(o.valor_ponderado);
    }
  }
  return { meses: claves.map((k) => ({ mes: k, ...filas.get(k)! })), atrasado, sinFecha };
}

/** Cartera: clientes, MRR, salud y renovaciones. */
export function metricasCartera(empresas: Empresa[], oportunidades: VOportunidad[], etapas: Etapa[]) {
  const { ganada, perdida } = clasificarEtapas(etapas);
  const vivas = empresas.filter((e) => !e.archivado);
  const clientes = vivas.filter((e) => e.estado === 'cliente');
  const prospectos = vivas.filter((e) => e.estado === 'prospecto');
  const conNegocio = new Set(
    oportunidades.filter((o) => !o.archivado && !ganada.has(o.etapa_id) && !perdida.has(o.etapa_id)).map((o) => o.empresa_id),
  );
  // Igual que kpis_dashboard en la base: solo mrr_actual_clp.
  const mrrDe = (e: Empresa) => num(e.mrr_actual_clp);
  const renovaciones = clientes
    .filter((e) => e.fecha_renovacion)
    .map((e) => ({ empresa: e, dias: diasHasta(e.fecha_renovacion!) }))
    .filter((r) => r.dias <= 60)
    .sort((a, b) => a.dias - b.dias);
  return {
    clientes,
    prospectos: prospectos.length,
    prospectosConNegocio: prospectos.filter((p) => conNegocio.has(p.id)).length,
    mrr: clientes.reduce((a, e) => a + mrrDe(e), 0),
    salud: {
      verde: clientes.filter((e) => e.salud === 'verde').length,
      amarillo: clientes.filter((e) => e.salud === 'amarillo').length,
      rojo: clientes.filter((e) => e.salud === 'rojo').length,
      sin: clientes.filter((e) => !e.salud).length,
    },
    incompletos: clientes.filter((e) => !e.responsable_id || !e.salud).length,
    renovaciones,
    renovacionesVencidas: renovaciones.filter((r) => r.dias < 0).length,
    mrrDe,
  };
}

/** Tareas pendientes, vencidas y de hoy (opcionalmente por responsable). */
export function metricasTareas(tareas: Tarea[]) {
  const hoy = hoyIso();
  const pendientes = tareas.filter((t) => !t.completada);
  return {
    pendientes: pendientes.length,
    vencidas: pendientes.filter((t) => t.fecha_vencimiento < hoy).length,
    hoy: pendientes.filter((t) => t.fecha_vencimiento === hoy).length,
  };
}

/** Avance y atraso de cada proyecto activo según sus tareas. */
export function metricasProyectos(proyectos: Proyecto[], tareas: Tarea[]) {
  const hoy = hoyIso();
  const activos = proyectos.filter((p) => !p.archivado && p.estado !== 'finalizado');
  const filas = activos.map((p) => {
    const ts = tareas.filter((t) => t.proyecto_id === p.id);
    const hechas = ts.filter((t) => t.completada).length;
    const atrasadas = ts.filter((t) => !t.completada && t.fecha_vencimiento < hoy).length;
    const vencido = !!p.fecha_fin && p.fecha_fin < hoy;
    return { proyecto: p, total: ts.length, hechas, atrasadas, avance: ts.length ? (hechas / ts.length) * 100 : 0, vencido };
  });
  return {
    activos: filas.sort((a, b) => b.atrasadas - a.atrasadas || Number(b.vencido) - Number(a.vencido)),
    conAtraso: filas.filter((f) => f.atrasadas > 0 || f.vencido).length,
  };
}
