export type RolUsuario = 'admin' | 'miembro';

export interface Miembro {
  id: string; // uuid
  user_id?: string | null; // uuid
  email: string;
  nombre: string;
  rol: RolUsuario;
  activo: boolean;
  avatar_url?: string | null;
  created_at?: string;
}

export type EstadoEmpresa =
  | 'prospecto'
  | 'cliente'
  | 'ex_cliente'
  | 'descartado'
  | 'proveedor'
  | 'interno'
  | 'archivado';

export type PlanEmpresa = 'A' | 'B' | 'C' | 'D' | 'E';
export type SaludCliente = 'verde' | 'amarillo' | 'rojo';

export interface Empresa {
  id: string; // uuid
  nombre: string;
  rut?: string | null;
  dominio_web?: string | null;
  industria_id?: string | null;
  tamano?: string | null;
  looker_dashboard_url?: string | null;
  drive_folder_url?: string | null;
  estado: EstadoEmpresa;
  plan?: PlanEmpresa | null;
  fee_mensual_clp?: number | null;
  setup_fee_clp?: number | null;
  mrr_actual_clp?: number | null;
  fecha_renovacion?: string | null;
  salud?: SaludCliente | null;
  responsable_id?: string | null;
  archivado?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AccesosAdminMarketing {
  empresa_id: string; // uuid único
  google_ads: boolean;
  ga4: boolean;
  meta_bm: boolean;
  gtm_cmp: boolean;
  notas_accesos?: string | null;
}

export type RolDecisionContacto = 'decisor' | 'influenciador' | 'usuario';

export interface Contacto {
  id: string; // uuid
  empresa_id: string; // uuid
  nombre: string;
  apellido?: string | null;
  cargo?: string | null;
  rol_decision?: RolDecisionContacto | null;
  email: string;
  telefono?: string | null;
  linkedin_url?: string | null;
  es_principal: boolean;
  archivado?: boolean;
  created_at?: string;
}

export type Moneda = 'CLP' | 'USD';

export type EstadoSeguimiento = 'sin_accion' | 'atrasado' | 'por_vencer' | 'al_dia' | null;

export interface Etapa {
  id: string; // uuid
  nombre: string;
  orden: number;
  probabilidad_default: number;
  color?: string | null;
  es_ganada: boolean;
  es_perdida: boolean;
  activa: boolean;
}

// Oportunidad para inserción y actualización (tabla oportunidades)
export interface Oportunidad {
  id: string; // uuid
  nombre: string;
  empresa_id: string;
  contacto_principal_id?: string | null;
  etapa_id: string;
  responsable_id?: string | null;
  fuente_id?: string | null;
  plan?: PlanEmpresa | null;
  moneda: Moneda;
  valor_neto: number;
  setup_neto?: number | null;
  probabilidad: number; // 0 a 100 editable
  fecha_cierre_estimada?: string | null;
  motivo_perdida_id?: string | null;
  motivo_perdida_detalle?: string | null;
  proxima_accion_texto?: string | null;
  proxima_accion_fecha?: string | null;
  archivado?: boolean;
  created_at?: string;
}

// Vista calculada v_oportunidades (para lectura)
export interface VOportunidad extends Oportunidad {
  valor_ponderado: number; // CALCULADO en base de datos
  estado_seguimiento: EstadoSeguimiento; // CALCULADO en base de datos
}

export interface CatalogoItem {
  id: string;
  nombre: string;
  activo: boolean;
  orden?: number;
}

export interface PlantillaCalificacion {
  id: string;
  nombre: string;
  descripcion?: string | null;
  activa: boolean;
  criterios?: CriterioCalificacion[];
}

export type TipoCriterio = 'si_no' | 'puntaje_1_5';

export interface CriterioCalificacion {
  id: string;
  plantilla_id: string;
  orden: number;
  pregunta: string;
  tipo: TipoCriterio;
  peso: number;
  es_eliminatorio: boolean;
}

// Para guardar en evaluaciones_oportunidad (upsert por oportunidad_id, criterio_id)
// NO incluye puntaje_obtenido (lo calcula la base)
export interface EvaluacionOportunidad {
  oportunidad_id: string;
  criterio_id: string;
  valor_respuesta: string; // 'si'|'no' o '1'..'5'
  excepcion_aplicada?: boolean;
  motivo_excepcion?: string | null;
  fecha_revision_excepcion?: string | null;
}

// Vista v_calificacion_oportunidad
export interface VCalificacionOportunidad {
  oportunidad_id: string;
  puntaje_total: number;
  puntaje_maximo: number;
  falla_eliminatorio: boolean;
}

export type TipoActividad = 'llamada' | 'reunion' | 'nota' | 'correo_manual';

// Inserción en actividades (el autor lo asigna la base)
export interface Actividad {
  id: string;
  empresa_id?: string | null;
  oportunidad_id?: string | null;
  contacto_id?: string | null;
  tipo: TipoActividad;
  titulo: string;
  descripcion?: string | null;
  resultado?: string | null;
  fecha_actividad: string;
  autor_id?: string | null; // Asignado por la base
  created_at?: string;
}

export interface Tarea {
  id: string;
  empresa_id?: string | null;
  oportunidad_id?: string | null;
  responsable_id?: string | null;
  titulo: string;
  descripcion?: string | null;
  fecha_vencimiento: string; // date YYYY-MM-DD
  prioridad: 'alta' | 'media' | 'baja';
  completada: boolean;
  fecha_completada?: string | null;
  created_at?: string;
}

// Vistas de gráficos
export interface VPipelinePorEtapa {
  etapa_id: string;
  nombre: string;
  orden: number;
  color?: string | null;
  es_ganada: boolean;
  es_perdida: boolean;
  cantidad: number;
  valor_ponderado: number;
}

export interface VOportunidadesPorFuente {
  nombre: string;
  cantidad: number;
}

export interface VMotivosPerdida {
  nombre: string;
  cantidad: number;
}

// Respuesta de RPC kpis_dashboard
export interface KPIsDashboard {
  pipeline_ponderado_total: number;
  oportunidades_abiertas_count: number;
  seguimientos_atrasados_count: number;
  tareas_hoy_count: number;
  mrr_clientes_activos: number;
}

// ===== Dashboard de agencia (vistas v_dash_*) =====
export interface DashResultados {
  ganadas: number;
  perdidas: number;
  tasa_cierre_pct: number | null;
  ciclo_venta_dias: number | null;
  valor_ganado_clp: number;
}

export interface DashEmbudoEtapa {
  etapa_id: string;
  nombre: string;
  orden: number;
  color?: string | null;
  alcanzaron: number;
}

export interface DashForecastMes {
  mes: string; // YYYY-MM-DD (primer día del mes)
  oportunidades: number;
  valor_neto: number;
  valor_ponderado: number;
}

export interface DashPipelineResponsable {
  responsable_id: string;
  responsable: string;
  oportunidades_abiertas: number;
  valor_neto_total: number;
  valor_ponderado_total: number;
}

export interface DashClienteCartera {
  empresa_id: string;
  nombre: string;
  plan: string | null;
  fee_mensual_clp: number | null;
  mrr_actual_clp: number | null;
  fecha_renovacion: string | null;
  dias_a_renovacion: number | null;
  salud: 'verde' | 'amarillo' | 'rojo' | null;
  responsable: string | null;
}

export interface DashTareasResponsable {
  responsable_id: string;
  responsable: string;
  pendientes: number;
  vencidas: number;
  hoy: number;
}

// ===== Capa de clientes (tablas proyectos, entregables, reportes, cliente_usuarios) =====
export type EstadoProyecto = 'planificado' | 'en_curso' | 'pausado' | 'finalizado';
export type EstadoEntregable = 'pendiente' | 'en_progreso' | 'en_revision' | 'entregado';
export type TipoReporte = 'mensual' | 'auditoria' | 'otro';

export interface Proyecto {
  id: string;
  empresa_id: string;
  nombre: string;
  descripcion?: string | null;
  estado: EstadoProyecto;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  visible_cliente: boolean;
  archivado: boolean;
  created_at?: string;
}

export interface Entregable {
  id: string;
  proyecto_id: string;
  titulo: string;
  descripcion?: string | null;
  estado: EstadoEntregable;
  fecha_comprometida?: string | null;
  fecha_entrega?: string | null;
  url_documento?: string | null;
  notas_internas?: string | null;
  visible_cliente: boolean;
  archivado: boolean;
}

export interface Reporte {
  id: string;
  empresa_id: string;
  proyecto_id?: string | null;
  titulo: string;
  tipo: TipoReporte;
  periodo?: string | null;
  url: string;
  visible_cliente: boolean;
  archivado: boolean;
}

export interface ClienteUsuario {
  id: string;
  empresa_id: string;
  email: string;
  nombre: string;
  user_id?: string | null;
  activo: boolean;
}
