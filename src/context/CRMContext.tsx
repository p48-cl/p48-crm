import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Empresa,
  Contacto,
  Oportunidad,
  VOportunidad,
  Etapa,
  PlantillaCalificacion,
  CriterioCalificacion,
  EvaluacionOportunidad,
  VCalificacionOportunidad,
  Actividad,
  Tarea,
  CatalogoItem,
  AccesosAdminMarketing,
  Miembro,
  KPIsDashboard,
  VPipelinePorEtapa,
  VOportunidadesPorFuente,
  VMotivosPerdida,
} from '../types/crm';
import {
  INITIAL_EMPRESAS,
  INITIAL_CONTACTOS,
  INITIAL_ACCESOS,
  INITIAL_OPORTUNIDADES,
  INITIAL_ETAPAS,
  INITIAL_PLANTILLA,
  INITIAL_ACTIVIDADES,
  INITIAL_TAREAS,
  INITIAL_FUENTES,
  INITIAL_MOTIVOS_PERDIDA,
  INITIAL_INDUSTRIAS,
  INITIAL_MIEMBROS,
} from '../lib/mockData';
import { supabase, isSupabaseConfigured, isModoDemo } from '../lib/supabase';
import { parseSupabaseError } from '../lib/errorHandler';
import { normalizarDominio } from '../lib/formatters';
import { useAuth } from './AuthContext';

interface CRMContextType {
  // Entidades principales
  empresas: Empresa[];
  contactos: Contacto[];
  accesosAdmin: Record<string, AccesosAdminMarketing>;
  oportunidades: VOportunidad[];
  etapas: Etapa[];
  plantilla: PlantillaCalificacion | null;
  criterios: CriterioCalificacion[];
  calificaciones: Record<string, VCalificacionOportunidad>;
  actividades: Actividad[];
  tareas: Tarea[];
  fuentes: CatalogoItem[];
  motivosPerdida: CatalogoItem[];
  industrias: CatalogoItem[];
  miembros: Miembro[];

  // Vistas para gráficos
  graficoPipeline: VPipelinePorEtapa[];
  graficoFuentes: VOportunidadesPorFuente[];
  graficoMotivos: VMotivosPerdida[];

  // KPIs
  kpis: KPIsDashboard;
  filtroAlcance: 'mis_datos' | 'todo_el_equipo';
  setFiltroAlcance: (val: 'mis_datos' | 'todo_el_equipo') => void;

  // Estado de carga y error
  isLoading: boolean;
  errorMensaje: string | null;
  limpiarError: () => void;
  refetchTodo: () => Promise<void>;

  // Mutaciones Oportunidades (sin recalcular en cliente, refetch obligatorio)
  moverOportunidadEtapa: (
    oportunidadId: string,
    nuevaEtapaId: string,
    motivoPerdidaId?: string,
    motivoDetalle?: string
  ) => Promise<void>;
  crearOportunidad: (datos: Partial<Oportunidad>) => Promise<Oportunidad | null>;
  actualizarProximaAccion: (oportunidadId: string, accion: string, fecha: string) => Promise<void>;
  archivarOportunidad: (oportunidadId: string) => Promise<void>;

  // Calificación
  evaluarCriterio: (
    oportunidadId: string,
    criterioId: string,
    valor: string,
    excepcion?: { motivo: string; fechaRevision: string }
  ) => Promise<void>;
  cargarCalificacionOportunidad: (oportunidadId: string) => Promise<VCalificacionOportunidad | null>;

  // Empresas & Contactos
  crearEmpresa: (datos: Partial<Empresa>) => Promise<Empresa | null>;
  actualizarEmpresa: (empresaId: string, datos: Partial<Empresa>) => Promise<void>;
  archivarEmpresa: (empresaId: string) => Promise<void>;
  actualizarAccesosAdmin: (empresaId: string, accesos: Partial<AccesosAdminMarketing>) => Promise<void>;
  crearContacto: (datos: Partial<Contacto>) => Promise<Contacto | null>;
  actualizarContacto: (contactoId: string, datos: Partial<Contacto>) => Promise<void>;
  archivarContacto: (contactoId: string) => Promise<void>;

  // Actividades & Tareas
  registrarActividad: (datos: Omit<Actividad, 'id' | 'created_at' | 'autor_id'>) => Promise<void>;
  crearTarea: (datos: Omit<Tarea, 'id' | 'created_at'>) => Promise<void>;
  toggleTareaCompletada: (tareaId: string, completadaActual: boolean) => Promise<void>;
  actualizarTarea: (tareaId: string, datos: Partial<Tarea>) => Promise<void>;

  // Administración
  crearMiembro: (email: string, nombre: string, rol: 'admin' | 'miembro') => Promise<void>;
  actualizarRolMiembro: (miembroId: string, nuevoRol: 'admin' | 'miembro') => Promise<void>;
  desactivarMiembro: (miembroId: string, reasignarAId: string) => Promise<void>;
  activarMiembro: (miembroId: string) => Promise<void>;
  guardarEtapa: (etapaId: string, cambios: Partial<Etapa>) => Promise<string | null>;
  crearEtapa: (nombre: string, probabilidad: number) => Promise<string | null>;
  reordenarEtapas: (idsOrdenados: string[]) => Promise<string | null>;
  guardarCriterioPlantilla: (criterio: Partial<CriterioCalificacion>) => Promise<void>;
  agregarItemCatalogo: (tipo: 'fuentes' | 'motivos' | 'industrias', nombre: string) => Promise<void>;
  actualizarItemCatalogo: (tipo: 'fuentes' | 'motivos' | 'industrias', id: string, datos: Partial<CatalogoItem>) => Promise<void>;

  // Importación CSV relacional
  importarCSVRelacional: (
    filas: Array<{
      dominioWeb?: string;
      nombreEmpresa: string;
      rutEmpresa?: string;
      nombreContacto?: string;
      apellidoContacto?: string;
      emailContacto?: string;
      cargoContacto?: string;
      telefonoContacto?: string;
    }>
  ) => Promise<{
    empresasCreadas: number;
    contactosCreados: number;
    duplicadosSaltados: number;
    erroresPorFila: Array<{ fila: number; error: string }>;
  }>;
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

export const CRMProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useAuth();
  const [filtroAlcance, setFiltroAlcance] = useState<'mis_datos' | 'todo_el_equipo'>('todo_el_equipo');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);

  // Estados en memoria (NUNCA en localStorage)
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [accesosAdmin, setAccesosAdmin] = useState<Record<string, AccesosAdminMarketing>>({});
  const [oportunidades, setOportunidades] = useState<VOportunidad[]>([]);
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [plantilla, setPlantilla] = useState<PlantillaCalificacion | null>(null);
  const [criterios, setCriterios] = useState<CriterioCalificacion[]>([]);
  const [calificaciones, setCalificaciones] = useState<Record<string, VCalificacionOportunidad>>({});
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [fuentes, setFuentes] = useState<CatalogoItem[]>([]);
  const [motivosPerdida, setMotivosPerdida] = useState<CatalogoItem[]>([]);
  const [industrias, setIndustrias] = useState<CatalogoItem[]>([]);
  const [miembros, setMiembros] = useState<Miembro[]>([]);

  // Vistas de gráficos
  const [graficoPipeline, setGraficoPipeline] = useState<VPipelinePorEtapa[]>([]);
  const [graficoFuentes, setGraficoFuentes] = useState<VOportunidadesPorFuente[]>([]);
  const [graficoMotivos, setGraficoMotivos] = useState<VMotivosPerdida[]>([]);

  // KPIs
  const [kpis, setKpis] = useState<KPIsDashboard>({
    pipeline_ponderado_total: 0,
    oportunidades_abiertas_count: 0,
    seguimientos_atrasados_count: 0,
    tareas_hoy_count: 0,
    mrr_clientes_activos: 0,
  });

  const limpiarError = () => setErrorMensaje(null);

  // Refetch completo desde Supabase
  const refetchTodo = useCallback(async () => {
    if (isSupabaseConfigured && supabase) {
      setIsLoading(true);
      try {
        // 1. Cargar miembros siempre para mostrar responsables
        const { data: dbMiembros } = await supabase.from('miembros').select('*').order('nombre');
        if (dbMiembros) setMiembros(dbMiembros as Miembro[]);

        // 2. Cargar catálogos y etapas
        const [
          { data: dbEtapas },
          { data: dbFuentes },
          { data: dbIndustrias },
          { data: dbMotivos },
          { data: dbPlantilla },
          { data: dbCriterios },
        ] = await Promise.all([
          supabase.from('etapas').select('*').order('orden'),
          supabase.from('fuentes').select('*').order('orden'),
          supabase.from('industrias').select('*').order('orden'),
          supabase.from('motivos_perdida').select('*').order('orden'),
          supabase.from('plantillas_calificacion').select('*').eq('activa', true).maybeSingle(),
          supabase.from('criterios_calificacion').select('*').order('orden'),
        ]);

        if (dbEtapas) setEtapas(dbEtapas as Etapa[]);
        if (dbFuentes) setFuentes(dbFuentes as CatalogoItem[]);
        if (dbIndustrias) setIndustrias(dbIndustrias as CatalogoItem[]);
        if (dbMotivos) setMotivosPerdida(dbMotivos as CatalogoItem[]);
        if (dbPlantilla) setPlantilla(dbPlantilla as PlantillaCalificacion);
        if (dbCriterios) setCriterios(dbCriterios as CriterioCalificacion[]);

        // 3. Cargar empresas y contactos (sin archivados)
        const [{ data: dbEmpresas }, { data: dbContactos }, { data: dbAccesos }] =
          await Promise.all([
            supabase.from('empresas').select('*').eq('archivado', false).order('nombre'),
            supabase.from('contactos').select('*').eq('archivado', false).order('nombre'),
            supabase.from('accesos_admin_marketing').select('*'),
          ]);

        if (dbEmpresas) setEmpresas(dbEmpresas as Empresa[]);
        if (dbContactos) setContactos(dbContactos as Contacto[]);
        if (dbAccesos) {
          const accMap: Record<string, AccesosAdminMarketing> = {};
          (dbAccesos as AccesosAdminMarketing[]).forEach((a) => {
            accMap[a.empresa_id] = a;
          });
          setAccesosAdmin(accMap);
        }

        // 4. Cargar vista v_oportunidades (valores y estados calculados por la base)
        const { data: dbVOportunidades } = await supabase
          .from('v_oportunidades')
          .select('*')
          .eq('archivado', false)
          .order('created_at', { ascending: false });

        if (dbVOportunidades) setOportunidades(dbVOportunidades as VOportunidad[]);

        // 5. Cargar actividades y tareas
        const [{ data: dbActividades }, { data: dbTareas }] = await Promise.all([
          supabase.from('actividades').select('*').order('fecha_actividad', { ascending: false }).limit(100),
          supabase.from('tareas').select('*').order('fecha_vencimiento', { ascending: true }),
        ]);

        if (dbActividades) setActividades(dbActividades as Actividad[]);
        if (dbTareas) setTareas(dbTareas as Tarea[]);

        // 6. Cargar vistas para gráficos
        const [
          { data: dbPipeView },
          { data: dbFuentesView },
          { data: dbMotivosView },
        ] = await Promise.all([
          supabase.from('v_pipeline_por_etapa').select('*').order('orden'),
          supabase.from('v_oportunidades_por_fuente').select('*'),
          supabase.from('v_motivos_perdida').select('*'),
        ]);

        if (dbPipeView) setGraficoPipeline(dbPipeView as VPipelinePorEtapa[]);
        if (dbFuentesView) setGraficoFuentes(dbFuentesView as VOportunidadesPorFuente[]);
        if (dbMotivosView) setGraficoMotivos(dbMotivosView as VMotivosPerdida[]);

        // 7. Cargar KPIs vía RPC
        const soloMios = filtroAlcance === 'mis_datos';
        const { data: dbKpis, error: errKpis } = await supabase.rpc('kpis_dashboard', {
          p_solo_mios: soloMios,
        });

        if (dbKpis && !errKpis) {
          setKpis((Array.isArray(dbKpis) ? dbKpis[0] : dbKpis) as KPIsDashboard);
        }
      } catch (err) {
        setErrorMensaje(parseSupabaseError(err));
      } finally {
        setIsLoading(false);
      }
    } else if (isModoDemo) {
      // Modo demo fallback exclusivo para previsualización cuando VITE_MODO_DEMO=true
      setMiembros(INITIAL_MIEMBROS);
      setEtapas(INITIAL_ETAPAS as Etapa[]);
      setFuentes(INITIAL_FUENTES);
      setIndustrias(INITIAL_INDUSTRIAS);
      setMotivosPerdida(INITIAL_MOTIVOS_PERDIDA);
      setPlantilla(INITIAL_PLANTILLA);
      setCriterios(INITIAL_PLANTILLA.criterios || []);
      setEmpresas(INITIAL_EMPRESAS as Empresa[]);
      setContactos(INITIAL_CONTACTOS as Contacto[]);
      setOportunidades(INITIAL_OPORTUNIDADES);
      setActividades(INITIAL_ACTIVIDADES as Actividad[]);
      setTareas(INITIAL_TAREAS as Tarea[]);
      const accMap: Record<string, AccesosAdminMarketing> = {};
      INITIAL_ACCESOS.forEach((a) => {
        accMap[a.empresa_id] = a as any;
      });
      setAccesosAdmin(accMap);
      setKpis({
        pipeline_ponderado_total: 62200000,
        oportunidades_abiertas_count: 3,
        seguimientos_atrasados_count: 1,
        tareas_hoy_count: 1,
        mrr_clientes_activos: 8000000,
      });
    }
  }, [filtroAlcance]);

  useEffect(() => {
    refetchTodo();
  }, [refetchTodo]);

  // Refetch KPIs al cambiar filtro de alcance
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    async function cargarKpis() {
      const { data, error } = await supabase!.rpc('kpis_dashboard', {
        p_solo_mios: filtroAlcance === 'mis_datos',
      });
      if (data && !error) setKpis((Array.isArray(data) ? data[0] : data) as KPIsDashboard);
    }

    cargarKpis();
  }, [filtroAlcance]);

  // MUTACIÓN: Mover etapa de oportunidad (REGLA: NUNCA enviar valor_ponderado)
  // Tras mover, refetch de la fila desde v_oportunidades
  const moverOportunidadEtapa = async (
    oportunidadId: string,
    nuevaEtapaId: string,
    motivoPerdidaId?: string,
    motivoDetalle?: string
  ) => {
    if (!supabase) {
      if (isModoDemo) {
        setOportunidades((prev) =>
          prev.map((o) => (o.id === oportunidadId ? { ...o, etapa_id: nuevaEtapaId } : o))
        );
      }
      return;
    }

    const payload: Partial<Oportunidad> = {
      etapa_id: nuevaEtapaId,
    };

    if (motivoPerdidaId) {
      payload.motivo_perdida_id = motivoPerdidaId;
      payload.motivo_perdida_detalle = motivoDetalle || null;
    }

    const { error } = await supabase.from('oportunidades').update(payload).eq('id', oportunidadId);

    if (error) {
      setErrorMensaje(parseSupabaseError(error));
      return;
    }

    // Refetch obligatorio de la fila desde la vista v_oportunidades y empresas
    const [{ data: opRefetch }, { data: dbEmpresas }] = await Promise.all([
      supabase.from('v_oportunidades').select('*').eq('id', oportunidadId).single(),
      supabase.from('empresas').select('*').eq('archivado', false),
    ]);

    if (opRefetch) {
      setOportunidades((prev) =>
        prev.map((o) => (o.id === oportunidadId ? (opRefetch as VOportunidad) : o))
      );
    }
    if (dbEmpresas) {
      setEmpresas(dbEmpresas as Empresa[]);
    }

    // Actualizar KPIs
    const { data: kpisData } = await supabase.rpc('kpis_dashboard', {
      p_solo_mios: filtroAlcance === 'mis_datos',
    });
    if (kpisData) setKpis((Array.isArray(kpisData) ? kpisData[0] : kpisData) as KPIsDashboard);
  };

  const crearOportunidad = async (datos: Partial<Oportunidad>): Promise<Oportunidad | null> => {
    if (!supabase) {
      if (isModoDemo) {
        const mockOp: VOportunidad = {
          id: `op-demo-${Date.now()}`,
          nombre: datos.nombre || '',
          empresa_id: datos.empresa_id || '',
          etapa_id: datos.etapa_id || etapas[0]?.id || '',
          moneda: datos.moneda || 'CLP',
          valor_neto: datos.valor_neto || 0,
          probabilidad: datos.probabilidad || 20,
          valor_ponderado: Math.round((datos.valor_neto || 0) * 0.2),
          estado_seguimiento: 'al_dia',
          proxima_accion_texto: datos.proxima_accion_texto || null,
          proxima_accion_fecha: datos.proxima_accion_fecha || null,
        } as any;
        setOportunidades((prev) => [mockOp, ...prev]);
        return mockOp;
      }
      return null;
    }

    // NUNCA incluir valor_ponderado
    const { valor_ponderado, ...datosLimpios } = datos as any;

    const { data, error } = await supabase
      .from('oportunidades')
      .insert(datosLimpios)
      .select()
      .single();

    if (error) {
      setErrorMensaje(parseSupabaseError(error));
      return null;
    }

    // Refetch desde v_oportunidades
    const { data: vistaOp } = await supabase
      .from('v_oportunidades')
      .select('*')
      .eq('id', data.id)
      .single();

    if (vistaOp) {
      setOportunidades((prev) => [vistaOp as VOportunidad, ...prev]);
    }

    return data as Oportunidad;
  };

  const actualizarProximaAccion = async (oportunidadId: string, accion: string, fecha: string) => {
    if (!supabase) {
      if (isModoDemo) {
        setOportunidades((prev) =>
          prev.map((o) =>
            o.id === oportunidadId
              ? { ...o, proxima_accion_texto: accion, proxima_accion_fecha: fecha }
              : o
          )
        );
      }
      return;
    }

    const { error } = await supabase
      .from('oportunidades')
      .update({
        proxima_accion_texto: accion,
        proxima_accion_fecha: fecha,
      })
      .eq('id', oportunidadId);

    if (error) {
      setErrorMensaje(parseSupabaseError(error));
      return;
    }

    // Refetch desde vista
    const { data } = await supabase.from('v_oportunidades').select('*').eq('id', oportunidadId).single();
    if (data) {
      setOportunidades((prev) =>
        prev.map((o) => (o.id === oportunidadId ? (data as VOportunidad) : o))
      );
    }
  };

  const archivarOportunidad = async (oportunidadId: string) => {
    if (!supabase) {
      if (isModoDemo) {
        setOportunidades((prev) => prev.filter((o) => o.id !== oportunidadId));
      }
      return;
    }

    const { error } = await supabase
      .from('oportunidades')
      .update({ archivado: true })
      .eq('id', oportunidadId);

    if (error) {
      setErrorMensaje(parseSupabaseError(error));
      return;
    }

    setOportunidades((prev) => prev.filter((o) => o.id !== oportunidadId));
  };

  // CALIFICACIÓN: Upsert en evaluaciones_oportunidad (NO enviar puntaje_obtenido)
  const evaluarCriterio = async (
    oportunidadId: string,
    criterioId: string,
    valor: string,
    excepcion?: { motivo: string; fechaRevision: string }
  ) => {
    if (!supabase) return;

    const payload: EvaluacionOportunidad = {
      oportunidad_id: oportunidadId,
      criterio_id: criterioId,
      valor_respuesta: valor,
      excepcion_aplicada: Boolean(excepcion),
      motivo_excepcion: excepcion?.motivo || null,
      fecha_revision_excepcion: excepcion?.fechaRevision || null,
    };

    const { error } = await supabase
      .from('evaluaciones_oportunidad')
      .upsert(payload, { onConflict: 'oportunidad_id,criterio_id' });

    if (error) {
      setErrorMensaje(parseSupabaseError(error));
      return;
    }

    // Refetch de la vista v_calificacion_oportunidad
    await cargarCalificacionOportunidad(oportunidadId);
  };

  const cargarCalificacionOportunidad = async (
    oportunidadId: string
  ): Promise<VCalificacionOportunidad | null> => {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('v_calificacion_oportunidad')
      .select('*')
      .eq('oportunidad_id', oportunidadId)
      .maybeSingle();

    if (error) {
      setErrorMensaje(parseSupabaseError(error));
      return null;
    }

    if (data) {
      setCalificaciones((prev) => ({
        ...prev,
        [oportunidadId]: data as VCalificacionOportunidad,
      }));
      return data as VCalificacionOportunidad;
    }

    return null;
  };

  // EMPRESAS & CONTACTOS
  const crearEmpresa = async (datos: Partial<Empresa>): Promise<Empresa | null> => {
    if (!supabase) {
      if (isModoDemo) {
        const mockEmp: Empresa = {
          id: `emp-demo-${Date.now()}`,
          nombre: datos.nombre || '',
          rut: datos.rut || null,
          dominio_web: normalizarDominio(datos.dominio_web),
          industria_id: datos.industria_id || null,
          tamano: datos.tamano || null,
          estado: datos.estado || 'prospecto',
          plan: datos.plan || null,
          salud: datos.salud || null,
          responsable_id: datos.responsable_id || null,
          archivado: false,
        };
        setEmpresas((prev) => [mockEmp, ...prev]);
        return mockEmp;
      }
      return null;
    }

    const { data, error } = await supabase
      .from('empresas')
      .insert({
        ...datos,
        dominio_web: normalizarDominio(datos.dominio_web) || null,
        archivado: false,
      })
      .select()
      .single();

    if (error) {
      setErrorMensaje(parseSupabaseError(error));
      return null;
    }

    setEmpresas((prev) => [data as Empresa, ...prev]);
    return data as Empresa;
  };

  const actualizarEmpresa = async (empresaId: string, datos: Partial<Empresa>) => {
    if (!supabase) return;

    const { error } = await supabase.from('empresas').update(datos).eq('id', empresaId);

    if (error) {
      setErrorMensaje(parseSupabaseError(error));
      return;
    }

    // Refetch de la empresa
    const { data } = await supabase.from('empresas').select('*').eq('id', empresaId).single();
    if (data) {
      setEmpresas((prev) => prev.map((e) => (e.id === empresaId ? (data as Empresa) : e)));
    }
  };

  const archivarEmpresa = async (empresaId: string) => {
    if (!supabase) return;

    const { error } = await supabase.from('empresas').update({ archivado: true }).eq('id', empresaId);

    if (error) {
      setErrorMensaje(parseSupabaseError(error));
      return;
    }

    setEmpresas((prev) => prev.filter((e) => e.id !== empresaId));
  };

  // Upsert en accesos_admin_marketing por empresa_id
  const actualizarAccesosAdmin = async (
    empresaId: string,
    accesos: Partial<AccesosAdminMarketing>
  ) => {
    const anterior = accesosAdmin[empresaId] ?? {
      empresa_id: empresaId,
      google_ads: false,
      ga4: false,
      meta_bm: false,
      gtm_cmp: false,
      notas_accesos: null,
    };

    const payload: AccesosAdminMarketing = {
      ...anterior,
      ...accesos,
      empresa_id: empresaId,
    };

    if (supabase) {
      const { error } = await supabase
        .from('accesos_admin_marketing')
        .upsert(payload, { onConflict: 'empresa_id' });

      if (error) {
        setErrorMensaje(parseSupabaseError(error));
        return;
      }
    }

    setAccesosAdmin((prev) => ({ ...prev, [empresaId]: payload }));
  };

  const crearContacto = async (datos: Partial<Contacto>): Promise<Contacto | null> => {
    const payload = {
      ...datos,
      email: datos.email?.trim().toLowerCase() || '',
      archivado: false,
    };

    if (!supabase) {
      if (isModoDemo) {
        const mockCon = { id: `con-demo-${Date.now()}`, ...payload } as Contacto;
        setContactos((prev) => [mockCon, ...prev]);
        return mockCon;
      }
      return null;
    }

    const { data, error } = await supabase.from('contactos').insert(payload).select().single();

    if (error) {
      setErrorMensaje(parseSupabaseError(error));
      return null;
    }

    setContactos((prev) => [data as Contacto, ...prev]);
    return data as Contacto;
  };

  const actualizarContacto = async (contactoId: string, datos: Partial<Contacto>) => {
    const payload = {
      ...datos,
      email: datos.email?.trim().toLowerCase() ?? undefined,
    };
    // No se reescriben identificadores ni la marca de archivo desde el formulario
    delete (payload as Partial<Contacto>).id;
    delete (payload as Partial<Contacto>).archivado;
    delete (payload as Partial<Contacto>).created_at;

    if (!supabase) {
      if (isModoDemo) {
        setContactos((prev) => prev.map((c) => (c.id === contactoId ? { ...c, ...payload } as Contacto : c)));
      }
      return;
    }

    const { error } = await supabase.from('contactos').update(payload).eq('id', contactoId);

    if (error) {
      setErrorMensaje(parseSupabaseError(error));
      return;
    }

    setContactos((prev) => prev.map((c) => (c.id === contactoId ? ({ ...c, ...payload } as Contacto) : c)));
  };

  const archivarContacto = async (contactoId: string) => {
    if (!supabase) return;

    const { error } = await supabase.from('contactos').update({ archivado: true }).eq('id', contactoId);

    if (error) {
      setErrorMensaje(parseSupabaseError(error));
      return;
    }

    setContactos((prev) => prev.filter((c) => c.id !== contactoId));
  };

  // ACTIVIDADES & TAREAS (el autor lo asigna la base)
  const registrarActividad = async (datos: Omit<Actividad, 'id' | 'created_at' | 'autor_id'>) => {
    if (!supabase) {
      if (isModoDemo) {
        const mockAct: Actividad = {
          id: `act-demo-${Date.now()}`,
          ...datos,
          autor_id: miembros[0]?.id || 'm-1',
          created_at: new Date().toISOString(),
        };
        setActividades((prev) => [mockAct, ...prev]);
      }
      return;
    }

    const { error } = await supabase.from('actividades').insert(datos);

    if (error) {
      setErrorMensaje(parseSupabaseError(error));
      return;
    }

    const { data } = await supabase
      .from('actividades')
      .select('*')
      .order('fecha_actividad', { ascending: false })
      .limit(100);

    if (data) setActividades(data as Actividad[]);
  };

  const crearTarea = async (datos: Omit<Tarea, 'id' | 'created_at'>) => {
    if (!supabase) {
      if (isModoDemo) {
        const mockTar: Tarea = {
          id: `tar-demo-${Date.now()}`,
          ...datos,
          created_at: new Date().toISOString(),
        };
        setTareas((prev) => [mockTar, ...prev]);
      }
      return;
    }

    const { error } = await supabase.from('tareas').insert(datos);

    if (error) {
      setErrorMensaje(parseSupabaseError(error));
      return;
    }

    const { data } = await supabase.from('tareas').select('*').order('fecha_vencimiento', { ascending: true });
    if (data) setTareas(data as Tarea[]);
  };

  const toggleTareaCompletada = async (tareaId: string, completadaActual: boolean) => {
    const completada = !completadaActual;

    if (!supabase) {
      if (isModoDemo) {
        setTareas((prev) =>
          prev.map((t) =>
            t.id === tareaId
              ? {
                  ...t,
                  completada,
                  fecha_completada: completada ? new Date().toISOString() : null,
                }
              : t
          )
        );
      }
      return;
    }

    const { error } = await supabase
      .from('tareas')
      .update({
        completada,
        fecha_completada: completada ? new Date().toISOString() : null,
      })
      .eq('id', tareaId);

    if (error) {
      setErrorMensaje(parseSupabaseError(error));
      return;
    }

    setTareas((prev) =>
      prev.map((t) => (t.id === tareaId ? { ...t, completada } : t))
    );
  };

  const actualizarTarea = async (tareaId: string, datos: Partial<Tarea>) => {
    if (!supabase) {
      if (isModoDemo) setTareas((prev) => prev.map((t) => (t.id === tareaId ? { ...t, ...datos } : t)));
      return;
    }
    const { error } = await supabase.from('tareas').update(datos).eq('id', tareaId);
    if (error) {
      setErrorMensaje(parseSupabaseError(error));
      return;
    }
    const { data } = await supabase.from('tareas').select('*').order('fecha_vencimiento', { ascending: true });
    if (data) setTareas(data as Tarea[]);
  };

  // ADMINISTRACIÓN: Miembros, Roles, Desactivación por RPC y Catálogos
  const crearMiembro = async (email: string, nombre: string, rol: 'admin' | 'miembro') => {
    const emailNorm = email.trim().toLowerCase();
    const nombreNorm = nombre.trim();

    if (!supabase) {
      if (isModoDemo) {
        const nuevoM: Miembro = {
          id: `m-demo-${Date.now()}`,
          email: emailNorm,
          nombre: nombreNorm,
          rol,
          activo: true,
          created_at: new Date().toISOString(),
        };
        setMiembros((prev) => [...prev, nuevoM]);
      }
      return;
    }

    const { error } = await supabase.from('miembros').insert({
      email: emailNorm,
      nombre: nombreNorm,
      rol,
      activo: true,
    });

    if (error) {
      setErrorMensaje(parseSupabaseError(error));
      return;
    }

    const { data } = await supabase.from('miembros').select('*').order('nombre');
    if (data) setMiembros(data as Miembro[]);
  };

  const actualizarRolMiembro = async (miembroId: string, nuevoRol: 'admin' | 'miembro') => {
    if (!supabase) {
      if (isModoDemo) {
        setMiembros((prev) =>
          prev.map((m) => (m.id === miembroId ? { ...m, rol: nuevoRol } : m))
        );
      }
      return;
    }

    const { error } = await supabase.from('miembros').update({ rol: nuevoRol }).eq('id', miembroId);

    if (error) {
      setErrorMensaje(parseSupabaseError(error));
      return;
    }

    setMiembros((prev) =>
      prev.map((m) => (m.id === miembroId ? { ...m, rol: nuevoRol } : m))
    );
  };

  // ETAPAS DEL PIPELINE (admin escribe; miembros leen)
  const refrescarEtapas = async (): Promise<void> => {
    if (!supabase) return;
    const { data } = await supabase.from('etapas').select('*').order('orden');
    if (data) setEtapas(data as Etapa[]);
  };

  const guardarEtapa = async (etapaId: string, cambios: Partial<Etapa>): Promise<string | null> => {
    if (!supabase) return null;
    const { error } = await supabase.from('etapas').update(cambios).eq('id', etapaId);
    if (error) return parseSupabaseError(error);
    await refrescarEtapas();
    return null;
  };

  const crearEtapa = async (nombre: string, probabilidad: number): Promise<string | null> => {
    if (!supabase) return null;
    const siguiente = Math.max(0, ...etapas.filter((e) => !e.es_ganada && !e.es_perdida).map((e) => e.orden)) + 1;
    const { error } = await supabase.from('etapas').insert({
      nombre, orden: siguiente, probabilidad_default: probabilidad, color: '#888888', es_ganada: false, es_perdida: false, activa: true,
    });
    if (error) return parseSupabaseError(error);
    await refrescarEtapas();
    return null;
  };

  // Reordena con dos pasos para no chocar con cualquier restricción de unicidad en `orden`
  const reordenarEtapas = async (idsOrdenados: string[]): Promise<string | null> => {
    if (!supabase) return null;
    for (const [i, id] of idsOrdenados.entries()) {
      const { error } = await supabase.from('etapas').update({ orden: 1000 + i }).eq('id', id);
      if (error) return parseSupabaseError(error);
    }
    for (const [i, id] of idsOrdenados.entries()) {
      const { error } = await supabase.from('etapas').update({ orden: i + 1 }).eq('id', id);
      if (error) return parseSupabaseError(error);
    }
    await refrescarEtapas();
    return null;
  };

  const desactivarMiembro = async (miembroId: string, reasignarAId: string) => {
    if (!supabase) {
      if (isModoDemo) {
        setMiembros((prev) =>
          prev.map((m) => (m.id === miembroId ? { ...m, activo: false } : m))
        );
        setOportunidades((prev) =>
          prev.map((o) => (o.responsable_id === miembroId ? { ...o, responsable_id: reasignarAId } : o))
        );
        setEmpresas((prev) =>
          prev.map((e) => (e.responsable_id === miembroId ? { ...e, responsable_id: reasignarAId } : e))
        );
      }
      return;
    }

    const { error } = await supabase.rpc('desactivar_miembro', {
      p_miembro: miembroId,
      p_reasignar_a: reasignarAId,
    });

    if (error) {
      setErrorMensaje(parseSupabaseError(error));
      return;
    }

    // Refetch de miembros, empresas y oportunidades
    await refetchTodo();
  };

  const activarMiembro = async (miembroId: string) => {
    if (!supabase) {
      if (isModoDemo) {
        setMiembros((prev) =>
          prev.map((m) => (m.id === miembroId ? { ...m, activo: true } : m))
        );
      }
      return;
    }

    const { error } = await supabase.from('miembros').update({ activo: true }).eq('id', miembroId);

    if (error) {
      setErrorMensaje(parseSupabaseError(error));
      return;
    }

    setMiembros((prev) =>
      prev.map((m) => (m.id === miembroId ? { ...m, activo: true } : m))
    );
  };

  const guardarCriterioPlantilla = async (criterio: Partial<CriterioCalificacion>) => {
    if (!plantilla) return;

    if (!supabase) {
      if (isModoDemo) {
        if (criterio.id) {
          setCriterios((prev) =>
            prev.map((c) => (c.id === criterio.id ? ({ ...c, ...criterio } as CriterioCalificacion) : c))
          );
        } else {
          const nuevoCrit: CriterioCalificacion = {
            id: `crit-demo-${Date.now()}`,
            plantilla_id: plantilla.id,
            orden: criterios.length + 1,
            pregunta: criterio.pregunta || '',
            tipo: criterio.tipo || 'si_no',
            peso: criterio.peso || 10,
            es_eliminatorio: Boolean(criterio.es_eliminatorio),
          };
          setCriterios((prev) => [...prev, nuevoCrit]);
        }
      }
      return;
    }

    const payload = {
      ...criterio,
      plantilla_id: plantilla.id,
    };

    const { error } = criterio.id
      ? await supabase.from('criterios_calificacion').update(payload).eq('id', criterio.id)
      : await supabase.from('criterios_calificacion').insert(payload);

    if (error) {
      setErrorMensaje(parseSupabaseError(error));
      return;
    }

    const { data } = await supabase
      .from('criterios_calificacion')
      .select('*')
      .eq('plantilla_id', plantilla.id)
      .order('orden');

    if (data) setCriterios(data as CriterioCalificacion[]);
  };

  const agregarItemCatalogo = async (tipo: 'fuentes' | 'motivos' | 'industrias', nombre: string) => {
    const listaActual = tipo === 'fuentes' ? fuentes : tipo === 'motivos' ? motivosPerdida : industrias;
    const nuevoOrden = listaActual.length + 1;
    const nombreTrim = nombre.trim();

    if (!supabase) {
      if (isModoDemo) {
        const nuevo: CatalogoItem = {
          id: `${tipo}-demo-${Date.now()}`,
          nombre: nombreTrim,
          orden: nuevoOrden,
          activo: true,
        };
        if (tipo === 'fuentes') setFuentes((prev) => [...prev, nuevo]);
        if (tipo === 'motivos') setMotivosPerdida((prev) => [...prev, nuevo]);
        if (tipo === 'industrias') setIndustrias((prev) => [...prev, nuevo]);
      }
      return;
    }

    const tabla = tipo === 'fuentes' ? 'fuentes' : tipo === 'motivos' ? 'motivos_perdida' : 'industrias';

    const { error } = await supabase.from(tabla).insert({
      nombre: nombreTrim,
      activo: true,
      orden: nuevoOrden,
    });

    if (error) {
      setErrorMensaje(parseSupabaseError(error));
      return;
    }

    const { data } = await supabase.from(tabla).select('*').order('orden');
    if (data) {
      if (tipo === 'fuentes') setFuentes(data as CatalogoItem[]);
      if (tipo === 'motivos') setMotivosPerdida(data as CatalogoItem[]);
      if (tipo === 'industrias') setIndustrias(data as CatalogoItem[]);
    }
  };

  const actualizarItemCatalogo = async (
    tipo: 'fuentes' | 'motivos' | 'industrias',
    id: string,
    datos: Partial<CatalogoItem>
  ) => {
    if (!supabase) {
      if (isModoDemo) {
        const updater = (prev: CatalogoItem[]) =>
          prev.map((i) => (i.id === id ? { ...i, ...datos } : i));
        if (tipo === 'fuentes') setFuentes(updater);
        if (tipo === 'motivos') setMotivosPerdida(updater);
        if (tipo === 'industrias') setIndustrias(updater);
      }
      return;
    }

    const tabla = tipo === 'fuentes' ? 'fuentes' : tipo === 'motivos' ? 'motivos_perdida' : 'industrias';

    const { error } = await supabase.from(tabla).update(datos).eq('id', id);

    if (error) {
      setErrorMensaje(parseSupabaseError(error));
      return;
    }

    const { data } = await supabase.from(tabla).select('*').order('orden');
    if (data) {
      if (tipo === 'fuentes') setFuentes(data as CatalogoItem[]);
      if (tipo === 'motivos') setMotivosPerdida(data as CatalogoItem[]);
      if (tipo === 'industrias') setIndustrias(data as CatalogoItem[]);
    }
  };

  // IMPORTACIÓN CSV RELACIONAL EN 2 PASOS (CON DEDUPLICACIÓN Y DETALLE DE ERRORES POR FILA)
  const importarCSVRelacional = async (
    filas: Array<{
      dominioWeb?: string;
      nombreEmpresa: string;
      rutEmpresa?: string;
      nombreContacto?: string;
      apellidoContacto?: string;
      emailContacto?: string;
      cargoContacto?: string;
      telefonoContacto?: string;
    }>
  ) => {
    let empresasCreadas = 0;
    let contactosCreados = 0;
    let duplicadosSaltados = 0;
    const erroresPorFila: Array<{ fila: number; error: string }> = [];

    if (!supabase) {
      return {
        empresasCreadas: filas.length,
        contactosCreados: filas.filter((f) => f.emailContacto).length,
        duplicadosSaltados: 0,
        erroresPorFila: [],
      };
    }

    // 1. Agrupar dominios normalizados del archivo antes de consultar
    const mapaEmpresasArchivo = new Map<string, typeof filas[0]>();
    filas.forEach((f) => {
      const dom = normalizarDominio(f.dominioWeb);
      const clave = dom || f.nombreEmpresa.trim().toLowerCase();
      if (!mapaEmpresasArchivo.has(clave)) {
        mapaEmpresasArchivo.set(clave, f);
      }
    });

    // 2. Consultar empresas existentes por dominio o nombre
    const { data: dbEmpresasExistentes } = await supabase
      .from('empresas')
      .select('id, nombre, dominio_web');

    const mapaDbEmpresas = new Map<string, string>(); // dominio -> empresa_id
    dbEmpresasExistentes?.forEach((e) => {
      if (e.dominio_web) mapaDbEmpresas.set(normalizarDominio(e.dominio_web), e.id);
      mapaDbEmpresas.set(e.nombre.trim().toLowerCase(), e.id);
    });

    // 3. Consultar contactos existentes por email
    const { data: dbContactosExistentes } = await supabase
      .from('contactos')
      .select('email, empresa_id');
    const setContactosExistentes = new Set<string>();
    dbContactosExistentes?.forEach((c) => {
      if (c.email) setContactosExistentes.add(`${c.email.toLowerCase()}::${c.empresa_id}`);
    });

    // 4. Procesar empresas en lotes de 100 (NUNCA sobrescribe existentes)
    const empresasNuevasParaInsertar: Array<{
      nombre: string;
      rut?: string | null;
      dominio_web?: string | null;
      estado: 'prospecto';
      archivado: false;
    }> = [];

    mapaEmpresasArchivo.forEach((f, clave) => {
      if (!mapaDbEmpresas.has(clave)) {
        empresasNuevasParaInsertar.push({
          nombre: f.nombreEmpresa.trim(),
          rut: f.rutEmpresa?.trim() || null,
          dominio_web: normalizarDominio(f.dominioWeb) || null,
          estado: 'prospecto',
          archivado: false,
        });
      }
    });

    // Insertar en lotes de 100
    for (let i = 0; i < empresasNuevasParaInsertar.length; i += 100) {
      const lote = empresasNuevasParaInsertar.slice(i, i + 100);
      const { data: creadas, error: errEmp } = await supabase
        .from('empresas')
        .insert(lote)
        .select('id, nombre, dominio_web');

      if (errEmp) {
        erroresPorFila.push({ fila: i + 1, error: parseSupabaseError(errEmp) });
      } else if (creadas) {
        empresasCreadas += creadas.length;
        creadas.forEach((c) => {
          if (c.dominio_web) mapaDbEmpresas.set(normalizarDominio(c.dominio_web), c.id);
          mapaDbEmpresas.set(c.nombre.trim().toLowerCase(), c.id);
        });
      }
    }

    // 5. Procesar contactos asociados en lotes de 100
    const contactosNuevosParaInsertar: Array<{
      empresa_id: string;
      nombre: string;
      apellido?: string | null;
      email: string;
      cargo?: string | null;
      telefono?: string | null;
      es_principal: boolean;
      archivado: false;
    }> = [];

    filas.forEach((f, idx) => {
      const dom = normalizarDominio(f.dominioWeb);
      const clave = dom || f.nombreEmpresa.trim().toLowerCase();
      const empId = mapaDbEmpresas.get(clave);

      if (!empId) {
        erroresPorFila.push({
          fila: idx + 2,
          error: `No se pudo vincular el cliente "${f.nombreEmpresa}".`,
        });
        return;
      }

      const emailNorm = f.emailContacto?.trim().toLowerCase();
      if (!emailNorm) return;

      const claveContacto = `${emailNorm}::${empId}`;
      if (setContactosExistentes.has(claveContacto)) {
        duplicadosSaltados++;
        return;
      }

      contactosNuevosParaInsertar.push({
        empresa_id: empId,
        nombre: f.nombreContacto?.trim() || 'Contacto',
        apellido: f.apellidoContacto?.trim() || null,
        email: emailNorm,
        cargo: f.cargoContacto?.trim() || null,
        telefono: f.telefonoContacto?.trim() || null,
        es_principal: true,
        archivado: false,
      });

      setContactosExistentes.add(claveContacto);
    });

    for (let i = 0; i < contactosNuevosParaInsertar.length; i += 100) {
      const lote = contactosNuevosParaInsertar.slice(i, i + 100);
      const { data: creados, error: errCon } = await supabase
        .from('contactos')
        .insert(lote)
        .select('id');

      if (errCon) {
        erroresPorFila.push({ fila: i + 1, error: parseSupabaseError(errCon) });
      } else if (creados) {
        contactosCreados += creados.length;
      }
    }

    // Refetch de datos actualizados
    await refetchTodo();

    return {
      empresasCreadas,
      contactosCreados,
      duplicadosSaltados,
      erroresPorFila,
    };
  };

  return (
    <CRMContext.Provider
      value={{
        empresas,
        contactos,
        accesosAdmin,
        oportunidades,
        etapas,
        plantilla,
        criterios,
        calificaciones,
        actividades,
        tareas,
        fuentes,
        motivosPerdida,
        industrias,
        miembros,
        graficoPipeline,
        graficoFuentes,
        graficoMotivos,
        kpis,
        filtroAlcance,
        setFiltroAlcance,
        isLoading,
        errorMensaje,
        limpiarError,
        refetchTodo,
        moverOportunidadEtapa,
        crearOportunidad,
        actualizarProximaAccion,
        archivarOportunidad,
        evaluarCriterio,
        cargarCalificacionOportunidad,
        crearEmpresa,
        actualizarEmpresa,
        archivarEmpresa,
        actualizarAccesosAdmin,
        crearContacto,
        actualizarContacto,
        archivarContacto,
        registrarActividad,
        crearTarea,
        toggleTareaCompletada,
        actualizarTarea,
        crearMiembro,
        actualizarRolMiembro,
        desactivarMiembro,
        activarMiembro,
        guardarEtapa,
        crearEtapa,
        reordenarEtapas,
        guardarCriterioPlantilla,
        agregarItemCatalogo,
        actualizarItemCatalogo,
        importarCSVRelacional,
      }}
    >
      {children}
    </CRMContext.Provider>
  );
};

export const useCRM = () => {
  const ctx = useContext(CRMContext);
  if (!ctx) {
    throw new Error('useCRM debe usarse dentro de CRMProvider');
  }
  return ctx;
};
