import React, { useState } from 'react';
import {
  X,
  Building2,
  ExternalLink,
  Folder,
  CheckCircle,
  XCircle,
  Plus,
  Archive,
  Phone,
  Mail,
  Linkedin,
  Calendar,
  CheckSquare,
  DollarSign,
} from 'lucide-react';
import { Empresa, Contacto, Oportunidad, Actividad, Tarea, AccesosAdminMarketing } from '../types/crm';
import { useCRM } from '../context/CRMContext';
import { formatCLP, formatFecha, formatMoneda, formatRUT } from '../lib/formatters';

interface CompanyDetailDrawerProps {
  empresa: Empresa | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectOportunidad: (id: string) => void;
  onOpenNewActivity: (empresaId: string) => void;
  onOpenNewTask: (empresaId: string) => void;
}

export const CompanyDetailDrawer: React.FC<CompanyDetailDrawerProps> = ({
  empresa,
  isOpen,
  onClose,
  onSelectOportunidad,
  onOpenNewActivity,
  onOpenNewTask,
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
    crearContacto,
    miembros,
    industrias,
  } = useCRM();

  const [activeTab, setActiveTab] = useState<'info' | 'contactos' | 'oportunidades' | 'actividades' | 'tareas'>('info');
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
  const responsable = miembros.find((m) => m.id === empresa.responsable_id);
  const industria = industrias.find((i) => i.id === empresa.industria_id);

  const handleToggleAcceso = (campo: keyof AccesosAdminMarketing) => {
    actualizarAccesosAdmin(empresa.id, {
      [campo]: !accesos[campo],
    });
  };

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
    <div className="fixed inset-0 z-40 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#121212] dark:bg-[#121212] light:bg-white w-full max-w-2xl h-full border-l border-[#262626] dark:border-[#262626] light:border-[#DDD] shadow-2xl flex flex-col justify-between overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#262626] dark:border-[#262626] light:border-[#EEE] flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded bg-[#1C1C1C] border border-[#2A2A2A] flex items-center justify-center text-[#BEFF00]">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#F5F5F5] dark:text-[#F5F5F5] light:text-[#111]">
                  {empresa.nombre}
                </h2>
                <span className="font-mono text-[10px] text-[#8E8E93] uppercase">
                  {empresa.estado}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-[#8E8E93] mt-0.5 font-mono">
                {empresa.rut && <span>RUT {formatRUT(empresa.rut)}</span>}
                {empresa.dominio_web && (
                  <>
                    <span>·</span>
                    <a
                      href={`https://${empresa.dominio_web}`}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-[#BEFF00] underline"
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
            <button
              onClick={handleArchive}
              className="p-1.5 text-[#8E8E93] hover:text-[#E8005A] hover:bg-[#202020] rounded transition-colors"
              title="Archivar empresa"
            >
              <Archive className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[#8E8E93] hover:text-[#F5F5F5] hover:bg-[#202020] rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 border-b border-[#262626] dark:border-[#262626] light:border-[#EEE] flex gap-4 text-xs font-medium">
          {(
            [
              { id: 'info', label: 'Datos & Accesos' },
              { id: 'contactos', label: `Contactos (${contactosEmpresa.length})` },
              { id: 'oportunidades', label: `Negocios (${oportunidadesEmpresa.length})` },
              { id: 'actividades', label: `Actividades (${actividadesEmpresa.length})` },
              { id: 'tareas', label: `Tareas (${tareasEmpresa.length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[#BEFF00] text-[#BEFF00]'
                  : 'border-transparent text-[#8E8E93] hover:text-[#CCC]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* TAB 1: INFO & ACCESOS */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* Enlaces Operativos: Looker Studio & Google Drive */}
              <div className="bg-[#181818] dark:bg-[#181818] light:bg-[#F9F9F9] p-4 rounded-lg border border-[#262626]">
                <h3 className="text-xs font-semibold text-[#F5F5F5] dark:text-[#F5F5F5] light:text-[#111] mb-3">
                  Enlaces del Cliente P48
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-[#121212] rounded border border-[#2A2A2A] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ExternalLink className="w-4 h-4 text-[#BEFF00]" />
                      <div>
                        <p className="text-xs font-medium text-[#EEE]">Dashboard Looker</p>
                        <p className="text-[10px] text-[#777] font-mono">Reportes de Performance</p>
                      </div>
                    </div>
                    {empresa.looker_dashboard_url ? (
                      <a
                        href={empresa.looker_dashboard_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-[#BEFF00] hover:underline flex items-center gap-1 font-mono"
                      >
                        Abrir
                      </a>
                    ) : (
                      <span className="text-[11px] text-[#555] font-mono">Sin configurar</span>
                    )}
                  </div>

                  <div className="p-3 bg-[#121212] rounded border border-[#2A2A2A] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Folder className="w-4 h-4 text-sky-400" />
                      <div>
                        <p className="text-xs font-medium text-[#EEE]">Carpeta Drive</p>
                        <p className="text-[10px] text-[#777] font-mono">Estrategia, Creativos & Contratos</p>
                      </div>
                    </div>
                    {empresa.drive_folder_url ? (
                      <a
                        href={empresa.drive_folder_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-sky-400 hover:underline flex items-center gap-1 font-mono"
                      >
                        Abrir
                      </a>
                    ) : (
                      <span className="text-[11px] text-[#555] font-mono">Sin configurar</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Checklist de Accesos Admin de Performance */}
              <div className="bg-[#181818] dark:bg-[#181818] light:bg-[#F9F9F9] p-4 rounded-lg border border-[#262626]">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-xs font-semibold text-[#F5F5F5] dark:text-[#F5F5F5] light:text-[#111]">
                      Checklist de Accesos Admin
                    </h3>
                    <p className="text-[11px] text-[#8E8E93]">
                      Requisitos técnicos para gestión de campañas
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-[#8E8E93]">
                    {[accesos.google_ads, accesos.ga4, accesos.meta_bm, accesos.gtm_cmp].filter(Boolean).length} / 4 Listos
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { key: 'google_ads' as const, label: 'Google Ads (MCC P48)' },
                    { key: 'ga4' as const, label: 'Google Analytics 4 (GA4)' },
                    { key: 'meta_bm' as const, label: 'Meta Business Manager' },
                    { key: 'gtm_cmp' as const, label: 'GTM / Consent Mode v2' },
                  ].map((item) => {
                    const checked = Boolean(accesos[item.key]);
                    return (
                      <button
                        key={item.key}
                        onClick={() => handleToggleAcceso(item.key)}
                        className={`p-2.5 rounded border text-left flex items-center justify-between transition-colors ${
                          checked
                            ? 'bg-[#122410] border-[#2A551E] text-[#BEFF00]'
                            : 'bg-[#151515] border-[#2A2A2A] text-[#888] hover:border-[#444]'
                        }`}
                      >
                        <span className="font-medium truncate pr-1">{item.label}</span>
                        {checked ? (
                          <CheckCircle className="w-4 h-4 shrink-0 text-[#BEFF00]" />
                        ) : (
                          <XCircle className="w-4 h-4 shrink-0 text-[#666]" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3">
                  <label className="block text-[11px] font-medium text-[#8E8E93] mb-1">
                    Notas de accesos / credenciales:
                  </label>
                  <textarea
                    rows={2}
                    value={accesos.notas_accesos || ''}
                    onChange={(e) =>
                      actualizarAccesosAdmin(empresa.id, { notas_accesos: e.target.value })
                    }
                    placeholder="Ej: Partner ID invitado, falta confirmación por correo..."
                    className="w-full bg-[#121212] border border-[#2A2A2A] rounded p-2 text-xs text-[#EEE] placeholder:text-[#555] focus:outline-none focus:border-[#BEFF00]"
                  />
                </div>
              </div>

              {/* Parámetros Comerciales & Operativos */}
              <div className="bg-[#181818] dark:bg-[#181818] light:bg-[#F9F9F9] p-4 rounded-lg border border-[#262626] space-y-3">
                <h3 className="text-xs font-semibold text-[#F5F5F5] dark:text-[#F5F5F5] light:text-[#111]">
                  Parámetros Comerciales & Contrato
                </h3>

                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] text-[#8E8E93] mb-1">Estado Empresa</label>
                    <select
                      value={empresa.estado}
                      onChange={(e) => actualizarEmpresa(empresa.id, { estado: e.target.value as any })}
                      className="w-full bg-[#121212] border border-[#2E2E2E] rounded px-2.5 py-1.5 text-xs text-white"
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
                    <label className="block text-[11px] text-[#8E8E93] mb-1">Plan Contratado</label>
                    <select
                      value={empresa.plan || ''}
                      onChange={(e) => actualizarEmpresa(empresa.id, { plan: (e.target.value as any) || null })}
                      className="w-full bg-[#121212] border border-[#2E2E2E] rounded px-2.5 py-1.5 text-xs text-white"
                    >
                      <option value="">Sin plan</option>
                      <option value="A">Plan A</option>
                      <option value="B">Plan B</option>
                      <option value="C">Plan C</option>
                      <option value="D">Plan D</option>
                      <option value="E">Plan E</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#8E8E93] mb-1">Salud de Cuenta</label>
                    <select
                      value={empresa.salud || ''}
                      onChange={(e) => actualizarEmpresa(empresa.id, { salud: (e.target.value as any) || null })}
                      className="w-full bg-[#121212] border border-[#2E2E2E] rounded px-2.5 py-1.5 text-xs text-white"
                    >
                      <option value="">Sin definir</option>
                      <option value="verde">Verde (Saludable)</option>
                      <option value="amarillo">Amarillo (Alerta)</option>
                      <option value="rojo">Rojo (Riesgo)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] text-[#8E8E93] mb-1">Fee Mensual (CLP)</label>
                    <input
                      type="number"
                      value={empresa.fee_mensual_clp ?? ''}
                      onChange={(e) =>
                        actualizarEmpresa(empresa.id, {
                          fee_mensual_clp: e.target.value ? Number(e.target.value) : null,
                          mrr_actual_clp: empresa.estado === 'cliente' && e.target.value ? Number(e.target.value) : empresa.mrr_actual_clp,
                        })
                      }
                      placeholder="Ej: 1500000"
                      className="w-full bg-[#121212] border border-[#2E2E2E] rounded px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#8E8E93] mb-1">Setup Fee (CLP)</label>
                    <input
                      type="number"
                      value={empresa.setup_fee_clp ?? ''}
                      onChange={(e) =>
                        actualizarEmpresa(empresa.id, {
                          setup_fee_clp: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      placeholder="Ej: 800000"
                      className="w-full bg-[#121212] border border-[#2E2E2E] rounded px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#8E8E93] mb-1">Fecha Renovación</label>
                    <input
                      type="date"
                      value={empresa.fecha_renovacion ? empresa.fecha_renovacion.slice(0, 10) : ''}
                      onChange={(e) =>
                        actualizarEmpresa(empresa.id, {
                          fecha_renovacion: e.target.value || null,
                        })
                      }
                      className="w-full bg-[#121212] border border-[#2E2E2E] rounded px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                  <div>
                    <label className="block text-[11px] text-[#8E8E93] mb-1">Responsable Comercial</label>
                    <select
                      value={empresa.responsable_id || ''}
                      onChange={(e) =>
                        actualizarEmpresa(empresa.id, {
                          responsable_id: e.target.value || null,
                        })
                      }
                      className="w-full bg-[#121212] border border-[#2E2E2E] rounded px-2.5 py-1.5 text-xs text-white"
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
                    <label className="block text-[11px] text-[#8E8E93] mb-1">MRR Actual Registrado</label>
                    <div className="px-3 py-1.5 bg-[#121212] rounded border border-[#2E2E2E] font-mono text-xs text-[#BEFF00]">
                      {empresa.mrr_actual_clp ? formatCLP(empresa.mrr_actual_clp) : '—'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONTACTOS */}
          {activeTab === 'contactos' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-[#F5F5F5]">Personas de Contacto</h3>
                <button
                  onClick={() => setShowAddContact(!showAddContact)}
                  className="text-xs text-[#0A0A0A] bg-[#BEFF00] hover:bg-[#aee600] px-2.5 py-1 rounded font-medium flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nuevo Contacto</span>
                </button>
              </div>

              {showAddContact && (
                <form
                  onSubmit={handleCreateContact}
                  className="p-4 bg-[#181818] rounded-lg border border-[#333] space-y-3"
                >
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Nombre *"
                      value={newContact.nombre}
                      onChange={(e) => setNewContact({ ...newContact, nombre: e.target.value })}
                      required
                      className="bg-[#121212] border border-[#2E2E2E] rounded px-2.5 py-1.5 text-xs text-white"
                    />
                    <input
                      type="text"
                      placeholder="Apellido"
                      value={newContact.apellido}
                      onChange={(e) => setNewContact({ ...newContact, apellido: e.target.value })}
                      className="bg-[#121212] border border-[#2E2E2E] rounded px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="email"
                      placeholder="Email corporativo *"
                      value={newContact.email}
                      onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                      required
                      className="bg-[#121212] border border-[#2E2E2E] rounded px-2.5 py-1.5 text-xs text-white"
                    />
                    <input
                      type="text"
                      placeholder="Cargo (ej: Head of Growth)"
                      value={newContact.cargo}
                      onChange={(e) => setNewContact({ ...newContact, cargo: e.target.value })}
                      className="bg-[#121212] border border-[#2E2E2E] rounded px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Teléfono móvil"
                      value={newContact.telefono}
                      onChange={(e) => setNewContact({ ...newContact, telefono: e.target.value })}
                      className="bg-[#121212] border border-[#2E2E2E] rounded px-2.5 py-1.5 text-xs text-white"
                    />
                    <input
                      type="text"
                      placeholder="URL de LinkedIn"
                      value={newContact.linkedin_url}
                      onChange={(e) => setNewContact({ ...newContact, linkedin_url: e.target.value })}
                      className="bg-[#121212] border border-[#2E2E2E] rounded px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#AAA] mb-1">Rol de Decisión</label>
                    <select
                      value={newContact.rol_decision}
                      onChange={(e) =>
                        setNewContact({
                          ...newContact,
                          rol_decision: e.target.value as 'decisor' | 'influenciador' | 'usuario',
                        })
                      }
                      className="w-full bg-[#121212] border border-[#2E2E2E] rounded px-2.5 py-1.5 text-xs text-white"
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
                      className="px-2.5 py-1 text-xs text-[#888] hover:text-white"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 text-xs font-semibold bg-[#BEFF00] text-black rounded"
                    >
                      Guardar Contacto
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-2">
                {contactosEmpresa.length === 0 ? (
                  <p className="text-xs text-[#777] py-4 text-center">No hay contactos registrados.</p>
                ) : (
                  contactosEmpresa.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 bg-[#181818] rounded border border-[#262626] flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-medium text-[#EEE]">
                            {c.nombre} {c.apellido}
                          </p>
                          <span
                            className={`font-mono text-[10px] px-1.5 py-0.2 rounded capitalize ${
                              c.rol_decision === 'decisor'
                                ? 'bg-[#BEFF00]/15 text-[#BEFF00]'
                                : c.rol_decision === 'influenciador'
                                ? 'bg-sky-950/60 text-sky-400'
                                : 'bg-[#222] text-[#AAA]'
                            }`}
                          >
                            {c.rol_decision || 'decisor'}
                          </span>
                          {c.es_principal && (
                            <span className="text-[10px] text-[#BEFF00] font-mono">
                              Principal
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#8E8E93]">{c.cargo || 'Sin cargo'}</p>
                        <div className="flex items-center gap-3 text-xs text-[#777] mt-1 font-mono">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-[#999]" />
                            <a href={`mailto:${c.email}`} className="hover:text-white">
                              {c.email}
                            </a>
                          </span>
                          {c.telefono && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-[#999]" />
                              <a href={`tel:${c.telefono}`} className="hover:text-white">
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
                          className="p-1.5 text-[#888] hover:text-[#BEFF00] transition-colors"
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
              <h3 className="text-xs font-semibold text-[#F5F5F5]">Historial de Negocios</h3>
              {oportunidadesEmpresa.length === 0 ? (
                <p className="text-xs text-[#777] py-4 text-center">Sin oportunidades asociadas.</p>
              ) : (
                oportunidadesEmpresa.map((op) => (
                  <button
                    key={op.id}
                    onClick={() => {
                      onClose();
                      onSelectOportunidad(op.id);
                    }}
                    className="w-full text-left p-3 bg-[#181818] hover:bg-[#202020] rounded border border-[#262626] flex items-center justify-between transition-colors"
                  >
                    <div>
                      <p className="text-xs font-medium text-[#EEE]">{op.nombre}</p>
                      <p className="text-[11px] text-[#8E8E93] font-mono">
                        Cierre estimado: {formatFecha(op.fecha_cierre_estimada)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-xs text-[#BEFF00] font-bold">
                        {formatMoneda(op.valor_neto, op.moneda)}
                      </p>
                      <p className="text-[10px] text-[#777] font-mono">
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
                <h3 className="text-xs font-semibold text-[#F5F5F5]">Línea de Tiempo</h3>
                <button
                  onClick={() => onOpenNewActivity(empresa.id)}
                  className="text-xs text-[#0A0A0A] bg-[#BEFF00] hover:bg-[#aee600] px-2.5 py-1 rounded font-medium flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Registrar</span>
                </button>
              </div>

              {actividadesEmpresa.length === 0 ? (
                <p className="text-xs text-[#777] py-4 text-center">No hay actividades registradas.</p>
              ) : (
                <div className="space-y-3">
                  {actividadesEmpresa.map((act) => {
                    const autor = miembros.find((m) => m.id === act.autor_id);
                    return (
                      <div
                        key={act.id}
                        className="p-3 bg-[#181818] rounded border border-[#262626] text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[#EEE] capitalize">
                            {act.tipo}: {act.titulo}
                          </span>
                          <span className="font-mono text-[10px] text-[#777]">
                            {formatFecha(act.fecha_actividad)}
                          </span>
                        </div>
                        <p className="text-[#AAA]">{act.descripcion}</p>
                        {act.resultado && (
                          <p className="text-[#BEFF00] text-[11px]">Resultado: {act.resultado}</p>
                        )}
                        <p className="text-[10px] text-[#666] font-mono">
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
                <h3 className="text-xs font-semibold text-[#F5F5F5]">Tareas Pendientes</h3>
                <button
                  onClick={() => onOpenNewTask(empresa.id)}
                  className="text-xs text-[#0A0A0A] bg-[#BEFF00] hover:bg-[#aee600] px-2.5 py-1 rounded font-medium flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Crear Tarea</span>
                </button>
              </div>

              {tareasEmpresa.length === 0 ? (
                <p className="text-xs text-[#777] py-4 text-center">Sin tareas pendientes para esta empresa.</p>
              ) : (
                <div className="space-y-2">
                  {tareasEmpresa.map((tar) => (
                    <div
                      key={tar.id}
                      className="p-3 bg-[#181818] rounded border border-[#262626] flex items-center justify-between text-xs"
                    >
                      <div>
                        <p
                          className={`font-medium ${
                            tar.completada ? 'line-through text-[#666]' : 'text-[#EEE]'
                          }`}
                        >
                          {tar.titulo}
                        </p>
                        <p className="text-[11px] text-[#8E8E93] font-mono">
                          Vence: {formatFecha(tar.fecha_vencimiento)}
                        </p>
                      </div>
                      <span
                        className={`font-mono text-[10px] ${
                          tar.prioridad === 'alta' ? 'text-[#E8005A]' : 'text-[#888]'
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
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#262626] bg-[#0E0E0E] flex items-center justify-between text-xs text-[#8E8E93]">
          <span className="font-mono text-[11px]">ID: {empresa.id}</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-[#222] hover:bg-[#2E2E2E] text-white rounded transition-colors"
          >
            Cerrar Ficha
          </button>
        </div>
      </div>
    </div>
  );
};
