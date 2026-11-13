import React, { useEffect, useState } from 'react';
import { SALUD_ETIQUETA } from '../lib/salud';
import { X, ExternalLink, Folder, Plus, Archive, Phone, Mail, Linkedin, Check, Pencil } from 'lucide-react';
import { Empresa, AccesosAdminMarketing, Tarea } from '../types/crm';
import { useCRM } from '../context/CRMContext';
import { formatCLP, formatFecha, formatMoneda, formatRUT, formatTelefonoCL } from '../lib/formatters';
import { ClientePanel } from '../components/clientes/ClientePanel';
import { CotizacionesCliente } from '../components/clientes/CotizacionesCliente';
import { DatosFacturacion } from '../components/clientes/DatosFacturacion';
import { FacturasCliente } from '../components/clientes/FacturasCliente';
import { ActivityModal } from '../components/common/ActivityModal';
import { NewDealModal } from '../components/common/NewDealModal';
import type { Actividad } from '../types/crm';
import { CuentasCliente } from '../components/clientes/CuentasCliente';
import { SubirLogo } from '../components/clientes/Logo';
import { MarketingFicha } from '../components/marketing/MarketingFicha';
import { EstrategiaCard, ResumenEstrategia } from '../components/clientes/EstrategiaCliente';
import { useConfiguracionCRM } from '../lib/configuracion';
import { ORIGEN_ETIQUETA } from '../lib/origen';
import { FranjaDecision, TonoFranja } from '../components/common/FranjaDecision';
import { ResumenCuenta, AlertaResumen } from '../components/clientes/ResumenCuenta';

type Tab = 'resumen' | 'contactos' | 'oportunidades' | 'facturacion' | 'actividades' | 'tareas' | 'marketing' | 'proyectos' | 'reportes' | 'cliente';

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
    actualizarContacto,
    archivarContacto,
    miembros,
    industrias,
    facturas,
  } = useCRM();
  const { config: cfg } = useConfiguracionCRM();
  const DIAS_ALERTA_RENOVACION = cfg.dias_alerta_renovacion;
  const DIAS_SIN_ACTIVIDAD = cfg.dias_sin_actividad;

  const [activeTab, setActiveTab] = useState<Tab>('resumen');

  useEffect(() => {
    if (isOpen) setActiveTab(tabInicial ?? 'resumen');
  }, [isOpen, empresa?.id, tabInicial]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [contactoEditandoId, setContactoEditandoId] = useState<string | null>(null);
  const [actividadEditando, setActividadEditando] = useState<Actividad | null>(null);
  const [showNuevoNegocio, setShowNuevoNegocio] = useState(false);
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
  const riesgos: AlertaResumen[] = [];
  if (empresa.salud === 'rojo' || empresa.salud === 'amarillo') {
    riesgos.push({ texto: `Salud de cuenta: ${salud?.texto ?? ''}`, tono: 'alerta', destino: 'info' });
  }
  if (tareasAtrasadas.length > 0) {
    riesgos.push({ texto: `${tareasAtrasadas.length} tarea(s) atrasada(s)`, tono: 'alerta', destino: 'tareas' });
  }
  if (diasSinActividad === null || diasSinActividad > DIAS_SIN_ACTIVIDAD) {
    riesgos.push({
      texto: diasSinActividad === null ? 'Sin actividad registrada' : `Sin actividad hace ${diasSinActividad} días`,
      tono: 'info',
      destino: 'actividades',
    });
  }
  if (empresa.estado === 'cliente' && oportunidadesEmpresa.length === 0) {
    riesgos.push({ texto: 'Sin negocio abierto de renovación o expansión', tono: 'info', destino: 'oportunidades' });
  }
  if (empresa.estado === 'cliente' && [accesos.google_ads, accesos.ga4, accesos.meta_bm, accesos.gtm_cmp].filter(Boolean).length < 4) {
    riesgos.push({ texto: `Accesos admin incompletos (${[accesos.google_ads, accesos.ga4, accesos.meta_bm, accesos.gtm_cmp].filter(Boolean).length}/4)`, tono: 'info', destino: 'marketing' });
  }

  // Acción principal del encabezado según la pestaña activa
  const accionPrincipal: { label: string; onClick: () => void } | null =
    activeTab === 'contactos'
      ? { label: '+ Contacto', onClick: () => setShowAddContact(true) }
      : activeTab === 'actividades'
      ? { label: '+ Actividad', onClick: () => onOpenNewActivity(empresa.id) }
      : activeTab === 'tareas'
      ? { label: '+ Tarea', onClick: () => onOpenNewTask(empresa.id) }
      : activeTab === 'oportunidades'
      ? { label: '+ Negocio', onClick: () => setShowNuevoNegocio(true) }
      : null;

  const contactoVacio = {
    nombre: '',
    apellido: '',
    cargo: '',
    email: '',
    telefono: '',
    linkedin_url: '',
    rol_decision: 'decisor' as 'decisor' | 'influenciador' | 'usuario',
    es_principal: false,
  };

  const cerrarFormContacto = () => {
    setNewContact(contactoVacio);
    setContactoEditandoId(null);
    setShowAddContact(false);
  };

  const editarContacto = (c: (typeof contactosEmpresa)[number]) => {
    setNewContact({
      nombre: c.nombre,
      apellido: c.apellido ?? '',
      cargo: c.cargo ?? '',
      email: c.email,
      telefono: c.telefono ?? '',
      linkedin_url: c.linkedin_url ?? '',
      rol_decision: (c.rol_decision ?? 'decisor') as 'decisor' | 'influenciador' | 'usuario',
      es_principal: c.es_principal,
    });
    setContactoEditandoId(c.id);
    setShowAddContact(true);
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.nombre || !newContact.email) return;

    const datos = {
      ...newContact,
      apellido: newContact.apellido.trim() || null,
      cargo: newContact.cargo.trim() || null,
      telefono: newContact.telefono.trim() || null,
      linkedin_url: newContact.linkedin_url.trim() || null,
    };
    if (contactoEditandoId) {
      await actualizarContacto(contactoEditandoId, datos);
    } else {
      await crearContacto({ empresa_id: empresa.id, ...datos });
    }
    // Un solo contacto principal por cliente
    if (datos.es_principal) {
      for (const otro of contactosEmpresa.filter((x) => x.es_principal && x.id !== contactoEditandoId)) {
        await actualizarContacto(otro.id, { es_principal: false });
      }
    }
    cerrarFormContacto();
  };

  const handleArchivarContacto = async (c: (typeof contactosEmpresa)[number]) => {
    if (window.confirm(`¿Archivar a ${c.nombre} ${c.apellido ?? ''}? Dejará de verse en la ficha.`)) await archivarContacto(c.id);
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
                {empresa.origen && (
                  <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded-full border border-[var(--c-line)] text-[var(--c-muted)]">
                    Origen: {ORIGEN_ETIQUETA[empresa.origen]}
                  </span>
                )}
                {empresa.salud && (
                  <span className="flex items-center gap-1 font-mono text-[10px] uppercase text-[var(--c-muted)]">
                    <span className={`w-2 h-2 rounded-full ${empresa.salud === 'verde' ? 'bg-[var(--c-ok)]' : empresa.salud === 'amarillo' ? 'bg-[var(--c-warn)]' : 'bg-[var(--c-danger)]'}`} />
                    {SALUD_ETIQUETA[empresa.salud]}
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
              etiqueta: 'Próxima facturación',
              valor: empresa.proxima_facturacion ? formatFecha(empresa.proxima_facturacion) : 'Sin fecha',
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
          ]}
        /></div>

        {/* Navigation Tabs */}
        <div className="shrink-0 px-5 border-b border-[var(--c-line)] bg-[var(--c-surface)] flex flex-nowrap overflow-x-auto gap-x-4 sm:gap-x-5 text-xs font-medium [scrollbar-width:none]">
          {(
            [
              { id: 'resumen' as const, label: 'Resumen' },
              { id: 'marketing' as const, label: 'Marketing' },
              { id: 'facturacion' as const, label: 'Facturación' },
              { id: 'oportunidades' as const, label: `Negocios (${oportunidadesEmpresa.length})` },
              { id: 'tareas' as const, label: `Tareas (${tareasPendientes.length})` },
              { id: 'actividades' as const, label: 'Actividad' },
              { id: 'contactos' as const, label: `Contactos (${contactosEmpresa.length})` },
              ...(empresa.estado === 'cliente'
                ? [
                    { id: 'proyectos' as const, label: 'Proyectos' },
                    { id: 'reportes' as const, label: 'Reportes' },
                    { id: 'cliente' as const, label: 'Portal y activos' },
                  ]
                : []),
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
          {/* TAB RESUMEN: ficha y alertas a la izquierda; lo accionable a la derecha */}
          {activeTab === 'resumen' && (
            <ResumenCuenta
              empresa={empresa}
              responsable={responsable?.nombre}
              contactoPrincipal={contactosEmpresa.find((c) => c.es_principal) ?? contactosEmpresa[0]}
              oportunidadesAbiertas={oportunidadesEmpresa.filter((o) => !o.fecha_cierre_real)}
              actividades={actividadesEmpresa}
              tareasPendientes={tareasPendientes}
              alertas={riesgos}
              accesosConcedidos={[accesos.google_ads, accesos.ga4, accesos.meta_bm, accesos.gtm_cmp].filter(Boolean).length}
              accesosTotal={empresa.estado === 'cliente' ? 4 : 0}
                            onIr={(d) => setActiveTab(d === 'info' ? 'resumen' : d === 'estrategia' ? 'marketing' : d)}
              miembros={miembros.filter((m) => m.activo)}
              facturas={facturas}
              onAbrirNegocio={onSelectOportunidad}
              onActualizar={(datos) => actualizarEmpresa(empresa.id, datos)}
              estrategia={<ResumenEstrategia empresaId={empresa.id} onVerTodo={() => setActiveTab(empresa.estado === 'cliente' ? 'marketing' : 'resumen')} />}
              enlaces={
                <>
                  <div className="space-y-1">
                    <p className="text-[10px] font-mono uppercase text-[var(--c-muted)] flex items-center gap-1.5"><ExternalLink className="w-3 h-3 text-[var(--c-accent)]" />Dashboard Looker</p>
                    <EnlaceEditable valor={empresa.looker_dashboard_url} placeholder="Pegar URL de Looker Studio" onGuardar={(url) => actualizarEmpresa(empresa.id, { looker_dashboard_url: url })} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-mono uppercase text-[var(--c-muted)] flex items-center gap-1.5"><Folder className="w-3 h-3 text-[var(--c-info)]" />Carpeta Drive</p>
                    <EnlaceEditable valor={empresa.drive_folder_url} placeholder="Pegar URL de carpeta Drive" onGuardar={(url) => actualizarEmpresa(empresa.id, { drive_folder_url: url })} />
                  </div>
                </>
              }
            />
          )}

          {/* TAB 2: CONTACTOS */}
          {activeTab === 'contactos' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-[var(--c-text)]">Personas de Contacto</h3>
                <button
                  onClick={() => (showAddContact ? cerrarFormContacto() : setShowAddContact(true))}
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
                  <label className="flex items-center gap-2 text-[11px] text-[var(--c-text-2)]">
                    <input type="checkbox" checked={newContact.es_principal} onChange={(e) => setNewContact({ ...newContact, es_principal: e.target.checked })} /> Contacto principal
                  </label>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={cerrarFormContacto}
                      className="px-2.5 py-1 text-xs text-[var(--c-muted)] hover:text-[var(--c-text)]"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 text-xs font-semibold bg-[var(--c-accent)] text-[var(--c-on-accent)] rounded"
                    >
                      {contactoEditandoId ? 'Guardar cambios' : 'Guardar Contacto'}
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

                      <div className="flex items-center gap-0.5 shrink-0">
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
                        <button onClick={() => editarContacto(c)} title="Editar contacto" aria-label="Editar contacto" className="p-1.5 text-[var(--c-muted)] hover:text-[var(--c-accent)] transition-colors"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleArchivarContacto(c)} title="Archivar contacto" aria-label="Archivar contacto" className="p-1.5 text-[var(--c-muted)] hover:text-[var(--c-danger)] transition-colors"><Archive className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: OPORTUNIDADES */}
          {activeTab === 'oportunidades' && (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xs font-semibold text-[var(--c-text)]">Negocios de este cliente</h3>
                  <p className="text-[11px] text-[var(--c-muted)] mt-0.5">Ventas con este cliente: renovación, expansión o servicio nuevo. Se ven también en Pipeline; haz clic en uno para abrirlo.</p>
                </div>
                <button onClick={() => setShowNuevoNegocio(true)} className="shrink-0 text-xs text-[var(--c-on-accent)] bg-[var(--c-accent)] hover:bg-[var(--c-accent-hover)] px-2.5 py-1 rounded font-medium">+ Negocio</button>
              </div>
              {oportunidadesEmpresa.length === 0 ? (
                <p className="text-xs text-[var(--c-muted)] py-4 text-center">Sin negocios con este cliente.</p>
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
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <p className="text-[10px] text-[var(--c-muted-2)] font-mono">
                            Registrado por {autor?.nombre ?? 'Equipo'}
                          </p>
                          <button onClick={() => setActividadEditando(act)} className="text-[11px] text-[var(--c-accent)] hover:underline">Editar</button>
                        </div>
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
          {activeTab === 'facturacion' && (
            <div className="space-y-8">
              <section className="space-y-3">
                <CotizacionesCliente empresa={empresa} iniciarNueva={!!iniciarNuevaCotizacion} onNuevaUsada={onNuevaCotizacionUsada} />
              </section>
              <section className="space-y-3">
                <FacturasCliente empresa={empresa} />
              </section>
            </div>
          )}
          {activeTab === 'marketing' && (
            <MarketingFicha
              empresaId={empresa.id}
              nombre={empresa.nombre}
              industriaId={empresa.industria_id}
              cliente={empresa.estado === 'cliente'}
              notas={accesos.notas_accesos || ''}
              onNotas={(v) => actualizarAccesosAdmin(empresa.id, { notas_accesos: v })}
            />
          )}
          {activeTab === 'proyectos' && empresa.estado === 'cliente' && <ClientePanel empresaId={empresa.id} vista="proyectos" />}
          {activeTab === 'reportes' && empresa.estado === 'cliente' && <ClientePanel empresaId={empresa.id} vista="reportes" />}
          {activeTab === 'cliente' && empresa.estado === 'cliente' && <ClientePanel empresaId={empresa.id} vista="portal" />}
        </div>

        {actividadEditando && (
          <ActivityModal isOpen onClose={() => setActividadEditando(null)} actividadEditar={actividadEditando} />
        )}
        <NewDealModal
          isOpen={showNuevoNegocio}
          onClose={() => setShowNuevoNegocio(false)}
          empresaIdInicial={empresa.id}
          onCreated={() => setShowNuevoNegocio(false)}
        />

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
