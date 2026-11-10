import { aIso, diaHabil, finHabil, siguienteHabil } from './fechas';
import type { TipoProyecto } from '../../types/crm';

export interface TareaPlantilla {
  titulo: string;
  dias: number; // días hábiles
  paralelo?: boolean; // arranca junto con la tarea anterior y no depende de ella
}
export interface FasePlantilla {
  nombre: string;
  tareas: TareaPlantilla[];
}
export interface PlantillaProyecto {
  id: string;
  nombre: string;
  tipo: TipoProyecto;
  descripcion: string;
  fases: FasePlantilla[];
}

export const PLANTILLAS: PlantillaProyecto[] = [
  {
    id: 'ga4',
    nombre: 'Implementar GA4',
    tipo: 'cliente',
    descripcion: 'Auditoría, medición, GTM, Consent Mode v2 y dashboard.',
    fases: [
      { nombre: 'Diagnóstico', tareas: [{ titulo: 'Auditar accesos y propiedad actual', dias: 2 }, { titulo: 'Definir eventos y conversiones', dias: 3 }] },
      { nombre: 'Implementación', tareas: [{ titulo: 'Configurar propiedad y flujos de datos', dias: 2 }, { titulo: 'Instalar GTM y etiquetas', dias: 3 }, { titulo: 'Configurar Consent Mode v2 (CMP)', dias: 2 }] },
      { nombre: 'Validación', tareas: [{ titulo: 'Probar eventos en DebugView', dias: 2 }, { titulo: 'Vincular Google Ads y Search Console', dias: 1 }] },
      { nombre: 'Entrega', tareas: [{ titulo: 'Dashboard en Looker Studio', dias: 3 }, { titulo: 'Capacitación y entrega', dias: 1 }] },
    ],
  },
  {
    id: 'ecosistema',
    nombre: 'Desplegar ecosistema digital',
    tipo: 'cliente',
    descripcion: 'Kickoff, base técnica, canales y primer reporte.',
    fases: [
      { nombre: 'Descubrimiento', tareas: [{ titulo: 'Kickoff y accesos', dias: 2 }, { titulo: 'Diagnóstico estratégico', dias: 4 }] },
      { nombre: 'Base técnica', tareas: [{ titulo: 'Tracking: GA4, GTM y CMP', dias: 5 }, { titulo: 'Formularios y CRM', dias: 4 }] },
      { nombre: 'Canales', tareas: [{ titulo: 'Campaña inicial en Google Ads', dias: 5 }, { titulo: 'Perfil de Empresa y SEO básico', dias: 4, paralelo: true }] },
      { nombre: 'Reporte', tareas: [{ titulo: 'Dashboard y primer reporte', dias: 4 }] },
    ],
  },
  {
    id: 'web',
    nombre: 'Remodelar sitio web',
    tipo: 'interno',
    descripcion: 'Estrategia, diseño, desarrollo y lanzamiento.',
    fases: [
      { nombre: 'Estrategia', tareas: [{ titulo: 'Definir objetivos y estructura', dias: 3 }, { titulo: 'Copy y mensajes', dias: 4 }] },
      { nombre: 'Diseño', tareas: [{ titulo: 'Wireframes', dias: 3 }, { titulo: 'Diseño visual', dias: 5 }] },
      { nombre: 'Desarrollo', tareas: [{ titulo: 'Maquetación', dias: 6 }, { titulo: 'Formularios y tracking', dias: 3 }, { titulo: 'SEO técnico', dias: 3, paralelo: true }] },
      { nombre: 'Lanzamiento', tareas: [{ titulo: 'QA y velocidad', dias: 3 }, { titulo: 'Publicación y redirecciones', dias: 1 }] },
    ],
  },
];

export interface TareaPlanificada {
  titulo: string;
  fase: number; // índice de la fase
  inicio: string;
  fin: string;
  dependeDe: number | null; // índice plano de la tarea previa
}
export interface PlanProyecto {
  fases: { nombre: string; inicio: string; fin: string }[];
  tareas: TareaPlanificada[];
  fin: string;
}

// Calcula fechas en días hábiles: cada tarea arranca al terminar la anterior (salvo las paralelas).
export function planificar(p: PlantillaProyecto, inicio: string): PlanProyecto {
  const tareas: TareaPlanificada[] = [];
  const fases: PlanProyecto['fases'] = [];
  let cursor = diaHabil(inicio);
  let anterior: number | null = null;
  p.fases.forEach((f, fi) => {
    let faseIni = '';
    let faseFin = '';
    for (const t of f.tareas) {
      const ini: string = t.paralelo && anterior !== null ? tareas[anterior].inicio : cursor;
      const fin = finHabil(ini, t.dias);
      tareas.push({ titulo: t.titulo, fase: fi, inicio: ini, fin, dependeDe: t.paralelo ? null : anterior });
      anterior = tareas.length - 1;
      if (!faseIni || ini < faseIni) faseIni = ini;
      if (!faseFin || fin > faseFin) faseFin = fin;
      const siguiente = siguienteHabil(fin);
      if (!t.paralelo || siguiente > cursor) cursor = siguiente;
    }
    fases.push({ nombre: f.nombre, inicio: faseIni, fin: faseFin });
  });
  const fin = tareas.reduce((m, t) => (t.fin > m ? t.fin : m), inicio);
  return { fases, tareas, fin };
}

export { aIso };
