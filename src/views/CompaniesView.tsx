import { fondoCerrable } from '../lib/fondo';
import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Plus,
  ExternalLink,
  Folder,
  ShieldCheck,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { useConfiguracionCRM } from '../lib/configuracion';
import { LogoEmpresa, subirLogoEmpresa, validarArchivoLogo } from '../components/clientes/Logo';
import { ClientesKpis } from '../components/clientes/ClientesKpis';
import { LayoutList, LayoutGrid } from 'lucide-react';
import { formatCLP, formatRUT, formatRUTInput } from '../lib/formatters';
import { ThOrdenable } from '../components/common/ThOrdenable';
import { useOrden } from '../lib/orden';
import { resumen360 } from '../lib/cliente360';

type ClaveOrdenEmpresa = 'cliente' | 'rut' | 'industria' | 'estado' | 'plan' | 'responsable' | 'accesos' | 'mrr';

interface CompaniesViewProps {
  onSelectEmpresa: (id: string) => void;
  onSelectOportunidad: (id: string) => void;
}

export const CompaniesView: React.FC<CompaniesViewProps> = ({
  onSelectEmpresa,
}) => {
  const { empresas, accesosAdmin, miembros, industrias, crearEmpresa, actualizarEmpresa, oportunidades, etapas, facturas, cotizaciones, proyectos, tareas, reportes, actividades, contactos } = useCRM();
  const datos360 = useMemo(
    () => ({ oportunidades, etapas, facturas, cotizaciones, proyectos, tareas, reportes, actividades, contactos }),
    [oportunidades, etapas, facturas, cotizaciones, proyectos, tareas, reportes, actividades, contactos],
  );
  const r360Map = useMemo(() => new Map(empresas.map((e) => [e.id, resumen360(e, datos360)] as const)), [empresas, datos360]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroResponsable, setFiltroResponsable] = useState<string>('todos');
  const [filtroIndustria, setFiltroIndustria] = useState<string>('todos');

  // Modal para nueva empresa
  const [showNewModal, setShowNewModal] = useState(false);
  // Logo elegido al crear el cliente: se sube una vez exista la empresa.
  const [logoNuevo, setLogoNuevo] = useState<File | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const logoPreview = useMemo(() => (logoNuevo ? URL.createObjectURL(logoNuevo) : null), [logoNuevo]);
  useEffect(() => () => {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
  }, [logoPreview]);
  const { config: configCRM } = useConfiguracionCRM();
  const [vista, setVista] = useState<'tabla' | 'tarjetas'>(configCRM.vista_clientes_defecto);
  useEffect(() => {
    setVista(configCRM.vista_clientes_defecto);
  }, [configCRM.vista_clientes_defecto]);
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
    plan: '' | 'A' | 'B' | 'C' | 'D' | 'E' | 'personalizado';
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

  const { clave: sortKey, dir: sortDir, alternar: alternarOrden, ordenar } = useOrden<ClaveOrdenEmpresa>('cliente', 'asc');
  const empresasOrdenadas = useMemo(
    () =>
      ordenar(filteredEmpresas, (emp, clave) => {
        switch (clave) {
          case 'cliente': return emp.nombre;
          case 'rut': return emp.rut || emp.dominio_web || '';
          case 'industria': return industrias.find((i) => i.id === emp.industria_id)?.nombre ?? '';
          case 'estado': return emp.estado;
          case 'plan': return emp.plan ?? '';
          case 'responsable': return miembros.find((m) => m.id === emp.responsable_id)?.nombre ?? '';
          case 'accesos': {
            const acc = accesosAdmin[emp.id];
            return acc ? [acc.google_ads, acc.ga4, acc.meta_bm, acc.gtm_cmp].filter(Boolean).length : 0;
          }
          case 'mrr': return Number(emp.mrr_actual_clp ?? 0);
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredEmpresas, sortKey, sortDir, industrias, miembros, accesosAdmin]
  );

  const cabeceraEmpresa = (clave: ClaveOrdenEmpresa, etiqueta: string, alinear: 'left' | 'right' | 'center' = 'left', extra = 'px-3') => (
    <ThOrdenable
      key={clave}
      etiqueta={etiqueta}
      activa={sortKey === clave}
      dir={sortDir}
      onClick={() => alternarOrden(clave)}
      alinear={alinear}
      className={`py-2.5 ${extra} font-medium`}
    />
  );

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

      salud: newCompany.salud || null,
    });

    if (creada && logoNuevo) {
      try {
        const path = await subirLogoEmpresa(creada.id, logoNuevo);
        await actualizarEmpresa(creada.id, { logo_path: path });
      } catch (err) {
        window.alert(
          `El cliente se creó, pero el logo no se pudo subir: ${err instanceof Error ? err.message : 'error desconocido'}. Puedes subirlo desde la ficha.`
        );
      }
    }
    setLogoNuevo(null);
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
      <ClientesKpis />
      {/* Barra superior de título y acción principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-sans text-[var(--c-text)]">
            Directorio de Clientes
          </h1>
          <p className="text-xs text-[var(--c-muted)] mt-0.5">
            {filteredEmpresas.length} empresas registradas · Prospectos y Clientes activos
          </p>
        </div>

        {/* Botón Principal (Lima P48) */}
        <button
          onClick={() => {
            setLogoNuevo(null);
            setLogoError(null);
            setShowNewModal(true);
          }}
          className="bg-[var(--c-accent)] hover:bg-[var(--c-accent-hover)] active:scale-[0.98] text-[var(--c-on-accent)] font-semibold text-xs py-2 px-3.5 rounded flex items-center gap-1.5 transition-all shadow-sm font-sans"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Nuevo cliente</span>
        </button>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-wrap items-center gap-3 bg-[var(--c-surface)] p-3 rounded-lg border border-[var(--c-line)]">
        {/* Input búsqueda */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-[var(--c-muted)] absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, RUT o dominio..."
            className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded pl-8 pr-3 py-1.5 text-xs text-[var(--c-text)] placeholder:text-[var(--c-muted-2)] focus:outline-none focus:border-[var(--c-accent)]"
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

      {/* Conmutador tabla / tarjetas */}
      <div className="flex justify-end">
        <div className="inline-flex border border-[var(--c-line)] rounded overflow-hidden">
          <button
            onClick={() => setVista('tabla')}
            className={`px-2.5 py-1 text-[11px] font-mono flex items-center gap-1 ${vista === 'tabla' ? 'bg-[var(--c-surface-3)] text-[var(--c-text)]' : 'text-[var(--c-muted)]'}`}
          >
            <LayoutList className="w-3.5 h-3.5" /> Tabla
          </button>
          <button
            onClick={() => setVista('tarjetas')}
            className={`px-2.5 py-1 text-[11px] font-mono flex items-center gap-1 ${vista === 'tarjetas' ? 'bg-[var(--c-surface-3)] text-[var(--c-text)]' : 'text-[var(--c-muted)]'}`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Tarjetas
          </button>
        </div>
      </div>

      {vista === 'tarjetas' && (
        <div className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredEmpresas.length === 0 && (
            <p className="col-span-full py-8 text-center text-xs text-[var(--c-muted)]">No se encontraron empresas con los filtros aplicados.</p>
          )}
          {filteredEmpresas.map((emp) => {
            const resp = miembros.find((m) => m.id === emp.responsable_id);
            const ind = industrias.find((i) => i.id === emp.industria_id);
            const nNegocios = oportunidades.filter((o) => o.empresa_id === emp.id && !o.archivado).length;
            return (
              <button
                key={emp.id}
                onClick={() => onSelectEmpresa(emp.id)}
                className="text-left p-4 rounded-lg border border-[var(--c-line)] bg-[var(--c-surface)] hover:border-[var(--c-accent)] transition-colors space-y-3"
              >
                <div className="flex items-start gap-3">
                  <LogoEmpresa nombre={emp.nombre} logoPath={emp.logo_path} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-[var(--c-text)] truncate">{emp.nombre}</p>
                      {emp.salud && (
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${emp.salud === 'verde' ? 'bg-[var(--c-ok)]' : emp.salud === 'amarillo' ? 'bg-[var(--c-warn)]' : 'bg-[var(--c-danger)]'}`}
                          title={`Salud: ${emp.salud}`}
                        />
                      )}
                    </div>
                    <p className="text-[10px] font-mono text-[var(--c-muted)] truncate">{emp.rut ? formatRUT(emp.rut) : 'Sin RUT'} · {ind?.nombre ?? 'General'}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-[var(--c-muted)]">
                  <span>{emp.estado}</span>
                  <span>{nNegocios} negocio{nNegocios === 1 ? '' : 's'}</span>
                  <span className="truncate max-w-[40%]">{resp?.nombre ?? 'Sin responsable'}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Tabla Densa de Empresas */}
      <div className={`${vista === 'tabla' ? '' : 'hidden '}bg-[var(--c-surface)] border border-[var(--c-line)] rounded-lg overflow-hidden shadow-sm`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--c-surface-2)] border-b border-[var(--c-line)] text-[var(--c-muted)] uppercase font-mono text-[11px]">
              <tr>
                {cabeceraEmpresa('cliente', 'Cliente', 'left', 'px-4')}
                {cabeceraEmpresa('rut', 'RUT / Web')}
                {cabeceraEmpresa('industria', 'Industria')}
                {cabeceraEmpresa('estado', 'Estado')}
                {cabeceraEmpresa('plan', 'Plan')}
                {cabeceraEmpresa('responsable', 'Responsable')}
                {cabeceraEmpresa('accesos', 'Accesos Admin', 'center')}
                <th className="py-2.5 px-3 font-medium">Enlaces</th>
                <th className="py-2.5 px-3 font-medium">Negocios</th>
                <th className="py-2.5 px-3 font-medium text-right">Por cobrar</th>
                <th className="py-2.5 px-3 font-medium text-center">Alertas</th>
                <th className="py-2.5 px-3 font-medium text-center">Completa</th>
                {cabeceraEmpresa('mrr', 'Fee / MRR', 'right', 'px-4')}
                <th className="py-2.5 px-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--c-line)]">
              {filteredEmpresas.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-8 text-center text-xs text-[var(--c-muted)]">
                    No se encontraron empresas con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                empresasOrdenadas.map((emp) => {
                  const resp = miembros.find((m) => m.id === emp.responsable_id);
                  const ind = industrias.find((i) => i.id === emp.industria_id);
                  const acc = accesosAdmin[emp.id];
                  const accesosCompletos =
                    acc && [acc.google_ads, acc.ga4, acc.meta_bm, acc.gtm_cmp].filter(Boolean).length;

                  const estadoLabels: Record<string, { label: string; color: string }> = {
                    cliente: { label: 'Cliente', color: 'text-[var(--c-accent)] font-medium' },
                    prospecto: { label: 'Prospecto', color: 'text-[var(--c-muted)]' },
                    ex_cliente: { label: 'Ex cliente', color: 'text-[var(--c-muted-2)] line-through' },
                    descartado: { label: 'Descartado', color: 'text-[var(--c-muted-2)]' },
                    proveedor: { label: 'Proveedor', color: 'text-[var(--c-info)]' },
                    interno: { label: 'Interno', color: 'text-[var(--c-warn)]' },
                    archivado: { label: 'Archivado', color: 'text-[var(--c-muted-2)]' },
                  };

                  const estConfig = estadoLabels[emp.estado] || { label: emp.estado, color: 'text-[var(--c-muted)]' };

                  const r360 = r360Map.get(emp.id);

                  return (
                    <tr
                      key={emp.id}
                      onClick={() => onSelectEmpresa(emp.id)}
                      className="hover:bg-[var(--c-surface-2)] cursor-pointer transition-colors group"
                    >
                      {/* Empresa */}
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <LogoEmpresa nombre={emp.nombre} logoPath={emp.logo_path} size={24} />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-[var(--c-text)] group-hover:text-[var(--c-accent)] transition-colors">
                                {emp.nombre}
                              </p>
                              {emp.salud && (
                                <span
                                  className={`w-2 h-2 rounded-full inline-block ${
                                    emp.salud === 'verde'
                                      ? 'bg-[var(--c-ok)]'
                                      : emp.salud === 'amarillo'
                                      ? 'bg-[var(--c-warn)]'
                                      : 'bg-[var(--c-danger)]'
                                  }`}
                                  title={`Salud: ${emp.salud}`}
                                />
                              )}
                            </div>
                            <p className="text-[10px] text-[var(--c-muted)] font-mono">{emp.tamano || 'Cliente'}</p>
                          </div>
                        </div>
                      </td>

                      {/* RUT / Web */}
                      <td className="py-2.5 px-3 font-mono text-[11px] text-[var(--c-text-2)]">
                        {emp.rut ? <p>{formatRUT(emp.rut)}</p> : <p className="text-[var(--c-muted-2)]">—</p>}
                        {emp.dominio_web && (
                          <p className="text-[10px] text-[var(--c-muted)] truncate max-w-[140px]">
                            {emp.dominio_web}
                          </p>
                        )}
                      </td>

                      {/* Industria */}
                      <td className="py-2.5 px-3 text-[var(--c-text-2)] truncate max-w-[130px]">
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
                          <span className="text-[var(--c-muted-2)]">—</span>
                        )}
                      </td>

                      {/* Responsable */}
                      <td className="py-2.5 px-3 text-[var(--c-text-2)] text-xs">
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
                            <span className="text-[var(--c-muted-2)] text-[10px]">—</span>
                          )}
                          {emp.drive_folder_url ? (
                            <a
                              href={emp.drive_folder_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[var(--c-info)] hover:opacity-80 p-1"
                              title="Abrir Carpeta Drive"
                            >
                              <Folder className="w-3.5 h-3.5" />
                            </a>
                          ) : (
                            <span className="text-[var(--c-muted-2)] text-[10px]">—</span>
                          )}
                        </div>
                      </td>

                      {/* Negocios */}
                      <td className="py-2.5 px-3 text-[11px] font-mono text-[var(--c-text-2)] whitespace-nowrap">
                        {!r360 || r360.negociosCaptacion + r360.negociosExpansion === 0 ? (
                          <span className="text-[var(--c-muted-2)]">—</span>
                        ) : (
                          <>
                            {r360.negociosCaptacion > 0 && <p>Captación {r360.negociosCaptacion}</p>}
                            {r360.negociosExpansion > 0 && <p>Expansión {r360.negociosExpansion} · {formatCLP(r360.valorExpansionCLP)}</p>}
                          </>
                        )}
                      </td>

                      {/* Por cobrar */}
                      <td className={`py-2.5 px-3 text-right font-mono text-[11px] ${r360 && r360.facturasVencidas > 0 ? 'text-[var(--c-danger)]' : 'text-[var(--c-text-2)]'}`}>
                        {r360 && r360.porCobrarCLP > 0 ? formatCLP(r360.porCobrarCLP) : <span className="text-[var(--c-muted-2)]">—</span>}
                        {r360 && r360.facturasVencidas > 0 && <p className="text-[10px]">{r360.facturasVencidas} vencida{r360.facturasVencidas > 1 ? 's' : ''}</p>}
                      </td>

                      {/* Alertas */}
                      <td className="py-2.5 px-3 text-center">
                        {!r360 || r360.alertas.length === 0 ? (
                          <span className="text-[var(--c-muted-2)]">—</span>
                        ) : (
                          <span
                            title={r360.alertas.map((a) => a.texto).join('\n')}
                            className={`inline-flex min-w-[20px] justify-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${r360.alertas.some((a) => a.nivel === 'peligro') ? 'bg-[var(--c-danger)]/15 text-[var(--c-danger)]' : 'bg-[var(--c-warn)]/15 text-[var(--c-warn)]'}`}
                          >
                            {r360.alertas.length}
                          </span>
                        )}
                      </td>

                      {/* Completitud */}
                      <td className="py-2.5 px-3 text-center font-mono text-[11px] text-[var(--c-text-2)]">
                        {r360 ? `${r360.completitud}%` : '—'}
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
                        <ChevronRight className="w-4 h-4 text-[var(--c-muted-2)] group-hover:text-[var(--c-accent)] inline-block transition-colors" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" {...fondoCerrable(() => setShowNewModal(false))}>
          <div className="bg-[var(--c-surface)] border border-[var(--c-line)] rounded-lg max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-bold text-[var(--c-text)] mb-1">
              Nuevo cliente
            </h2>
            <p className="text-xs text-[var(--c-muted)] mb-4">
              Registrar cuenta comercial en CRM P48
            </p>

            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--c-text)] mb-1">
                  Nombre del cliente <span className="text-[var(--c-accent)]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Retail Andino S.A."
                  value={newCompany.nombre}
                  onChange={(e) => setNewCompany({ ...newCompany, nombre: e.target.value })}
                  className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-3 py-2 text-xs text-[var(--c-text)]"
                />
              </div>

              <div className="flex items-center gap-3">
                {logoPreview ? (
                  <img src={logoPreview} alt="Vista previa del logo" className="w-12 h-12 rounded bg-white object-contain border border-[var(--c-line)] shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded bg-[var(--c-surface-3)] shrink-0" aria-hidden />
                )}
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-xs font-medium text-[var(--c-text-2)]">Logo (opcional)</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="text-[11px] text-[var(--c-muted)] max-w-full"
                    onChange={(e) => {
                      const archivo = e.target.files?.[0] ?? null;
                      e.target.value = '';
                      if (!archivo) {
                        setLogoNuevo(null);
                        setLogoError(null);
                        return;
                      }
                      const error = validarArchivoLogo(archivo);
                      setLogoError(error);
                      setLogoNuevo(error ? null : archivo);
                    }}
                  />
                  {logoError && <span className="text-[10px] text-[var(--c-danger)]">{logoError}</span>}
                </div>
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--c-text-2)] mb-1">RUT</label>
                  <input
                    type="text"
                    placeholder="Ej: 76.123.456-K"
                    value={newCompany.rut}
                    onChange={(e) => setNewCompany({ ...newCompany, rut: formatRUTInput(e.target.value) })}
                    className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-3 py-2 text-xs text-[var(--c-text)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--c-text-2)] mb-1">Dominio Web</label>
                  <input
                    type="text"
                    placeholder="empresa.cl"
                    value={newCompany.dominio_web}
                    onChange={(e) => setNewCompany({ ...newCompany, dominio_web: e.target.value })}
                    className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-3 py-2 text-xs text-[var(--c-text)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--c-text-2)] mb-1">Estado</label>
                  <select
                    value={newCompany.estado}
                    onChange={(e) => setNewCompany({ ...newCompany, estado: e.target.value as any })}
                    className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-3 py-2 text-xs text-[var(--c-text)]"
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
                    className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-3 py-2 text-xs text-[var(--c-text)]"
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
                    className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-3 py-2 text-xs text-[var(--c-text)]"
                  >
                    <option value="">Sin definir</option>
                    <option value="verde">Verde (Óptima)</option>
                    <option value="amarillo">Amarillo (Alerta)</option>
                    <option value="rojo">Rojo (En riesgo)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--c-text-2)] mb-1">
                    Fee Mensual (CLP)
                  </label>
                  <input
                    type="number"
                    placeholder="Ej: 1500000"
                    value={newCompany.fee_mensual_clp}
                    onChange={(e) => setNewCompany({ ...newCompany, fee_mensual_clp: e.target.value })}
                    className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-3 py-2 text-xs text-[var(--c-text)] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--c-text-2)] mb-1">Industria</label>
                  <select
                    value={newCompany.industria_id}
                    onChange={(e) => setNewCompany({ ...newCompany, industria_id: e.target.value })}
                    className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-3 py-2 text-xs text-[var(--c-text)]"
                  >
                    {industrias.map((ind) => (
                      <option key={ind.id} value={ind.id}>
                        {ind.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--c-text-2)] mb-1">Responsable</label>
                  <select
                    value={newCompany.responsable_id}
                    onChange={(e) =>
                      setNewCompany({ ...newCompany, responsable_id: e.target.value })
                    }
                    className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-3 py-2 text-xs text-[var(--c-text)]"
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
                    className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-3 py-2 text-xs text-[var(--c-text)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-2 gap-3">
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
                    className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-3 py-2 text-xs text-[var(--c-text)]"
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
                    className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-3 py-2 text-xs text-[var(--c-text)]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-[var(--c-line)]">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-3 py-2 text-xs text-[var(--c-muted)] hover:text-[var(--c-text)]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-[var(--c-accent)] text-black rounded"
                >
                  Guardar cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
