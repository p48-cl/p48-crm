import React, { useState, useMemo } from 'react';
import {
  Building2,
  Search,
  Plus,
  ExternalLink,
  Folder,
  ShieldCheck,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { Empresa } from '../types/crm';
import { useCRM } from '../context/CRMContext';
import { formatCLP, formatRUT } from '../lib/formatters';

interface CompaniesViewProps {
  onSelectEmpresa: (id: string) => void;
  onSelectOportunidad: (id: string) => void;
}

export const CompaniesView: React.FC<CompaniesViewProps> = ({
  onSelectEmpresa,
}) => {
  const { empresas, accesosAdmin, miembros, industrias, crearEmpresa } = useCRM();

  const [searchQuery, setSearchQuery] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroResponsable, setFiltroResponsable] = useState<string>('todos');
  const [filtroIndustria, setFiltroIndustria] = useState<string>('todos');

  // Modal para nueva empresa
  const [showNewModal, setShowNewModal] = useState(false);
  const [newCompany, setNewCompany] = useState<{
    nombre: string;
    rut: string;
    dominio_web: string;
    industria_id: string;
    tamano: string;
    responsable_id: string;
    looker_dashboard_url: string;
    drive_folder_url: string;
    estado: 'prospecto' | 'cliente' | 'ex_cliente' | 'descartado' | 'proveedor' | 'interno' | 'archivado';
    plan: '' | 'A' | 'B' | 'C' | 'D' | 'E';
    fee_mensual_clp: string;
    salud: '' | 'verde' | 'amarillo' | 'rojo';
  }>({
    nombre: '',
    rut: '',
    dominio_web: '',
    industria_id: '',
    tamano: '10-50 empleados',
    responsable_id: '',
    looker_dashboard_url: '',
    drive_folder_url: '',
    estado: 'prospecto',
    plan: '',
    fee_mensual_clp: '',
    salud: '',
  });

  const filteredEmpresas = useMemo(() => {
    return empresas.filter((emp) => {
      if (emp.archivado && filtroEstado !== 'archivado') return false;

      // Filtro de texto
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchNom = emp.nombre.toLowerCase().includes(q);
        const matchRut = emp.rut?.toLowerCase().includes(q);
        const matchDom = emp.dominio_web?.toLowerCase().includes(q);
        if (!matchNom && !matchRut && !matchDom) return false;
      }

      // Filtro estado (7 estados)
      if (filtroEstado !== 'todos' && emp.estado !== filtroEstado) return false;

      // Filtro responsable
      if (filtroResponsable !== 'todos' && emp.responsable_id !== filtroResponsable) return false;

      // Filtro industria
      if (filtroIndustria !== 'todos' && emp.industria_id !== filtroIndustria) return false;

      return true;
    });
  }, [empresas, searchQuery, filtroEstado, filtroResponsable, filtroIndustria]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany.nombre.trim()) return;

    const creada = await crearEmpresa({
      nombre: newCompany.nombre.trim(),
      rut: newCompany.rut.trim() || null,
      dominio_web: newCompany.dominio_web.trim() || null,
      industria_id: newCompany.industria_id || industrias[0]?.id || null,
      tamano: newCompany.tamano || null,
      responsable_id: newCompany.responsable_id || miembros[0]?.id || null,
      looker_dashboard_url: newCompany.looker_dashboard_url.trim() || null,
      drive_folder_url: newCompany.drive_folder_url.trim() || null,
      estado: newCompany.estado,
      plan: newCompany.plan || null,
      fee_mensual_clp: newCompany.fee_mensual_clp ? Number(newCompany.fee_mensual_clp) : null,
      mrr_actual_clp: newCompany.estado === 'cliente' && newCompany.fee_mensual_clp ? Number(newCompany.fee_mensual_clp) : null,
      salud: newCompany.salud || null,
    });

    setShowNewModal(false);
    setNewCompany({
      nombre: '',
      rut: '',
      dominio_web: '',
      industria_id: '',
      tamano: '10-50 empleados',
      responsable_id: '',
      looker_dashboard_url: '',
      drive_folder_url: '',
      estado: 'prospecto',
      plan: '',
      fee_mensual_clp: '',
      salud: '',
    });
    if (creada) onSelectEmpresa(creada.id);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Barra superior de título y acción principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-sans text-[var(--c-text)] dark:text-[var(--c-text)] light:text-[var(--c-text)]">
            Directorio de Empresas
          </h1>
          <p className="text-xs text-[var(--c-muted)] mt-0.5">
            {filteredEmpresas.length} empresas registradas · Prospectos y Clientes activos
          </p>
        </div>

        {/* Botón Principal (Lima P48) */}
        <button
          onClick={() => setShowNewModal(true)}
          className="bg-[var(--c-accent)] hover:bg-[var(--c-accent-hover)] active:scale-[0.98] text-[var(--c-on-accent)] font-semibold text-xs py-2 px-3.5 rounded flex items-center gap-1.5 transition-all shadow-sm font-sans"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Nueva Empresa</span>
        </button>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-wrap items-center gap-3 bg-[var(--c-surface)] dark:bg-[var(--c-surface)] light:bg-[var(--c-bg)] p-3 rounded-lg border border-[var(--c-line)]">
        {/* Input búsqueda */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-[var(--c-muted)] absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, RUT o dominio..."
            className="w-full bg-[var(--c-surface-2)] dark:bg-[var(--c-surface-2)] light:bg-white border border-[var(--c-line)] rounded pl-8 pr-3 py-1.5 text-xs text-[var(--c-text)] placeholder:text-[var(--c-muted-2)] focus:outline-none focus:border-[var(--c-accent)]"
          />
        </div>

        {/* Filtro Estado (7 estados) */}
        <div className="flex items-center gap-1.5 text-xs text-[var(--c-muted)]">
          <Filter className="w-3.5 h-3.5 text-[var(--c-muted)]" />
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)] focus:outline-none"
          >
            <option value="todos">Todos los estados</option>
            <option value="prospecto">Prospectos</option>
            <option value="cliente">Clientes activos</option>
            <option value="ex_cliente">Ex clientes</option>
            <option value="descartado">Descartados</option>
            <option value="proveedor">Proveedores</option>
            <option value="interno">Internos</option>
            <option value="archivado">Archivados</option>
          </select>
        </div>

        {/* Filtro Responsable */}
        <select
          value={filtroResponsable}
          onChange={(e) => setFiltroResponsable(e.target.value)}
          className="bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)] focus:outline-none"
        >
          <option value="todos">Todos los responsables</option>
          {miembros.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}
            </option>
          ))}
        </select>

        {/* Filtro Industria */}
        <select
          value={filtroIndustria}
          onChange={(e) => setFiltroIndustria(e.target.value)}
          className="bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)] focus:outline-none"
        >
          <option value="todos">Todas las industrias</option>
          {industrias.map((ind) => (
            <option key={ind.id} value={ind.id}>
              {ind.nombre}
            </option>
          ))}
        </select>
      </div>

      {/* Tabla Densa de Empresas */}
      <div className="bg-[var(--c-surface)] dark:bg-[var(--c-surface)] light:bg-white border border-[var(--c-line)] rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--c-surface-2)] dark:bg-[var(--c-surface-2)] light:bg-[var(--c-surface-2)] border-b border-[var(--c-line)] text-[var(--c-muted)] uppercase font-mono text-[11px]">
              <tr>
                <th className="py-2.5 px-4 font-medium">Empresa</th>
                <th className="py-2.5 px-3 font-medium">RUT / Web</th>
                <th className="py-2.5 px-3 font-medium">Industria</th>
                <th className="py-2.5 px-3 font-medium">Estado</th>
                <th className="py-2.5 px-3 font-medium">Plan</th>
                <th className="py-2.5 px-3 font-medium">Responsable</th>
                <th className="py-2.5 px-3 font-medium text-center">Accesos Admin</th>
                <th className="py-2.5 px-3 font-medium">Enlaces</th>
                <th className="py-2.5 px-4 text-right font-medium">Fee / MRR</th>
                <th className="py-2.5 px-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222] dark:divide-[#222] light:divide-[var(--c-surface-3)]">
              {filteredEmpresas.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-xs text-[var(--c-muted)]">
                    No se encontraron empresas con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredEmpresas.map((emp) => {
                  const resp = miembros.find((m) => m.id === emp.responsable_id);
                  const ind = industrias.find((i) => i.id === emp.industria_id);
                  const acc = accesosAdmin[emp.id];
                  const accesosCompletos =
                    acc && [acc.google_ads, acc.ga4, acc.meta_bm, acc.gtm_cmp].filter(Boolean).length;

                  const estadoLabels: Record<string, { label: string; color: string }> = {
                    cliente: { label: 'Cliente', color: 'text-[var(--c-accent)] font-medium' },
                    prospecto: { label: 'Prospecto', color: 'text-[var(--c-muted)]' },
                    ex_cliente: { label: 'Ex cliente', color: 'text-[var(--c-muted-2)] line-through' },
                    descartado: { label: 'Descartado', color: 'text-[#555]' },
                    proveedor: { label: 'Proveedor', color: 'text-sky-400' },
                    interno: { label: 'Interno', color: 'text-amber-400' },
                    archivado: { label: 'Archivado', color: 'text-[#444]' },
                  };

                  const estConfig = estadoLabels[emp.estado] || { label: emp.estado, color: 'text-[var(--c-muted)]' };

                  return (
                    <tr
                      key={emp.id}
                      onClick={() => onSelectEmpresa(emp.id)}
                      className="hover:bg-[var(--c-surface-2)] dark:hover:bg-[var(--c-surface-2)] light:hover:bg-[#F7F7F7] cursor-pointer transition-colors group"
                    >
                      {/* Empresa */}
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded bg-[var(--c-surface-3)] flex items-center justify-center text-[var(--c-accent)] shrink-0">
                            <Building2 className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-[var(--c-text)] dark:text-[var(--c-text)] light:text-[var(--c-text)] group-hover:text-[var(--c-accent)] transition-colors">
                                {emp.nombre}
                              </p>
                              {emp.salud && (
                                <span
                                  className={`w-2 h-2 rounded-full inline-block ${
                                    emp.salud === 'verde'
                                      ? 'bg-emerald-400'
                                      : emp.salud === 'amarillo'
                                      ? 'bg-amber-400'
                                      : 'bg-rose-500'
                                  }`}
                                  title={`Salud: ${emp.salud}`}
                                />
                              )}
                            </div>
                            <p className="text-[10px] text-[var(--c-muted)] font-mono">{emp.tamano || 'Empresa'}</p>
                          </div>
                        </div>
                      </td>

                      {/* RUT / Web */}
                      <td className="py-2.5 px-3 font-mono text-[11px] text-[#AAA]">
                        {emp.rut ? <p>{formatRUT(emp.rut)}</p> : <p className="text-[#555]">—</p>}
                        {emp.dominio_web && (
                          <p className="text-[10px] text-[var(--c-muted)] truncate max-w-[140px]">
                            {emp.dominio_web}
                          </p>
                        )}
                      </td>

                      {/* Industria */}
                      <td className="py-2.5 px-3 text-[#AAA] truncate max-w-[130px]">
                        {ind?.nombre ?? 'General'}
                      </td>

                      {/* Estado */}
                      <td className="py-2.5 px-3 font-mono text-[11px]">
                        <span className={estConfig.color}>{estConfig.label}</span>
                      </td>

                      {/* Plan */}
                      <td className="py-2.5 px-3 font-mono text-[11px]">
                        {emp.plan ? (
                          <span className="bg-[var(--c-surface-3)] px-1.5 py-0.5 rounded text-[var(--c-text)] font-bold">
                            Plan {emp.plan}
                          </span>
                        ) : (
                          <span className="text-[#555]">—</span>
                        )}
                      </td>

                      {/* Responsable */}
                      <td className="py-2.5 px-3 text-[#BBB] text-xs">
                        {resp?.nombre ?? 'Sin asignar'}
                      </td>

                      {/* Accesos Admin */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="inline-flex items-center gap-1 font-mono text-[11px] text-[var(--c-muted)]">
                          <ShieldCheck
                            className={`w-3.5 h-3.5 ${
                              accesosCompletos === 4 ? 'text-[var(--c-accent)]' : 'text-[var(--c-muted-2)]'
                            }`}
                          />
                          <span>{accesosCompletos ?? 0}/4</span>
                        </div>
                      </td>

                      {/* Enlaces Looker / Drive */}
                      <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          {emp.looker_dashboard_url ? (
                            <a
                              href={emp.looker_dashboard_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[var(--c-accent)] hover:opacity-80 p-1"
                              title="Abrir Dashboard Looker"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          ) : (
                            <span className="text-[#444] text-[10px]">—</span>
                          )}
                          {emp.drive_folder_url ? (
                            <a
                              href={emp.drive_folder_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sky-400 hover:opacity-80 p-1"
                              title="Abrir Carpeta Drive"
                            >
                              <Folder className="w-3.5 h-3.5" />
                            </a>
                          ) : (
                            <span className="text-[#444] text-[10px]">—</span>
                          )}
                        </div>
                      </td>

                      {/* Fee / MRR */}
                      <td className="py-2.5 px-4 text-right font-mono text-xs text-[var(--c-text)]">
                        {emp.mrr_actual_clp
                          ? formatCLP(emp.mrr_actual_clp)
                          : emp.fee_mensual_clp
                          ? formatCLP(emp.fee_mensual_clp)
                          : '—'}
                      </td>

                      {/* Flecha */}
                      <td className="py-2.5 px-3 text-right">
                        <ChevronRight className="w-4 h-4 text-[#555] group-hover:text-[var(--c-accent)] inline-block transition-colors" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear Nueva Empresa */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[var(--c-surface)] dark:bg-[var(--c-surface)] light:bg-white border border-[var(--c-line)] rounded-lg max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-bold text-[var(--c-text)] dark:text-[var(--c-text)] light:text-[var(--c-text)] mb-1">
              Nueva Empresa
            </h2>
            <p className="text-xs text-[var(--c-muted)] mb-4">
              Registrar cuenta comercial en CRM P48
            </p>

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--c-text)] mb-1">
                  Nombre de Empresa <span className="text-[var(--c-accent)]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Retail Andino S.A."
                  value={newCompany.nombre}
                  onChange={(e) => setNewCompany({ ...newCompany, nombre: e.target.value })}
                  className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--c-text-2)] mb-1">RUT Empresa</label>
                  <input
                    type="text"
                    placeholder="Ej: 76.123.456-K"
                    value={newCompany.rut}
                    onChange={(e) => setNewCompany({ ...newCompany, rut: e.target.value })}
                    className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--c-text-2)] mb-1">Dominio Web</label>
                  <input
                    type="text"
                    placeholder="empresa.cl"
                    value={newCompany.dominio_web}
                    onChange={(e) => setNewCompany({ ...newCompany, dominio_web: e.target.value })}
                    className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--c-text-2)] mb-1">Estado</label>
                  <select
                    value={newCompany.estado}
                    onChange={(e) => setNewCompany({ ...newCompany, estado: e.target.value as any })}
                    className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-3 py-2 text-xs text-white"
                  >
                    <option value="prospecto">Prospecto</option>
                    <option value="cliente">Cliente</option>
                    <option value="ex_cliente">Ex cliente</option>
                    <option value="descartado">Descartado</option>
                    <option value="proveedor">Proveedor</option>
                    <option value="interno">Interno</option>
                    <option value="archivado">Archivado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--c-text-2)] mb-1">Plan</label>
                  <select
                    value={newCompany.plan}
                    onChange={(e) => setNewCompany({ ...newCompany, plan: e.target.value as any })}
                    className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-3 py-2 text-xs text-white"
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
                  <label className="block text-xs font-medium text-[var(--c-text-2)] mb-1">Salud</label>
                  <select
                    value={newCompany.salud}
                    onChange={(e) => setNewCompany({ ...newCompany, salud: e.target.value as any })}
                    className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-3 py-2 text-xs text-white"
                  >
                    <option value="">Sin definir</option>
                    <option value="verde">Verde (Óptima)</option>
                    <option value="amarillo">Amarillo (Alerta)</option>
                    <option value="rojo">Rojo (En riesgo)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--c-text-2)] mb-1">
                    Fee Mensual (CLP)
                  </label>
                  <input
                    type="number"
                    placeholder="Ej: 1500000"
                    value={newCompany.fee_mensual_clp}
                    onChange={(e) => setNewCompany({ ...newCompany, fee_mensual_clp: e.target.value })}
                    className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--c-text-2)] mb-1">Industria</label>
                  <select
                    value={newCompany.industria_id}
                    onChange={(e) => setNewCompany({ ...newCompany, industria_id: e.target.value })}
                    className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-3 py-2 text-xs text-white"
                  >
                    {industrias.map((ind) => (
                      <option key={ind.id} value={ind.id}>
                        {ind.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--c-text-2)] mb-1">Responsable</label>
                  <select
                    value={newCompany.responsable_id}
                    onChange={(e) =>
                      setNewCompany({ ...newCompany, responsable_id: e.target.value })
                    }
                    className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-3 py-2 text-xs text-white"
                  >
                    {miembros.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--c-text-2)] mb-1">Tamaño</label>
                  <input
                    type="text"
                    value={newCompany.tamano}
                    onChange={(e) => setNewCompany({ ...newCompany, tamano: e.target.value })}
                    className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--c-text-2)] mb-1">
                    URL Looker Dashboard
                  </label>
                  <input
                    type="url"
                    placeholder="https://lookerstudio.google.com/..."
                    value={newCompany.looker_dashboard_url}
                    onChange={(e) =>
                      setNewCompany({ ...newCompany, looker_dashboard_url: e.target.value })
                    }
                    className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--c-text-2)] mb-1">
                    URL Carpeta Drive
                  </label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/..."
                    value={newCompany.drive_folder_url}
                    onChange={(e) =>
                      setNewCompany({ ...newCompany, drive_folder_url: e.target.value })
                    }
                    className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-[#222]">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-3 py-2 text-xs text-[var(--c-muted)] hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-[var(--c-accent)] text-black rounded"
                >
                  Guardar Empresa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
