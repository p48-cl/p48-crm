import React, { useState } from 'react';
import {
  Sliders,
  Users,
  Award,
  Layers,
  Plus,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Edit2,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCRM } from '../context/CRMContext';
import { Miembro, CriterioCalificacion, CatalogoItem } from '../types/crm';
import { formatFecha } from '../lib/formatters';

export const AdminView: React.FC = () => {
  const { isAdmin } = useAuth();
  const {
    miembros,
    crearMiembro,
    actualizarRolMiembro,
    desactivarMiembro,
    activarMiembro,
    plantilla,
    criterios,
    guardarCriterioPlantilla,
    fuentes,
    motivosPerdida,
    industrias,
    agregarItemCatalogo,
    actualizarItemCatalogo,
    oportunidades,
    empresas,
  } = useCRM();

  const [activeTab, setActiveTab] = useState<'miembros' | 'calificacion' | 'catalogos'>('miembros');

  // Estado para nuevo miembro
  const [showNewMemberModal, setShowNewMemberModal] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'admin' | 'miembro'>('miembro');

  // Estado para modal de reasignación al desactivar miembro
  const [desactivandoMiembro, setDesactivandoMiembro] = useState<Miembro | null>(null);
  const [sustitutoId, setSustitutoId] = useState<string>('');

  // Estado para nuevo o editando criterio
  const [showNewCriterio, setShowNewCriterio] = useState(false);
  const [criterioEditando, setCriterioEditando] = useState<Partial<CriterioCalificacion> | null>(null);
  const [nuevoCriterio, setNuevoCriterio] = useState<Partial<CriterioCalificacion>>({
    pregunta: '',
    tipo: 'si_no',
    peso: 20,
    es_eliminatorio: false,
  });

  // Estado para nuevo ítem en catálogo
  const [nuevoItemTexto, setNuevoItemTexto] = useState('');
  const [catalogoActivo, setCatalogoActivo] = useState<'fuentes' | 'motivos' | 'industrias'>('fuentes');
  const [editandoItemCatalogo, setEditandoItemCatalogo] = useState<{ id: string; nombre: string } | null>(null);

  if (!isAdmin) {
    return (
      <div className="p-12 text-center max-w-md mx-auto space-y-3">
        <ShieldAlert className="w-10 h-10 text-[var(--c-danger)] mx-auto" />
        <h2 className="text-base font-bold text-[var(--c-text)] font-sans">Acceso Denegado</h2>
        <p className="text-xs text-[var(--c-muted)]">
          Esta sección está restringida exclusivamente a usuarios con rol de Administrador.
        </p>
      </div>
    );
  }

  // Desactivar miembro con flujo de reasignación
  const handleToggleActivo = (m: Miembro) => {
    if (m.activo) {
      // Si se desactiva, verificar si tiene registros asignados
      const opsDelMiembro = oportunidades.filter((o) => o.responsable_id === m.id && !o.archivado);
      const empsDelMiembro = empresas.filter((e) => e.responsable_id === m.id && !e.archivado);

      if (opsDelMiembro.length > 0 || empsDelMiembro.length > 0) {
        setDesactivandoMiembro(m);
        const otro = miembros.find((x) => x.id !== m.id && x.activo);
        setSustitutoId(otro?.id || '');
        return;
      }

      desactivarMiembro(m.id, '');
    } else {
      activarMiembro(m.id);
    }
  };

  const handleConfirmarReasignacion = async () => {
    if (!desactivandoMiembro || !sustitutoId) return;

    await desactivarMiembro(desactivandoMiembro.id, sustitutoId);
    setDesactivandoMiembro(null);
  };

  const handleCrearMiembroSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberEmail.trim() || !newMemberName.trim()) return;

    await crearMiembro(newMemberEmail, newMemberName, newMemberRole);
    setNewMemberEmail('');
    setNewMemberName('');
    setNewMemberRole('miembro');
    setShowNewMemberModal(false);
  };

  const handleGuardarCriterio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoCriterio.pregunta?.trim()) return;

    await guardarCriterioPlantilla({
      id: criterioEditando?.id,
      pregunta: nuevoCriterio.pregunta.trim(),
      tipo: nuevoCriterio.tipo || 'si_no',
      peso: Number(nuevoCriterio.peso) || 10,
      es_eliminatorio: Boolean(nuevoCriterio.es_eliminatorio),
      orden: criterioEditando?.orden || (criterios.length + 1),
    });

    setShowNewCriterio(false);
    setCriterioEditando(null);
    setNuevoCriterio({
      pregunta: '',
      tipo: 'si_no',
      peso: 20,
      es_eliminatorio: false,
    });
  };

  const handleIniciarEdicionCriterio = (c: CriterioCalificacion) => {
    setCriterioEditando(c);
    setNuevoCriterio({
      pregunta: c.pregunta,
      tipo: c.tipo,
      peso: c.peso,
      es_eliminatorio: c.es_eliminatorio,
      orden: c.orden,
    });
    setShowNewCriterio(true);
  };

  const handleAgregarCatalogo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoItemTexto.trim()) return;
    await agregarItemCatalogo(catalogoActivo, nuevoItemTexto.trim());
    setNuevoItemTexto('');
  };

  const handleGuardarEdicionCatalogo = async (item: CatalogoItem) => {
    if (!editandoItemCatalogo || !editandoItemCatalogo.nombre.trim()) return;
    await actualizarItemCatalogo(catalogoActivo, item.id, { nombre: editandoItemCatalogo.nombre.trim() });
    setEditandoItemCatalogo(null);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold font-sans text-[var(--c-text)] dark:text-[var(--c-text)] light:text-[var(--c-text)]">
          Administración del Sistema
        </h1>
        <p className="text-xs text-[var(--c-muted)] mt-0.5">
          Configuración interna de P48 · Miembros, criterios de calificación y catálogos comerciales
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[var(--c-line)] pb-1 text-xs font-medium">
        {[
          { id: 'miembros' as const, label: 'Miembros del Equipo', icon: Users },
          { id: 'calificacion' as const, label: 'Criterios de Calificación', icon: Award },
          { id: 'catalogos' as const, label: 'Catálogos Comerciales', icon: Layers },
        ].map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`py-2 px-3.5 rounded-t border-b-2 flex items-center gap-2 transition-colors ${
                active
                  ? 'border-[var(--c-accent)] text-[var(--c-accent)] font-semibold'
                  : 'border-transparent text-[var(--c-muted)] hover:text-[var(--c-text)]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: MIEMBROS */}
      {activeTab === 'miembros' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-[var(--c-text)]">
                Gestión de Miembros y Roles
              </h3>
              <p className="text-[11px] text-[var(--c-muted)]">
                {miembros.length} colaboradores · El acceso Google Auth valida contra esta tabla
              </p>
            </div>

            <button
              onClick={() => setShowNewMemberModal(true)}
              className="bg-[var(--c-accent)] hover:bg-[var(--c-accent-hover)] active:scale-[0.98] text-[var(--c-on-accent)] font-semibold text-xs py-2 px-3.5 rounded flex items-center gap-1.5 transition-all shadow-sm font-sans"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Nuevo Miembro</span>
            </button>
          </div>

          <div className="bg-[var(--c-surface)] rounded-lg border border-[var(--c-line)] overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--c-surface-2)] border-b border-[var(--c-line)] text-[var(--c-muted)] uppercase font-mono text-[10px]">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Miembro</th>
                  <th className="py-2.5 px-3 font-medium">Email</th>
                  <th className="py-2.5 px-3 font-medium">Rol</th>
                  <th className="py-2.5 px-3 font-medium">Estado</th>
                  <th className="py-2.5 px-3 text-right font-medium">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--c-line)]">
                {miembros.map((m) => (
                  <tr key={m.id} className="hover:bg-[var(--c-surface-2)] transition-colors">
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded bg-[var(--c-surface-3)] text-[var(--c-accent)] font-bold text-xs flex items-center justify-center font-mono">
                          {m.nombre.slice(0, 1)}
                        </div>
                        <span className="font-semibold text-[var(--c-text)]">{m.nombre}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[var(--c-text-2)]">{m.email}</td>
                    <td className="py-2.5 px-3">
                      <select
                        value={m.rol}
                        onChange={(e) =>
                          actualizarRolMiembro(m.id, e.target.value as 'admin' | 'miembro')
                        }
                        className="bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-2 py-1 text-xs text-[var(--c-text)]"
                      >
                        <option value="admin">admin</option>
                        <option value="miembro">miembro</option>
                      </select>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px]">
                      {m.activo ? (
                        <span className="text-[var(--c-accent)] flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          <span>Activo</span>
                        </span>
                      ) : (
                        <span className="text-[var(--c-muted)] flex items-center gap-1 line-through">
                          <XCircle className="w-3 h-3" />
                          <span>Inactivo</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleToggleActivo(m)}
                        className="px-2.5 py-1 text-[11px] rounded bg-[var(--c-surface-3)] hover:bg-[var(--c-surface-2)] text-[var(--c-line)] transition-colors"
                      >
                        {m.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Modal Nuevo Miembro */}
          {showNewMemberModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div className="bg-[var(--c-surface)] border border-[var(--c-line)] rounded-lg max-w-md w-full p-6 shadow-2xl">
                <h3 className="text-base font-bold text-[var(--c-text)] mb-1">Registrar Nuevo Miembro</h3>
                <p className="text-xs text-[var(--c-muted)] mb-4">
                  El usuario podrá iniciar sesión con su cuenta Google corporativa.
                </p>

                <form onSubmit={handleCrearMiembroSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-[var(--c-text)] mb-1">Nombre Completo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Carolina Henríquez"
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-3 py-2 text-xs text-[var(--c-text)]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--c-text)] mb-1">Email Corporativo (Google Auth) *</label>
                    <input
                      type="email"
                      required
                      placeholder="nombre@p48.cl"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-3 py-2 text-xs text-[var(--c-text)] font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--c-text)] mb-1">Rol en CRM</label>
                    <select
                      value={newMemberRole}
                      onChange={(e) => setNewMemberRole(e.target.value as 'admin' | 'miembro')}
                      className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-3 py-2 text-xs text-[var(--c-text)]"
                    >
                      <option value="miembro">Miembro (Comercial / Operativo)</option>
                      <option value="admin">Admin (Acceso total & Administración)</option>
                    </select>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-[var(--c-line)]">
                    <button
                      type="button"
                      onClick={() => setShowNewMemberModal(false)}
                      className="px-3 py-1.5 text-xs text-[var(--c-muted)] hover:text-[var(--c-text)]"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-semibold bg-[var(--c-accent)] text-black rounded"
                    >
                      Guardar Miembro
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CRITERIOS DE CALIFICACIÓN (Solo 1 plantilla activa) */}
      {activeTab === 'calificacion' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold text-[var(--c-text)]">
                  {plantilla?.nombre || 'Plantilla de Calificación P48'}
                </h3>
                <span className="font-mono text-[10px] text-[var(--c-accent)] bg-[var(--c-accent)]/15 px-1.5 py-0.2 rounded">
                  Única Plantilla Activa
                </span>
              </div>
              <p className="text-[11px] text-[var(--c-muted)] mt-0.5">
                Criterios de evaluación para oportunidades de performance marketing B2B
              </p>
            </div>

            <button
              onClick={() => {
                setCriterioEditando(null);
                setNuevoCriterio({
                  pregunta: '',
                  tipo: 'si_no',
                  peso: 20,
                  es_eliminatorio: false,
                });
                setShowNewCriterio(!showNewCriterio);
              }}
              className="bg-[var(--c-accent)] hover:bg-[var(--c-accent-hover)] text-[var(--c-on-accent)] font-semibold text-xs py-1.5 px-3 rounded flex items-center gap-1.5 transition-colors font-sans"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar Criterio</span>
            </button>
          </div>

          {showNewCriterio && (
            <form
              onSubmit={handleGuardarCriterio}
              className="p-4 bg-[var(--c-surface)] rounded-lg border border-[var(--c-line)] space-y-3"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[var(--c-text)]">
                  {criterioEditando ? 'Editar Criterio' : 'Nuevo Criterio de Calificación'}
                </h4>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--c-text)] mb-1">
                  Pregunta o Criterio *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: ¿Inversión mínima en Google Ads >= $ 2.5M CLP / mes?"
                  value={nuevoCriterio.pregunta || ''}
                  onChange={(e) => setNuevoCriterio({ ...nuevoCriterio, pregunta: e.target.value })}
                  className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-3 py-1.5 text-xs text-[var(--c-text)]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] text-[var(--c-text-2)] mb-1">Tipo de Respuesta</label>
                  <select
                    value={nuevoCriterio.tipo}
                    onChange={(e) => setNuevoCriterio({ ...nuevoCriterio, tipo: e.target.value as any })}
                    className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-2.5 py-1 text-xs text-[var(--c-text)]"
                  >
                    <option value="si_no">Sí / No</option>
                    <option value="puntaje_1_5">Puntaje 1 a 5</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-[var(--c-text-2)] mb-1">Peso (Puntos)</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={nuevoCriterio.peso || 10}
                    onChange={(e) => setNuevoCriterio({ ...nuevoCriterio, peso: Number(e.target.value) })}
                    className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-2.5 py-1 text-xs text-[var(--c-text)] font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <input
                    type="checkbox"
                    id="es_elim_chk"
                    checked={nuevoCriterio.es_eliminatorio || false}
                    onChange={(e) =>
                      setNuevoCriterio({ ...nuevoCriterio, es_eliminatorio: e.target.checked })
                    }
                    className="rounded border-[var(--c-line)] bg-[var(--c-surface-2)] text-[var(--c-danger)]"
                  />
                  <label htmlFor="es_elim_chk" className="text-xs text-[var(--c-danger)] font-semibold">
                    Criterio Eliminatorio
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--c-line)]">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewCriterio(false);
                    setCriterioEditando(null);
                  }}
                  className="px-2.5 py-1 text-xs text-[var(--c-muted)] hover:text-[var(--c-text)]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1 text-xs font-semibold bg-[var(--c-accent)] text-black rounded"
                >
                  {criterioEditando ? 'Actualizar Criterio' : 'Guardar Criterio'}
                </button>
              </div>
            </form>
          )}

          <div className="bg-[var(--c-surface)] rounded-lg border border-[var(--c-line)] overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--c-surface-2)] border-b border-[var(--c-line)] text-[var(--c-muted)] uppercase font-mono text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Orden</th>
                  <th className="py-2.5 px-4">Criterio / Pregunta</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3">Peso</th>
                  <th className="py-2.5 px-3">Eliminatorio</th>
                  <th className="py-2.5 px-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--c-line)]">
                {criterios.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-xs text-[var(--c-muted)]">
                      No hay criterios configurados en la plantilla activa.
                    </td>
                  </tr>
                ) : (
                  criterios.map((c) => (
                    <tr key={c.id} className="hover:bg-[var(--c-surface-2)]">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-[var(--c-muted)]">0{c.orden}</td>
                      <td className="py-2.5 px-4 font-medium text-[var(--c-text)]">{c.pregunta}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-[var(--c-text-2)]">
                        {c.tipo === 'si_no' ? 'Sí / No' : '1 a 5'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[var(--c-accent)] font-bold">{c.peso} pts</td>
                      <td className="py-2.5 px-3">
                        {c.es_eliminatorio ? (
                          <span className="text-[var(--c-danger)] font-mono text-[10px] font-bold">
                            ELIMINATORIO
                          </span>
                        ) : (
                          <span className="text-[var(--c-muted-2)] font-mono text-[10px]">Opcional</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handleIniciarEdicionCriterio(c)}
                          className="p-1 text-[var(--c-muted)] hover:text-[var(--c-accent)] transition-colors"
                          title="Editar Criterio"
                        >
                          <Edit2 className="w-3.5 h-3.5 inline-block" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CATÁLOGOS */}
      {activeTab === 'catalogos' && (
        <div className="space-y-6">
          <div className="flex gap-2 text-xs">
            {(
              [
                { id: 'fuentes' as const, label: 'Fuentes de Lead' },
                { id: 'motivos' as const, label: 'Motivos de Pérdida' },
                { id: 'industrias' as const, label: 'Industrias B2B' },
              ] as const
            ).map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setCatalogoActivo(c.id);
                  setEditandoItemCatalogo(null);
                }}
                className={`px-3 py-1.5 rounded transition-colors ${
                  catalogoActivo === c.id
                    ? 'bg-[var(--c-accent)] text-black font-semibold'
                    : 'bg-[var(--c-surface-2)] text-[var(--c-text-2)] hover:text-[var(--c-text)]'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleAgregarCatalogo} className="flex gap-2">
            <input
              type="text"
              placeholder={`Agregar nuevo elemento a ${
                catalogoActivo === 'fuentes'
                  ? 'Fuentes'
                  : catalogoActivo === 'motivos'
                  ? 'Motivos de Pérdida'
                  : 'Industrias'
              }...`}
              value={nuevoItemTexto}
              onChange={(e) => setNuevoItemTexto(e.target.value)}
              className="flex-1 bg-[var(--c-surface)] border border-[var(--c-line)] rounded px-3 py-2 text-xs text-[var(--c-text)]"
            />
            <button
              type="submit"
              className="bg-[var(--c-accent)] hover:bg-[var(--c-accent-hover)] text-black font-semibold text-xs px-4 py-2 rounded transition-colors font-sans"
            >
              Agregar
            </button>
          </form>

          <div className="bg-[var(--c-surface)] rounded-lg border border-[var(--c-line)] divide-y divide-[var(--c-line)]">
            {(catalogoActivo === 'fuentes'
              ? fuentes
              : catalogoActivo === 'motivos'
              ? motivosPerdida
              : industrias
            ).map((item) => (
              <div
                key={item.id}
                className="p-3 flex items-center justify-between text-xs hover:bg-[var(--c-surface-2)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] text-[var(--c-muted-2)]">#{item.orden}</span>
                  {editandoItemCatalogo?.id === item.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editandoItemCatalogo.nombre}
                        onChange={(e) =>
                          setEditandoItemCatalogo({ ...editandoItemCatalogo, nombre: e.target.value })
                        }
                        className="bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-2 py-0.5 text-xs text-[var(--c-text)]"
                      />
                      <button
                        onClick={() => handleGuardarEdicionCatalogo(item)}
                        className="text-[11px] text-[var(--c-accent)] hover:underline"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => setEditandoItemCatalogo(null)}
                        className="text-[11px] text-[var(--c-muted)] hover:text-[var(--c-text)]"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <span className={`font-medium ${item.activo ? 'text-[var(--c-text)]' : 'line-through text-[var(--c-muted-2)]'}`}>
                      {item.nombre}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditandoItemCatalogo({ id: item.id, nombre: item.nombre })}
                    className="p-1 text-[var(--c-muted)] hover:text-[var(--c-text)] transition-colors"
                    title="Editar nombre"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() =>
                      actualizarItemCatalogo(catalogoActivo, item.id, { activo: !item.activo })
                    }
                    className={`text-[11px] font-mono px-2 py-0.5 rounded transition-colors ${
                      item.activo
                        ? 'text-[var(--c-muted)] hover:text-[var(--c-danger)]'
                        : 'text-[var(--c-accent)] hover:underline'
                    }`}
                  >
                    {item.activo ? 'Desactivar' : 'Reactivar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Reasignar Registros al Desactivar Miembro (Máximo 1 alerta magenta) */}
      {desactivandoMiembro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[var(--c-surface)] border border-[var(--c-danger)]/40 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-[var(--c-danger)]">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-bold text-[var(--c-text)]">Reasignar Registros</h3>
            </div>

            <p className="text-xs text-[var(--c-text-2)] leading-relaxed">
              El colaborador <strong>{desactivandoMiembro.nombre}</strong> tiene empresas u oportunidades activas asignadas.
              Para desactivarlo, debes reasignar sus registros comerciales a otro miembro activo.
            </p>

            <div>
              <label className="block text-xs font-medium text-[var(--c-text)] mb-1">
                Reasignar todos los negocios y cuentas a:
              </label>
              <select
                value={sustitutoId}
                onChange={(e) => setSustitutoId(e.target.value)}
                className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-3 py-2 text-xs text-[var(--c-text)]"
              >
                {miembros
                  .filter((m) => m.id !== desactivandoMiembro.id && m.activo)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre} ({m.rol})
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--c-line)]">
              <button
                type="button"
                onClick={() => setDesactivandoMiembro(null)}
                className="px-3 py-1.5 text-xs text-[var(--c-muted)] hover:text-[var(--c-text)]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarReasignacion}
                className="px-4 py-1.5 text-xs font-semibold bg-[var(--c-danger)] hover:bg-[var(--c-danger)] text-[var(--c-on-accent)] rounded transition-colors"
              >
                Reasignar y Desactivar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
