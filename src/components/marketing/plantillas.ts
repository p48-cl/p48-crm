import { lunesDeSemana, normalizarEncabezado, parseNumero } from '../../lib/csv';

export type TipoPlantilla = 'metricas' | 'campanas' | 'seo';

export interface FilaSeo {
  keyword: string; periodo: string; posicion: number | null; posicion_anterior: number | null;
  volumen: number | null; dificultad: number | null; cpc_clp: number | null; url: string | null;
}

export interface FilaMetrica { plataforma: string; metrica: string; periodo: string; valor: number }
export interface FilaCampana {
  plataforma: string; campana_id: string; campana_nombre: string; canal: string | null; periodo: string;
  presupuesto_diario_clp: number | null; costo_clp: number; impresiones: number; clics: number;
  conversiones: number; valor_conversion_clp: number;
}

export interface Plantilla {
  id: string;
  titulo: string;
  descripcion: string;
  tipo: TipoPlantilla;
  plataformaPorDefecto?: string;
  ejemplo: string;
  // Alias de encabezados (normalizados) por campo
  alias: Record<string, string[]>;
}

export const PLATAFORMAS_METRICAS = ['ga4', 'gsc', 'google_ads', 'gbp', 'meta_bm', 'instagram', 'facebook', 'tiktok', 'linkedin', 'youtube', 'otro'];
export const PLATAFORMAS_CAMPANAS = ['google_ads', 'meta_ads', 'tiktok_ads', 'linkedin_ads', 'otro'];

export const PLANTILLAS: Plantilla[] = [
  {
    id: 'metricas',
    titulo: 'Métricas semanales (genérica)',
    descripcion: 'Una fila por plataforma, métrica y semana. Sirve para redes orgánicas, GA4, GSC o cualquier cifra cargada a mano.',
    tipo: 'metricas',
    ejemplo: 'plataforma,metrica,periodo,valor\ninstagram,seguidores,2026-11-02,4210\ninstagram,alcance,2026-11-02,18350\nga4,sesiones,2026-11-02,1280\n',
    alias: {
      plataforma: ['plataforma', 'platform', 'red', 'fuente'],
      metrica: ['metrica', 'metric', 'indicador'],
      periodo: ['periodo', 'semana', 'fecha', 'date', 'week'],
      valor: ['valor', 'value', 'total', 'cantidad'],
    },
  },
  {
    id: 'campanas',
    titulo: 'Campañas de pauta (genérica)',
    descripcion: 'Una fila por campaña y semana. Google Ads, Meta Ads, TikTok, LinkedIn u otra.',
    tipo: 'campanas',
    ejemplo:
      'plataforma,campana_id,campana_nombre,canal,periodo,presupuesto_diario_clp,costo_clp,impresiones,clics,conversiones,valor_conversion_clp\n' +
      'meta_ads,120001,Leads Marzo,Meta Leads,2026-11-02,15000,98000,52000,1300,22,0\n',
    alias: {
      plataforma: ['plataforma', 'platform'],
      campana_id: ['campanaid', 'idcampana', 'campaignid'],
      campana_nombre: ['campananombre', 'campana', 'nombrecampana', 'campaign', 'campaignname', 'nombredelacampana'],
      canal: ['canal', 'tipo', 'objetivo'],
      periodo: ['periodo', 'semana', 'fecha', 'date', 'week', 'inicio', 'inicioinforme', 'reportingstarts'],
      presupuesto_diario_clp: ['presupuestodiarioclp', 'presupuestodiario', 'dailybudget', 'presupuesto'],
      costo_clp: ['costoclp', 'costo', 'gasto', 'importegastadoclp', 'importegastado', 'amountspentclp', 'amountspent', 'cost', 'inversion'],
      impresiones: ['impresiones', 'impressions'],
      clics: ['clics', 'clicks', 'clicsenelenlace', 'linkclicks', 'clicsenlinks'],
      conversiones: ['conversiones', 'conversions', 'resultados', 'results', 'leads'],
      valor_conversion_clp: ['valorconversionclp', 'valorconversion', 'conversionvalue', 'valordeconversiondecompras', 'purchaseconversionvalue', 'ingresos', 'revenue'],
    },
  },
  {
    id: 'meta_ads',
    titulo: 'Meta Ads (export del Administrador de anuncios)',
    descripcion: 'Export por campaña con desglose por día o semana. Reconoce encabezados en español e inglés; suma los días de cada semana.',
    tipo: 'campanas',
    plataformaPorDefecto: 'meta_ads',
    ejemplo:
      'Nombre de la campaña,Inicio del informe,Importe gastado (CLP),Impresiones,Clics en el enlace,Resultados\n' +
      'Leads Marzo,2026-11-02,98000,52000,1300,22\n',
    alias: {
      campana_nombre: ['nombredelacampana', 'campaignname', 'campana'],
      periodo: ['iniciodelinforme', 'reportingstarts', 'dia', 'day', 'fecha'],
      costo_clp: ['importegastadoclp', 'importegastado', 'amountspentclp', 'amountspent'],
      impresiones: ['impresiones', 'impressions'],
      clics: ['clicsenelenlace', 'linkclicks', 'clics', 'clicks'],
      conversiones: ['resultados', 'results'],
      valor_conversion_clp: ['valordeconversiondecompras', 'purchaseconversionvalue'],
      presupuesto_diario_clp: ['presupuesto', 'budget'],
      canal: ['objetivo', 'objective'],
    },
  },
  {
    id: 'seo_keywords',
    titulo: 'SEO · palabras clave (Semrush u otra herramienta)',
    descripcion: 'Una fila por palabra clave y semana: posición, posición anterior, volumen, dificultad, CPC y URL. Reconoce encabezados en español e inglés. Si la misma palabra clave aparece dos veces en la semana, gana la última fila.',
    tipo: 'seo',
    ejemplo:
      'Keyword,Position,Previous position,Search Volume,Keyword Difficulty,CPC,URL\n' +
      'hotel cabo de hornos,3,5,720,31,850,https://cliente.cl/\n' +
      'hoteles en puerto williams,8,8,140,18,420,https://cliente.cl/destinos\n',
    alias: {
      keyword: ['keyword', 'palabraclave', 'consulta', 'query'],
      periodo: ['periodo', 'semana', 'fecha', 'date', 'week'],
      posicion: ['position', 'posicion', 'pos', 'rank'],
      posicion_anterior: ['previousposition', 'posicionanterior', 'previouspos', 'prevposition'],
      volumen: ['searchvolume', 'volumendebusqueda', 'volumen', 'volume'],
      dificultad: ['keyworddifficulty', 'dificultaddepalabraclave', 'dificultad', 'kd', 'difficulty'],
      cpc_clp: ['cpc', 'cpcclp'],
      url: ['url', 'pagina', 'landingpage'],
    },
  },
];

export interface Resultado<T> { filas: T[]; errores: string[]; faltantes: string[]; total: number }

const indiceDe = (cab: string[], alias: string[]) => {
  const n = cab.map(normalizarEncabezado);
  for (const a of alias) { const i = n.indexOf(a); if (i >= 0) return i; }
  return -1;
};

export function procesarMetricas(filas: string[][], p: Plantilla): Resultado<FilaMetrica> {
  const [cab, ...datos] = filas;
  const idx = Object.fromEntries(Object.entries(p.alias).map(([k, a]) => [k, indiceDe(cab, a)]));
  const faltantes = Object.entries(idx).filter(([, i]) => i < 0).map(([k]) => k);
  const out: FilaMetrica[] = [];
  const errores: string[] = [];
  if (faltantes.length) return { filas: out, errores, faltantes, total: datos.length };
  datos.forEach((f, n) => {
    const linea = n + 2;
    const plat = normalizarEncabezado(f[idx.plataforma] ?? '');
    const plataforma = PLATAFORMAS_METRICAS.find((x) => normalizarEncabezado(x) === plat);
    const periodo = lunesDeSemana(f[idx.periodo] ?? '');
    const valor = parseNumero(f[idx.valor] ?? '');
    const metrica = (f[idx.metrica] ?? '').trim().toLowerCase().replace(/\s+/g, '_');
    if (!plataforma) errores.push(`Fila ${linea}: plataforma «${f[idx.plataforma] ?? ''}» no válida (${PLATAFORMAS_METRICAS.join(', ')})`);
    else if (!metrica) errores.push(`Fila ${linea}: falta la métrica`);
    else if (!periodo) errores.push(`Fila ${linea}: fecha «${f[idx.periodo] ?? ''}» no válida`);
    else if (valor === null) errores.push(`Fila ${linea}: valor «${f[idx.valor] ?? ''}» no numérico`);
    else out.push({ plataforma, metrica, periodo, valor });
  });
  // Misma clave repetida en el archivo: gana la última
  const unicas = new Map(out.map((r) => [`${r.plataforma}|${r.metrica}|${r.periodo}`, r]));
  return { filas: [...unicas.values()], errores, faltantes, total: datos.length };
}

export function procesarCampanas(filas: string[][], p: Plantilla): Resultado<FilaCampana> {
  const [cab, ...datos] = filas;
  const idx = Object.fromEntries(Object.entries(p.alias).map(([k, a]) => [k, indiceDe(cab, a)]));
  const obligatorios = ['campana_nombre', 'periodo', 'costo_clp'];
  const faltantes = obligatorios.filter((k) => idx[k] < 0);
  const out: FilaCampana[] = [];
  const errores: string[] = [];
  if (faltantes.length) return { filas: out, errores, faltantes, total: datos.length };
  const num = (f: string[], k: string) => (idx[k] >= 0 ? parseNumero(f[idx[k]] ?? '') ?? 0 : 0);
  datos.forEach((f, n) => {
    const linea = n + 2;
    const plat = idx.plataforma >= 0 ? normalizarEncabezado(f[idx.plataforma] ?? '') : normalizarEncabezado(p.plataformaPorDefecto ?? '');
    const plataforma = PLATAFORMAS_CAMPANAS.find((x) => normalizarEncabezado(x) === plat);
    const periodo = lunesDeSemana(f[idx.periodo] ?? '');
    const nombre = (f[idx.campana_nombre] ?? '').trim();
    const id = idx.campana_id >= 0 && (f[idx.campana_id] ?? '').trim() ? f[idx.campana_id].trim() : nombre;
    if (!plataforma) errores.push(`Fila ${linea}: plataforma no válida (${PLATAFORMAS_CAMPANAS.join(', ')})`);
    else if (!nombre) errores.push(`Fila ${linea}: falta el nombre de la campaña`);
    else if (!periodo) errores.push(`Fila ${linea}: fecha «${f[idx.periodo] ?? ''}» no válida`);
    else if (idx.costo_clp >= 0 && parseNumero(f[idx.costo_clp] ?? '') === null) errores.push(`Fila ${linea}: costo «${f[idx.costo_clp] ?? ''}» no numérico`);
    else {
      out.push({
        plataforma, campana_id: id, campana_nombre: nombre,
        canal: idx.canal >= 0 ? (f[idx.canal] ?? '').trim() || null : null,
        periodo,
        presupuesto_diario_clp: idx.presupuesto_diario_clp >= 0 ? parseNumero(f[idx.presupuesto_diario_clp] ?? '') : null,
        costo_clp: num(f, 'costo_clp'), impresiones: Math.round(num(f, 'impresiones')), clics: Math.round(num(f, 'clics')),
        conversiones: num(f, 'conversiones'), valor_conversion_clp: num(f, 'valor_conversion_clp'),
      });
    }
  });
  // Filas del mismo día/semana se suman (exports diarios)
  const agregadas = new Map<string, FilaCampana>();
  for (const r of out) {
    const k = `${r.plataforma}|${r.campana_id}|${r.periodo}`;
    const a = agregadas.get(k);
    if (!a) agregadas.set(k, { ...r });
    else {
      a.costo_clp += r.costo_clp; a.impresiones += r.impresiones; a.clics += r.clics;
      a.conversiones += r.conversiones; a.valor_conversion_clp += r.valor_conversion_clp;
      a.presupuesto_diario_clp = r.presupuesto_diario_clp ?? a.presupuesto_diario_clp;
    }
  }
  return { filas: [...agregadas.values()], errores, faltantes, total: datos.length };
}

// Los exports de Semrush no traen fecha: se usa `periodoFijo` (semana del archivo) cuando no hay columna de periodo.
export function procesarSeo(filas: string[][], p: Plantilla, periodoFijo?: string): Resultado<FilaSeo> {
  const [cab, ...datos] = filas;
  const idx = Object.fromEntries(Object.entries(p.alias).map(([k, a]) => [k, indiceDe(cab, a)]));
  const faltantes = ['keyword', 'posicion'].filter((k) => idx[k] < 0);
  if (idx.periodo < 0 && !periodoFijo) faltantes.push('periodo');
  const out: FilaSeo[] = [];
  const errores: string[] = [];
  if (faltantes.length) return { filas: out, errores, faltantes, total: datos.length };
  const num = (f: string[], k: string) => (idx[k] >= 0 && (f[idx[k]] ?? '').trim() !== '' ? parseNumero(f[idx[k]] ?? '') : null);
  datos.forEach((f, n) => {
    const linea = n + 2;
    const keyword = (f[idx.keyword] ?? '').trim();
    const periodo = lunesDeSemana(idx.periodo >= 0 ? f[idx.periodo] ?? '' : periodoFijo ?? '');
    const posicion = num(f, 'posicion');
    if (!keyword) errores.push(`Fila ${linea}: falta la palabra clave`);
    else if (!periodo) errores.push(`Fila ${linea}: fecha «${f[idx.periodo] ?? ''}» no válida`);
    else if (posicion === null) errores.push(`Fila ${linea}: posición «${f[idx.posicion] ?? ''}» no numérica`);
    else out.push({
      keyword: keyword.toLowerCase(), periodo, posicion,
      posicion_anterior: num(f, 'posicion_anterior'),
      volumen: num(f, 'volumen') === null ? null : Math.round(num(f, 'volumen') as number),
      dificultad: num(f, 'dificultad'),
      cpc_clp: num(f, 'cpc_clp'),
      url: idx.url >= 0 ? (f[idx.url] ?? '').trim() || null : null,
    });
  });
  const unicas = new Map(out.map((r) => [`${r.keyword}|${r.periodo}`, r]));
  return { filas: [...unicas.values()], errores, faltantes, total: datos.length };
}
