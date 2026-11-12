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

export type PlanEmpresa = 'A' | 'B' | 'C' | 'D' | 'E' | 'personalizado';
export type RenovacionTipo = 'manual' | 'automatica';
export type SaludCliente = 'verde' | 'amarillo' | 'rojo';
export type EstadoPago = 'al_dia' | 'por_vencer' | 'atrasado';

export interface Empresa {
  origen?: 'lead' | 'referido' | 'prospeccion_directa' | 'cliente_existente' | 'otro' | null;
  origen_lead_id?: string | null;
  id: string; // uuid
  nombre: string;
  rut?: string | null;
  razon_social?: string | null;
  giro?: string | null;
  direccion_facturacion?: string | null;
  email_facturacion?: string | null;
  dias_pago?: number | null;
  dominio_web?: string | null;
  industria_id?: string | null;
  tamano?: string | null;
  looker_dashboard_url?: string | null;
  drive_folder_url?: string | null;
  logo_path?: string | null;
  estado: EstadoEmpresa;
  plan?: PlanEmpresa | null;
  fee_mensual_clp?: number | null;
  setup_fee_clp?: number | null;
  mrr_actual_clp?: number | null;
  fecha_renovacion?: string | null;
  renovacion_tipo?: RenovacionTipo | null;
  salud?: SaludCliente | null;
  inicio_contrato?: string | null;
  estado_pago?: EstadoPago | null;
  fecha_ultimo_pago?: string | null;
  proxima_facturacion?: string | null;
  riesgos_oportunidades?: string | null;
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
  telefono_fijo?: string | null;
  linkedin_url?: string | null;
  es_principal: boolean;
  archivado?: boolean;
  created_at?: string;
}

export type Moneda = 'CLP' | 'USD' | 'UF';

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
  pipeline: 'captacion' | 'expansion';
}

// Oportunidad para inserción y actualización (tabla oportunidades)
export interface Oportunidad {
  id: string; // uuid
  numero?: number; // correlativo global (histórico)
  pipeline?: 'captacion' | 'expansion';
  numero_pipeline?: number; // correlativo dentro del pipeline: LEAD-0001 / EXP-0001
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
  utm_fuente?: string | null;
  utm_campana?: string | null;
  utm_medio?: string | null;
  archivado?: boolean;
  created_at?: string;
  updated_at?: string;
  fecha_cierre_real?: string | null; // la fija la base al pasar a ganada/perdida
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

// Para guardar en evaluaciones_oportunidad (solo leads; upsert por oportunidad_id, criterio_id)
// NO incluye puntaje_obtenido (lo calcula la base)
export interface EvaluacionOportunidad {
  lead_id: string;
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
  archivado?: boolean;
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
  archivado?: boolean;
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
  proyecto_id?: string | null;
  fase_id?: string | null;
  fecha_inicio?: string | null; // inicio en el Gantt; si falta, la tarea es un hito en su fecha de vencimiento
  created_at?: string;
}

export interface ProyectoFase {
  id: string;
  proyecto_id: string;
  nombre: string;
  orden: number;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  visible_cliente: boolean;
  completada: boolean;
}

export interface ProyectoMiembro {
  proyecto_id: string;
  miembro_id: string;
  rol: 'responsable' | 'colaborador';
}

export interface TareaDependencia {
  tarea_id: string;
  depende_de_id: string;
}

// Respuesta de RPC kpis_dashboard
export interface KPIsDashboard {
  pipeline_ponderado_total: number;
  oportunidades_abiertas_count: number;
  seguimientos_atrasados_count: number;
  tareas_hoy_count: number;
  mrr_clientes_activos: number;
}

// ===== Capa de clientes (tablas proyectos, entregables, reportes, cliente_usuarios) =====
export type EstadoProyecto = 'planificado' | 'en_curso' | 'pausado' | 'finalizado';
export type EstadoEntregable = 'pendiente' | 'en_progreso' | 'en_revision' | 'entregado';
export type TipoReporte = 'mensual' | 'auditoria' | 'presentacion' | 'otro';

export type TipoProyecto = 'interno' | 'cliente';

export interface Proyecto {
  id: string;
  empresa_id: string | null; // null en proyectos internos
  tipo?: TipoProyecto;
  plantilla?: string | null;
  responsable_id?: string | null;
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
  url?: string | null;
  archivo_path?: string | null;
  archivo_nombre?: string | null;
  archivo_bytes?: number | null;
  visible_cliente: boolean;
  archivado: boolean;
  created_at?: string;
}

export interface ClienteUsuario {
  id: string;
  empresa_id: string;
  email: string;
  nombre: string;
  user_id?: string | null;
  activo: boolean;
}

// ===== Vistas del portal de clientes (portal_*) =====
export interface PortalEmpresa {
  empresa_id: string;
  nombre: string;
  plan: string | null;
  fecha_renovacion: string | null;
  looker_dashboard_url: string | null;
  drive_folder_url: string | null;
}

export interface PortalProyecto {
  id: string;
  empresa_id: string;
  nombre: string;
  descripcion: string | null;
  estado: EstadoProyecto;
  fecha_inicio: string | null;
  fecha_fin: string | null;
}

export interface PortalEntregable {
  id: string;
  proyecto_id: string;
  empresa_id: string;
  titulo: string;
  descripcion: string | null;
  estado: EstadoEntregable;
  fecha_comprometida: string | null;
  fecha_entrega: string | null;
  url_documento: string | null;
}

export interface PortalReporte {
  id: string;
  empresa_id: string;
  proyecto_id: string | null;
  titulo: string;
  tipo: TipoReporte;
  periodo: string | null;
  url: string | null;
  archivo_path?: string | null;
  archivo_nombre?: string | null;
}

export type EstadoFactura = 'pendiente' | 'pagada' | 'anulada';

// Factura registrada a mano desde el SII (afecta 33 o exenta 34).
export interface Factura {
  moneda?: 'CLP' | 'UF';
  monto_uf?: number | null;
  uf_valor?: number | null;
  uf_fecha?: string | null;
  id: string;
  empresa_id: string;
  cotizacion_id?: string | null;
  oportunidad_id?: string | null;
  tipo_documento: 33 | 34;
  folio: number;
  fecha_emision: string;
  fecha_vencimiento?: string | null;
  monto_neto: number;
  monto_iva: number;
  monto_total: number;
  estado_pago: EstadoFactura;
  fecha_pago?: string | null;
  medio_pago?: string | null;
  url_documento?: string | null;
  notas?: string | null;
  creada_por?: string | null;
  archivado: boolean;
  created_at?: string;
  updated_at?: string;
}

// Fila de v_cotizaciones (cotización con netos y vencimiento calculados por la base)
export interface CotizacionVista {
  id: string;
  archivado?: boolean;
  numero: number;
  empresa_id: string;
  oportunidad_id?: string | null;
  titulo: string;
  estado: string;
  fecha_emision: string;
  moneda: string;
  neto_mensual: number | null;
  neto_unico: number | null;
  vence_el: string;
}
