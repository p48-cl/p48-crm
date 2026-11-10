import React, { useEffect, useState } from 'react';
import {
  X,
  ExternalLink,
  Folder,
  Plus,
  Archive,
  Phone,
  Mail,
  Linkedin,
  Check,
} from 'lucide-react';
import { Empresa, AccesosAdminMarketing, Tarea } from '../types/crm';
import { useCRM } from '../context/CRMContext';
import { formatCLP, formatFecha, formatMoneda, formatRUT, formatTelefonoCL } from '../lib/formatters';
import { ClientePanel } from '../components/clientes/ClientePanel';
import { CotizacionesCliente } from '../components/clientes/CotizacionesCliente';
import { DatosFacturacion } from '../components/clientes/DatosFacturacion';
import { CuentasCliente } from '../components/clientes/CuentasCliente';
import { SubirLogo } from '../components/clientes/Logo';
import { FichaMarketing } from '../components/marketing/FichaMarketing';
import { EstrategiaEditor, ResumenEstrategia } from '../components/clientes/EstrategiaCliente';
import { useConfiguracionCRM } from '../lib/configuracion';
import { FranjaDecision, TonoFranja } from '../components/common/FranjaDecision';

type Tab = 'resumen' | 'contactos' | 'oportunidades' | 'actividades' | 'tareas' | 'cotizaciones' | 'estrategia' | 'marketing' | 'info' | 'cliente';

interface CompanyDetailDrawerProps {
  empresa: Empresa | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectOportunidad: (id: string) => void;
  onOpenNewActivity: (empresaId: string) => void;
  onOpenNewTask: (empresaId: string) => void;
  onEditTask: (t: Tarea) => void;
  tabInicial?: Tab;
  iniciarNuevaCotizacion?: boolean;
  onNuevaCotizacionUsada?: () => void;
}

// Enlace editable: solo acepta http(s) o vacío. Guarda al salir del campo.
const EnlaceEditable: React.FC<{ valor?: string | null; placeholder: string; onGuardar: (url: string | null) => void }> = ({ valor, placeholder, onGuardar }) => {
  const [texto, setTexto] = useState(valor ?? '');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setTexto(valor ?? ''); setError(null); }, [valor]);

  const guardar = () => {
    const limpio = texto.trim();
    if (limpio === (valor ?? '')) return;
    if (limpio && !/^https?:\/\/\S+$/i.test(limpio)) {
      setError('Debe empezar con https://');
      return;
    }
    setError(null);
    onGuardar(limpio || null);
  };

  return (
    <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
      <input
        type="url"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={guardar}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full min-w-0 max-w-[180px] bg-[var(--c-field)] border border-[var(--c-line)] rounded px-2 py-1 text-[11px] text-[var(--c-text)] font-mono"
      />
      {valor && !error && (
        <a href={valor} target="_blank" rel="noopener noreferrer" aria-label="Abrir enlace" className="shrink-0 text-[var(--c-accent)]">
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}
      {error && <span className="text-[10px] text-[var(--c-danger)] shrink-0">{error}</span>}
    </div>
  );
};

export const CompanyDetailDrawer: React.FC<CompanyDetailDrawerProps> = ({
  empresa,
  isOpen,
  onClose,
  onSelectOportunidad,
  onOpenNewActivity,
  onOpenNewTask,
  onEditTask,
  tabInicial,
  iniciarNuevaCotizacion,
  onNuevaCotizacionUsada,
}) => {
  const {
    contactos,
    oportunidades,
    actividades,
    tareas,
    accesosAdmin,
    actualizarAccesosAdmin,
    archivarEmpresa,
    actualizarEmpresa,
    toggleTareaCompletada,
    crearContacto,
    miembros,
    industrias,
  } = useCRM();
  const { config: cfg } = useConfiguracionCRM();
  const DIAS_ALERTA_RENOVACION = cfg.dias_alerta_renovacion;
  const DIAS_SIN_ACTIVIDAD = cfg.dias_sin_actividad;

  const [activeTab, setActiveTab] = useState<Tab>('resumen');

  useEffect(() => {
    if (isOpen) setActiveTab(tabInicial ?? 'resumen');
  }, [isOpen, empresa?.id, tabInicial]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState<{
    nombre: string;
    apellido: string;
    cargo: string;
    email: string;
    telefono: string;
    linkedin_url: string;
    rol_decision: 'decisor' | 'influenciador' | 'usuario';
    es_principal: boolean;
  }>({
    nombre: '',
    apellido: '',
    cargo: '',
    email: '',
    telefono: '',
    linkedin_url: '',
    rol_decision: 'decisor',
    es_principal: false,
  });

  if (!isOpen || !empresa) return null;

  const accesos: AccesosAdminMarketing = accesosAdmin[empresa.id] ?? {
    empresa_id: empresa.id,
    google_ads: false,
    ga4: false,
    meta_bm: false,
    gtm_cmp: false,
    notas_accesos: '',
  };

  const contactosEmpresa = contactos.filter((c) => c.empresa_id === empresa.id && !c.archivado);
  const oportunidadesEmpresa = oportunidades.filter((o) => o.empresa_id === empresa.id && !o.archivado);
  const actividadesEmpresa = actividades.filter((a) => a.empresa_id === empresa.id);
  const tareasEmpresa = tareas.filter((t) => t.empresa_id === empresa.id);
  const industria = industrias.find((i) => i.id === empresa.industria_id);
  const responsable = miembros.find((m) => m.id === empresa.responsable_id);

  const hoyMs = Date.now();
  const diasRenov = empresa.fecha_renovacion
    ? Math.ceil((new Date(empresa.fecha_renovacion).getTime() - hoyMs) / 86400000)
    : null;
  const tareasPendientes = tareasEmpresa
    .filter((t) => !t.completada)
    .sort((a, b) => (a.fecha_vencimiento || '').localeCompare(b.fecha_vencimiento || ''));
  const tareasAtrasadas = tareasPendientes.filter((t) => t.fecha_vencimiento && new Date(t.fecha_vencimiento).getTime() < hoyMs - 86400000);
  const ultimaActividad = actividadesEmpresa.reduce<number | null>((max, a) => {
    const ts = new Date(a.fecha_actividad).getTime();
    return max === null || ts > max ? ts : max;
  }, null);
  const diasSinActividad = ultimaActividad === null ? null : Math.floor((hoyMs - ultimaActividad) / 86400000);
  const saludEtiqueta: Record<string, { texto: string; tono: TonoFranja }> = {
    verde: { texto: 'Saludable', tono: 'ok' },
    amarillo: { texto: 'En alerta', tono: 'warn' },
    rojo: { texto: 'En riesgo', tono: 'danger' },
  };
  const salud = empresa.salud ? saludEtiqueta[empresa.salud] : null;

  // Riesgos y oportunidades derivados de datos reales (no se inventan señales)
  const riesgos: { texto: string; tono: 'alerta' | 'info' }[] = [];
  if (diasRenov !== null && diasRenov <= DIAS_ALERTA_RENOVACION) {
    riesgos.push({
      texto: diasRenov < 0 ? `Renovación vencida hace ${-diasRenov} días` : `Renovación en ${diasRenov} días`,
      tono: 'alerta',
    });
  }
  if (empresa.salud === 'rojo' || empresa.salud === 'amarillo') {
    riesgos.push({ texto: `Salud de cuenta: ${salud?.texto ?? ''}`, tono: 'alerta' });
  }
  if (tareasAtrasadas.length > 0) {
    riesgos.push({ texto: `${tareasAtrasadas.length} tarea(s) atrasada(s)`, tono: 'alerta' });
  }
  if (diasSinActividad === null || diasSinActividad > DIAS_SIN_ACTIVIDAD) {
    riesgos.push({
      texto: diasSinActividad === null ? 'Sin actividad registrada' : `Sin actividad hace ${diasSinActividad} días`,
      tono: 'info',
    });
  }
  if (empresa.estado === 'cliente' && oportunidadesEmpresa.length === 0) {
    riesgos.push({ texto: 'Sin negocio abierto de renovación o expansión', tono: 'info' });
  }

  // Acción principal del encabezado según la pestaña activa
  const accionPrincipal: { label: string; onClick: () => void } | null =
    activeTab === 'contactos'
      ? { label: '+ Contacto', onClick: () => setShowAddContact(true) }
      : activeTab === 'actividades'
      ? { label: '+ Actividad', onClick: () => onOpenNewActivity(empresa.id) }
      : activeTab === 'tareas'
      ? { label: '+ Tarea', onClick: () => onOpenNewTask(empresa.id) }
      : null;

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.nombre || !newContact.email) return;

    await crearContacto({
      empresa_id: empresa.id,
      ...newContact,
    });

    setNewContact({
      nombre: '',
      apellido: '',
      cargo: '',
      email: '',
      telefono: '',
      linkedin_url: '',
      rol_decision: 'decisor',
      es_principal: false,
    });
    setShowAddContact(false);
  };

  const handleArchive = async () => {
    if (window.confirm(`¿Seguro que deseas archivar ${empresa.nombre}? Puedes desarchivarlo más tarde.`)) {
      await archivarEmpresa(empresa.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-stretch sm:items-center justify-center sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-[var(--c-bg)] w-full max-w-5xl h-dvh sm:h-auto sm:max-h-[92dvh] sm:rounded-xl min-h-0 border border-[var(--c-line)] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 p-4 sm:p-5 border-b border-[var(--c-line)] bg-[var(--c-surface)] flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <SubirLogo empresaId={empresa.id} nombre={empresa.nombre} logoPath={empresa.logo_path} size={48} />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[var(--c-text)]">
                  {empresa.nombre}
                </h2>
                <span className={`font-mono text-[10px] uppercase px-2 py-0.5 rounded-full border border-[var(--c-line)] ${empresa.estado === 'cliente' ? 'text-[var(--c-ok)]' : 'text-[var(--c-muted)]'}`}>
                  {empresa.estado === 'cliente' ? 'Cliente activo' : empresa.estado}
                </span>
                {empresa.plan && (
                  <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded-full bg-[var(--c-surface-3)] text-[var(--c-text-2)]">
                    Plan {empresa.plan}
                  </span>
                )}
                {empresa.salud && (
                  <span className="flex items-center gap-1 font-mono text-[10px] uppercase text-[var(--c-muted)]">
                    <span className={`w-2 h-2 rounded-full ${empresa.salud === 'verde' ? 'bg-[var(--c-ok)]' : empresa.salud === 'amarillo' ? 'bg-[var(--c-warn)]' : 'bg-[var(--c-danger)]'}`} />
                    {empresa.salud}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-[var(--c-muted)] mt-0.5 font-mono">
                {empresa.rut && <span>RUT {formatRUT(empresa.rut)}</span>}
                {empresa.dominio_web && (
                  <>
                    <span>·</span>
                    <a
                      href={`https://${empresa.dominio_web}`}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-[var(--c-accent)] underline"
                    >
                      {empresa.dominio_web}
                    </a>
                  </>
                )}
                {industria && (
                  <>
                    <span>·</span>
                    <span>{industria.nombre}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {accionPrincipal && (
              <button
                onClick={accionPrincipal.onClick}
                className="text-xs text-[var(--c-on-accent)] bg-[var(--c-accent)] hover:bg-[var(--c-accent-hover)] px-3 py-1.5 rounded font-medium transition-colors"
              >
                {accionPrincipal.label}
              </button>
            )}
            <button
              onClick={handleArchive}
              className="p-1.5 text-[var(--c-muted)] hover:text-[var(--c-danger)] hover:bg-[var(--c-surface-3)] rounded transition-colors"
              title="Archivar empresa"
            >
              <Archive className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[var(--c-muted)] hover:text-[var(--c-text)] hover:bg-[var(--c-surface-3)] rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Franja de decisión: visible en todas las pestañas */}
        <div className="shrink-0"><FranjaDecision
          items={[
            { etiqueta: 'Salud de cuenta', valor: salud ? salud.texto : 'Sin definir', tonoValor: salud?.tono ?? 'muted' },
            {
              etiqueta: 'MRR contratado',
              valor: empresa.mrr_actual_clp ? formatCLP(empresa.mrr_actual_clp) : 'Sin MRR',
              mono: true,
            },
            {
              etiqueta: 'Próxima renovación',
              valor: empresa.fecha_renovacion ? formatFecha(empresa.fecha_renovacion) : 'Sin fecha',
              mono: true,
              nota:
                diasRenov !== null && diasRenov <= DIAS_ALERTA_RENOVACION
                  ? diasRenov < 0
                    ? `vencida hace ${-diasRenov} d`
                    : `quedan ${diasRenov} d`
                  : null,
              tonoNota: 'warn',
            },
            { etiqueta: 'Responsable', valor: responsable ? responsable.nombre : 'Sin asignar' },
          ]}
        /></div>

        {/* Navigation Tabs */}
        <div className="shrink-0 px-5 border-b border-[var(--c-line)] bg-[var(--c-surface)] flex flex-nowrap overflow-x-auto gap-x-4 sm:gap-x-5 text-xs font-medium [scrollbar-width:none]">
          {(
            [
              { id: 'resumen' as const, label: 'Resumen' },
              { id: 'contactos' as const, label: `Contactos (${contactosEmpresa.length})` },
              { id: 'oportunidades' as const, label: `Negocios (${oportunidadesEmpresa.length})` },
              { id: 'actividades' as const, label: 'Actividad' },
              { id: 'tareas' as const, label: `Tareas (${tareasPendientes.length})` },
              { id: 'cotizaciones' as const, label: 'Cotizaciones' },
              { id: 'estrategia' as const, label: 'Estrategia' },
              ...(empresa.estado === 'cliente' ? [{ id: 'marketing' as const, label: 'Marketing' }] : []),
              { id: 'info' as const, label: 'Contrato y datos' },
              ...(empresa.estado === 'cliente' ? [{ id: 'cliente' as const, label: 'Portal y activos' }] : []),
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === tab.id
                  ? 'border-[var(--c-accent)] text-[var(--c-accent)]'
                  : 'border-transparent text-[var(--c-muted)] hover:text-[var(--c-text-2)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-6">
          {/* TAB RESUMEN: revisión rápida antes de una reunión o para priorizar */}
          {activeTab === 'resumen' && (
            <div className="grid grid-cols-[minmax(0,1fr)] xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] gap-5 items-start">
              <div className="space-y-5">
                <ResumenEstrategia empresaId={empresa.id} onVerTodo={() => setActiveTab('estrategia')} />
                <div className="ficha-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold text-[var(--c-text)]">Prioridades abiertas</h3>
                    <button onClick={() => setActiveTab('tareas')} className="text-[11px] text-[var(--c-accent)] hover:underline">
                      Ver tareas
                    </button>
                  </div>
                  {tareasPendientes.length === 0 ? (
                    <p className="text-xs text-[var(--c-muted)] py-3 text-center">Sin tareas pendientes para esta cuenta.</p>
                  ) : (
                    <div className="space-y-2">
                      {tareasPendientes.slice(0, 3).map((t) => {
                        const atrasada = !!t.fecha_vencimiento && new Date(t.fecha_vencimiento).getTime() < hoyMs - 86400000;
                        return (
                          <div key={t.id} className="flex items-center justify-between gap-3 p-3 bg-[var(--c-field)] rounded-lg border border-[var(--c-line)] text-xs">
                            <span className="font-medium text-[var(--c-text)] truncate">{t.titulo}</span>
                            <span className={`shrink-0 font-mono text-[10px] ${atrasada ? 'text-[var(--c-danger)]' : 'text-[var(--c-muted)]'}`}>
                              {atrasada ? 'Atrasada' : t.fecha_vencimiento ? formatFecha(t.fecha_vencimiento) : 'Sin fecha'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="ficha-card p-4">
                  <h3 className="text-xs font-semibold text-[var(--c-text)] mb-3">Riesgos y oportunidades</h3>
                  {riesgos.length === 0 ? (
                    <p className="text-xs text-[var(--c-muted)] py-3 text-center">Sin alertas abiertas.</p>
                  ) : (
                    <div className="space-y-2">
                      {riesgos.map((r) => (
                        <div key={r.texto} className="flex items-start gap-2.5 text-xs text-[var(--c-text-2)]">
                          <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${r.tono === 'alerta' ? 'bg-[var(--c-warn)]' : 'bg-[var(--c-info)]'}`} />
                          <span>{r.texto}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-5">
                <div className="ficha-card p-4 space-y-3">
                  <h3 className="text-xs font-semibold text-[var(--c-text)]">Perfil comercial</h3>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-[10px] font-mono uppercase text-[var(--c-muted)]">Plan</p>
                      <p className="text-[var(--c-text)] mt-0.5">{empresa.plan ? (empresa.plan === 'personalizado' ? 'Personalizado' : `Plan ${empresa.plan}`) : 'Sin plan'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono uppercase text-[var(--c-muted)]">Renovación</p>
                      <p className="text-[var(--c-text)] mt-0.5">{empresa.renovacion_tipo === 'automatica' ? 'Automática' : 'Manual'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono uppercase text-[var(--c-muted)]">Fee mensual</p>
                      <p className="font-mono text-[var(--c-text)] mt-0.5">{empresa.fee_mensual_clp ? formatCLP(empresa.fee_mensual_clp) : '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono uppercase text-[var(--c-muted)]">Contactos</p>
                      <p className="font-mono text-[var(--c-text)] mt-0.5">{contactosEmpresa.length}</p>
                    </div>
                  </div>
                </div>

                <div className="ficha-card p-4 space-y-3">
                  <h3 className="text-xs font-semibold text-[var(--c-text)]">Enlaces rápidos</h3>
                  <div className="p-3 bg-[var(--c-field)] rounded-lg border border-[var(--c-line)] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <ExternalLink className="w-4 h-4 shrink-0 text-[var(--c-accent)]" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[var(--c-text)]">Dashboard Looker</p>
                        <p className="text-[10px] text-[var(--c-muted)] font-mono">Reportes de performance</p>
                      </div>
                    </div>
                    <EnlaceEditable
                      valor={empresa.looker_dashboard_url}
                      placeholder="Pegar URL de Looker Studio"
                      onGuardar={(url) => actualizarEmpresa(empresa.id, { looker_dashboard_url: url })}
                    />
                  </div>
                  <div className="p-3 bg-[var(--c-field)] rounded-lg border border-[var(--c-line)] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Folder className="w-4 h-4 shrink-0 text-[var(--c-info)]" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[var(--c-text)]">Carpeta Drive</p>
                        <p className="text-[10px] text-[var(--c-muted)] font-mono">Estrategia, creativos y contratos</p>
                      </div>
                    </div>
                    <EnlaceEditable
                      valor={empresa.drive_folder_url}
                      placeholder="Pegar URL de carpeta Drive"
                      onGuardar={(url) => actualizarEmpresa(empresa.id, { drive_folder_url: url })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTRATO Y DATOS: administrativo, legal y facturable */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* Parámetros Comerciales & Operativos */}
              <div className="ficha-card p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-[var(--c-text)]">Contrato y estado</h3>
                  <span className="text-[10px] font-mono text-[var(--c-muted)]">Lo que define la relación</span>
                </div>

                <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--c-muted)] -mb-1">Estado</p>
                <div className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] text-[var(--c-muted)] mb-1">Estado del cliente</label>
                    <select
                      value={empresa.estado}
                      onChange={(e) => actualizarEmpresa(empresa.id, { estado: e.target.value as any })}
                      className="w-full bg-[var(--c-field)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)]"
                    >
                      <option value="prospecto">Prospecto</option>
                      <option value="cliente">Cliente activo</option>
                      <option value="ex_cliente">Ex cliente</option>
                      <option value="descartado">Descartado</option>
                      <option value="proveedor">Proveedor</option>
                      <option value="interno">Interno</option>
                      <option value="archivado">Archivado</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-[var(--c-muted)] mb-1">Plan Contratado</label>
                    <select
                      value={empresa.plan || ''}
                      onChange={(e) => actualizarEmpresa(empresa.id, { plan: (e.target.value as any) || null })}
                      className="w-full bg-[var(--c-field)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)]"
                    >
                      <option value="">Sin plan</option>
                      <option value="A">Plan A</option>
                      <option value="B">Plan B</option>
                      <option value="C">Plan C</option>
                      <option value="D">Plan D</option>
                      <option value="E">Plan E</option>
                      <option value="personalizado">Personalizado</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-[var(--c-muted)] mb-1">Salud de Cuenta</label>
                    <select
                      value={empresa.salud || ''}
                      onChange={(e) => actualizarEmpresa(empresa.id, { salud: (e.target.value as any) || null })}
                      className="w-full bg-[var(--c-field)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)]"
                    >
                      <option value="">Sin definir</option>
                      <option value="verde">Verde (Saludable)</option>
                      <option value="amarillo">Amarillo (Alerta)</option>
                      <option value="rojo">Rojo (Riesgo)</option>
                    </select>
                  </div>
                </div>

                <div className="h-px bg-[var(--c-line)]" />
                <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--c-muted)] -mb-1">Económico</p>
                <div className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] text-[var(--c-muted)] mb-1">Fee Mensual (CLP)</label>
                    <input
                      type="number"
                      value={empresa.fee_mensual_clp ?? ''}
                      onChange={(e) =>
                        actualizarEmpresa(empresa.id, {
                          fee_mensual_clp: e.target.value ? Number(e.target.value) : null,
                          
                        })
                      }
                      placeholder="Ej: 1500000"
                      className="w-full bg-[var(--c-field)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)] font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-[var(--c-muted)] mb-1">Setup Fee (CLP)</label>
                    <input
                      type="number"
                      value={empresa.setup_fee_clp ?? ''}
                      onChange={(e) =>
                        actualizarEmpresa(empresa.id, {
                          setup_fee_clp: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      placeholder="Ej: 800000"
                      className="w-full bg-[var(--c-field)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)] font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-[var(--c-muted)] mb-1">Fecha Renovación</label>
                    <input
                      type="date"
                      value={empresa.fecha_renovacion ? empresa.fecha_renovacion.slice(0, 10) : ''}
                      onChange={(e) =>
                        actualizarEmpresa(empresa.id, {
                          fecha_renovacion: e.target.value || null,
                        })
                      }
                      className="w-full bg-[var(--c-field)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)] font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-[var(--c-muted)] mb-1">Tipo de renovación</label>
                    <select
                      value={empresa.renovacion_tipo || 'manual'}
                      onChange={(e) => actualizarEmpresa(empresa.id, { renovacion_tipo: e.target.value as 'manual' | 'automatica' })}
                      className="w-full bg-[var(--c-field)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)]"
                    >
                      <option value="manual">Manual (se renueva con firma)</option>
                      <option value="automatica">Automática</option>
                    </select>
                  </div>
                </div>

                <div className="h-px bg-[var(--c-line)]" />
                <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--c-muted)] -mb-1">Responsable</p>
                <div className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] text-[var(--c-muted)] mb-1">Responsable Comercial</label>
                    <select
                      value={empresa.responsable_id || ''}
                      onChange={(e) =>
                        actualizarEmpresa(empresa.id, {
                          responsable_id: e.target.value || null,
                        })
                      }
                      className="w-full bg-[var(--c-field)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)]"
                    >
                      <option value="">Sin asignar</option>
                      {miembros.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nombre} ({m.rol})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-[var(--c-muted)] mb-1">MRR calculado (automático)</label>
                    <div className="px-3 py-1.5 bg-[var(--c-surface)] rounded border border-[var(--c-line)] font-mono text-xs text-[var(--c-accent)]">
                      {empresa.mrr_actual_clp ? formatCLP(empresa.mrr_actual_clp) : '—'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)] xl:grid-cols-2 gap-6 items-start">
              {/* Datos legales y tributarios */}
              <DatosFacturacion empresa={empresa} onGuardar={(c) => actualizarEmpresa(empresa.id, c)} />

              <div className="space-y-6">
              {/* Cuentas y permisos del cliente (registro por plataforma) */}
              <CuentasCliente
                empresaId={empresa.id}
                notas={accesos.notas_accesos || ''}
                onNotas={(v) => actualizarAccesosAdmin(empresa.id, { notas_accesos: v })}
              />
              </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONTACTOS */}
          {activeTab === 'contactos' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-[var(--c-text)]">Personas de Contacto</h3>
                <button
                  onClick={() => setShowAddContact(!showAddContact)}
                  className="text-xs text-[var(--c-on-accent)] bg-[var(--c-accent)] hover:bg-[var(--c-accent-hover)] px-2.5 py-1 rounded font-medium flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nuevo Contacto</span>
                </button>
              </div>

              {showAddContact && (
                <form
                  onSubmit={handleCreateContact}
                  className="p-4 ficha-card rounded-xl border border-[var(--c-line)] space-y-3"
                >
                  <div className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Nombre *"
                      value={newContact.nombre}
                      onChange={(e) => setNewContact({ ...newContact, nombre: e.target.value })}
                      required
                      className="bg-[var(--c-field)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)]"
                    />
                    <input
                      type="text"
                      placeholder="Apellido"
                      value={newContact.apellido}
                      onChange={(e) => setNewContact({ ...newContact, apellido: e.target.value })}
                      className="bg-[var(--c-field)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)]"
                    />
                  </div>
                  <div className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-2 gap-2">
                    <input
                      type="email"
                      placeholder="Email corporativo *"
                      value={newContact.email}
                      onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                      required
                      className="bg-[var(--c-field)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)]"
                    />
                    <input
                      type="text"
                      placeholder="Cargo (ej: Head of Growth)"
                      value={newContact.cargo}
                      onChange={(e) => setNewContact({ ...newContact, cargo: e.target.value })}
                      className="bg-[var(--c-field)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)]"
                    />
                  </div>
                  <div className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Celular +569"
                      value={newContact.telefono}
                      onChange={(e) => setNewContact({ ...newContact, telefono: formatTelefonoCL(e.target.value) })}
                      className="bg-[var(--c-field)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)]"
                    />
                    <input
                      type="text"
                      placeholder="URL de LinkedIn"
                      value={newContact.linkedin_url}
                      onChange={(e) => setNewContact({ ...newContact, linkedin_url: e.target.value })}
                      className="bg-[var(--c-field)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[var(--c-text-2)] mb-1">Rol de Decisión</label>
                    <select
                      value={newContact.rol_decision}
                      onChange={(e) =>
                        setNewContact({
                          ...newContact,
                          rol_decision: e.target.value as 'decisor' | 'influenciador' | 'usuario',
                        })
                      }
                      className="w-full bg-[var(--c-field)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)]"
                    >
                      <option value="decisor">Decisor (Presupuesto y firma)</option>
                      <option value="influenciador">Influenciador (Líder técnico)</option>
                      <option value="usuario">Usuario (Equipo de medios)</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddContact(false)}
                      className="px-2.5 py-1 text-xs text-[var(--c-muted)] hover:text-[var(--c-text)]"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 text-xs font-semibold bg-[var(--c-accent)] text-black rounded"
                    >
                      Guardar Contacto
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-2">
                {contactosEmpresa.length === 0 ? (
                  <p className="text-xs text-[var(--c-muted)] py-4 text-center">No hay contactos registrados.</p>
                ) : (
                  contactosEmpresa.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 bg-[var(--c-field)] rounded-lg border border-[var(--c-line)] flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-medium text-[var(--c-text)]">
                            {c.nombre} {c.apellido}
                          </p>
                          <span
                            className={`font-mono text-[10px] px-1.5 py-0.2 rounded capitalize ${
                              c.rol_decision === 'decisor'
                                ? 'bg-[var(--c-accent)]/15 text-[var(--c-accent)]'
                                : c.rol_decision === 'influenciador'
                                ? 'bg-[var(--c-info)]/10 text-[var(--c-info)]'
                                : 'bg-[var(--c-surface-2)] text-[var(--c-text-2)]'
                            }`}
                          >
                            {c.rol_decision || 'decisor'}
                          </span>
                          {c.es_principal && (
                            <span className="text-[10px] text-[var(--c-accent)] font-mono">
                              Principal
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--c-muted)]">{c.cargo || 'Sin cargo'}</p>
                        <div className="flex items-center gap-3 text-xs text-[var(--c-muted)] mt-1 font-mono">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-[var(--c-muted)]" />
                            <a href={`mailto:${c.email}`} className="hover:text-[var(--c-text)]">
                              {c.email}
                            </a>
                          </span>
                          {c.telefono && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-[var(--c-muted)]" />
                              <a href={`tel:${(c.telefono ?? '').replace(/\s/g, '')}`} className="hover:text-[var(--c-text)]">
                                {c.telefono}
                              </a>
                            </span>
                          )}
                        </div>
                      </div>

                      {c.linkedin_url && (
                        <a
                          href={c.linkedin_url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-[var(--c-muted)] hover:text-[var(--c-accent)] transition-colors"
                        >
                          <Linkedin className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: OPORTUNIDADES */}
          {activeTab === 'oportunidades' && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-[var(--c-text)]">Historial de Negocios</h3>
              {oportunidadesEmpresa.length === 0 ? (
                <p className="text-xs text-[var(--c-muted)] py-4 text-center">Sin oportunidades asociadas.</p>
              ) : (
                oportunidadesEmpresa.map((op) => (
                  <button
                    key={op.id}
                    onClick={() => {
                      onClose();
                      onSelectOportunidad(op.id);
                    }}
                    className="w-full text-left p-3 bg-[var(--c-surface-2)] hover:bg-[var(--c-surface-3)] rounded border border-[var(--c-line)] flex items-center justify-between transition-colors"
                  >
                    <div>
                      <p className="text-xs font-medium text-[var(--c-text)]">{op.nombre}</p>
                      <p className="text-[11px] text-[var(--c-muted)] font-mono">
                        Cierre estimado: {formatFecha(op.fecha_cierre_estimada)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-xs text-[var(--c-accent)] font-bold">
                        {formatMoneda(op.valor_neto, op.moneda)}
                      </p>
                      <p className="text-[10px] text-[var(--c-muted)] font-mono">
                        Ponderado: {formatMoneda(op.valor_ponderado, op.moneda)}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* TAB 4: ACTIVIDADES */}
          {activeTab === 'actividades' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-[var(--c-text)]">Línea de Tiempo</h3>
                <button
                  onClick={() => onOpenNewActivity(empresa.id)}
                  className="text-xs text-[var(--c-on-accent)] bg-[var(--c-accent)] hover:bg-[var(--c-accent-hover)] px-2.5 py-1 rounded font-medium flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Registrar</span>
                </button>
              </div>

              {actividadesEmpresa.length === 0 ? (
                <p className="text-xs text-[var(--c-muted)] py-4 text-center">No hay actividades registradas.</p>
              ) : (
                <div className="space-y-3">
                  {actividadesEmpresa.map((act) => {
                    const autor = miembros.find((m) => m.id === act.autor_id);
                    return (
                      <div
                        key={act.id}
                        className="p-3 bg-[var(--c-field)] rounded-lg border border-[var(--c-line)] text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[var(--c-text)] capitalize">
                            {act.tipo}: {act.titulo}
                          </span>
                          <span className="font-mono text-[10px] text-[var(--c-muted)]">
                            {formatFecha(act.fecha_actividad)}
                          </span>
                        </div>
                        <p className="text-[var(--c-text-2)]">{act.descripcion}</p>
                        {act.resultado && (
                          <p className="text-[var(--c-accent)] text-[11px]">Resultado: {act.resultado}</p>
                        )}
                        <p className="text-[10px] text-[var(--c-muted-2)] font-mono">
                          Registrado por {autor?.nombre ?? 'Equipo'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: TAREAS */}
          {activeTab === 'tareas' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-[var(--c-text)]">Tareas</h3>
                <button
                  onClick={() => onOpenNewTask(empresa.id)}
                  className="text-xs text-[var(--c-on-accent)] bg-[var(--c-accent)] hover:bg-[var(--c-accent-hover)] px-2.5 py-1 rounded font-medium flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Crear Tarea</span>
                </button>
              </div>

              {tareasEmpresa.length === 0 ? (
                <p className="text-xs text-[var(--c-muted)] py-4 text-center">Sin tareas pendientes para esta empresa.</p>
              ) : (
                <div className="space-y-2">
                  {tareasEmpresa.map((tar) => (
                    <div
                      key={tar.id}
                      className="p-3 bg-[var(--c-field)] rounded-lg border border-[var(--c-line)] flex items-center justify-between gap-3 text-xs"
                    >
                      <button
                        type="button"
                        onClick={() => toggleTareaCompletada(tar.id, tar.completada)}
                        aria-label={tar.completada ? 'Marcar como pendiente' : 'Marcar como completada'}
                        aria-pressed={tar.completada}
                        className="shrink-0 w-5 h-5 rounded border border-[var(--c-line)] flex items-center justify-center hover:border-[var(--c-accent)]"
                      >
                        {tar.completada && <Check className="w-3.5 h-3.5 text-[var(--c-accent)]" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <button
                          type="button"
                          onClick={() => onEditTask(tar)}
                          aria-label={`Editar tarea ${tar.titulo}`}
                          className={`text-left font-medium hover:underline ${
                            tar.completada ? 'line-through text-[var(--c-muted)]' : 'text-[var(--c-text)]'
                          }`}
                        >
                          {tar.titulo}
                        </button>
                        <p className="text-[11px] font-mono text-[var(--c-muted)]">
                          Vence: {formatFecha(tar.fecha_vencimiento)}
                          {!tar.completada && tar.fecha_vencimiento && new Date(tar.fecha_vencimiento).getTime() < hoyMs - 86400000 && (
                            <span className="ml-2 text-[var(--c-danger)]">· Atrasada</span>
                          )}
                        </p>
                      </div>
                      <span
                        className={`font-mono text-[10px] ${
                          tar.prioridad === 'alta' ? 'text-[var(--c-danger)]' : 'text-[var(--c-muted)]'
                        }`}
                      >
                        {tar.prioridad.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {activeTab === 'cotizaciones' && (
            <CotizacionesCliente empresa={empresa} iniciarNueva={!!iniciarNuevaCotizacion} onNuevaUsada={onNuevaCotizacionUsada} />
          )}
          {activeTab === 'estrategia' && <EstrategiaEditor empresaId={empresa.id} nombreCliente={empresa.nombre} />}
          {activeTab === 'marketing' && empresa.estado === 'cliente' && <FichaMarketing empresaId={empresa.id} />}
          {activeTab === 'cliente' && empresa.estado === 'cliente' && (
            <ClientePanel empresaId={empresa.id} />
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--c-line)] bg-[var(--c-surface-2)] flex items-center justify-between text-xs text-[var(--c-muted)]">
          <span className="font-mono text-[11px]">ID: {empresa.id}</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-[var(--c-surface-2)] hover:bg-[var(--c-line)] text-[var(--c-text)] rounded transition-colors"
          >
            Cerrar Ficha
          </button>
        </div>
      </div>
    </div>
  );
};
