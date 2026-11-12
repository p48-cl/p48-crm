import { fondoCerrable } from '../../lib/fondo';
import React, { useState } from 'react';
import { Clock, Phone, Video, FileText, Mail, X, Trash2 } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { Actividad, TipoActividad } from '../../types/crm';

interface ActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  empresaIdInicial?: string;
  oportunidadIdInicial?: string;
  actividadEditar?: Actividad | null; // si viene, el modal edita en vez de crear
}

export const ActivityModal: React.FC<ActivityModalProps> = ({
  isOpen,
  onClose,
  empresaIdInicial,
  oportunidadIdInicial,
  actividadEditar,
}) => {
  const { empresas, oportunidades, contactos, registrarActividad, actualizarActividad, eliminarActividad } = useCRM();
  const { isAdmin } = useAuth();
  const editando = !!actividadEditar;

  const [tipo, setTipo] = useState<TipoActividad>(actividadEditar?.tipo ?? 'llamada');
  const [empresaId, setEmpresaId] = useState(actividadEditar?.empresa_id ?? empresaIdInicial ?? '');
  const [oportunidadId, setOportunidadId] = useState(actividadEditar?.oportunidad_id ?? oportunidadIdInicial ?? '');
  const [contactoId, setContactoId] = useState(actividadEditar?.contacto_id ?? '');
  const [titulo, setTitulo] = useState(actividadEditar?.titulo ?? '');
  const [descripcion, setDescripcion] = useState(actividadEditar?.descripcion ?? '');
  const [resultado, setResultado] = useState(actividadEditar?.resultado ?? '');
  const [fechaActividad, setFechaActividad] = useState(
    actividadEditar ? actividadEditar.fecha_actividad.slice(0, 16) : new Date().toISOString().slice(0, 16),
  );

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;

    // En edición se envía null para que un campo vaciado se borre en la base
    const payload = {
      tipo,
      titulo,
      descripcion,
      resultado: resultado || null,
      fecha_actividad: new Date(fechaActividad).toISOString(),
      empresa_id: empresaId || null,
      oportunidad_id: oportunidadId || null,
      contacto_id: contactoId || null,
    };

    if (actividadEditar) {
      await actualizarActividad(actividadEditar.id, payload as Partial<Actividad>);
    } else {
      await registrarActividad({ ...payload, resultado: resultado || undefined, empresa_id: empresaId || undefined, oportunidad_id: oportunidadId || undefined, contacto_id: contactoId || undefined });
      setTitulo('');
      setDescripcion('');
      setResultado('');
    }
    onClose();
  };

  const handleEliminar = async () => {
    if (!actividadEditar) return;
    if (!window.confirm('¿Eliminar esta actividad? No se puede deshacer.')) return;
    await eliminarActividad(actividadEditar.id);
    onClose();
  };

  const contactosFiltrados = empresaId
    ? contactos.filter((c) => c.empresa_id === empresaId && !c.archivado)
    : contactos.filter((c) => !c.archivado);

  const oportunidadesFiltradas = empresaId
    ? oportunidades.filter((o) => o.empresa_id === empresaId && !o.archivado)
    : oportunidades.filter((o) => !o.archivado);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" {...fondoCerrable(onClose)}>
      <div className="bg-[var(--c-surface)] border border-[var(--c-line)] rounded-xl max-w-lg w-full p-4 sm:p-6 shadow-2xl max-h-[92dvh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[var(--c-accent)]/15 flex items-center justify-center text-[var(--c-accent)]">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--c-text)]">{editando ? 'Editar Actividad' : 'Registrar Actividad'}</h2>
              <p className="text-xs text-[var(--c-muted)]">Bitácora de contacto comercial</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[var(--c-muted)] hover:text-[var(--c-text)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selector de Tipo de Actividad */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {[
            { id: 'llamada' as const, label: 'Llamada', icon: Phone },
            { id: 'reunion' as const, label: 'Reunión', icon: Video },
            { id: 'nota' as const, label: 'Nota', icon: FileText },
            { id: 'correo_manual' as const, label: 'Correo', icon: Mail },
          ].map((item) => {
            const Icon = item.icon;
            const active = tipo === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTipo(item.id)}
                className={`py-2 px-2 rounded border text-xs font-medium flex flex-col items-center gap-1 transition-colors ${
                  active
                    ? 'bg-[var(--c-surface-2)] border-[var(--c-accent)] text-[var(--c-accent)]'
                    : 'bg-[var(--c-surface)] border-[var(--c-surface-3)] text-[var(--c-muted)] hover:text-[var(--c-text)]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-[var(--c-text)] mb-1">
              Título / Resumen <span className="text-[var(--c-accent)]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Llamada de alineación de presupuesto Google Ads"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-3 py-2 text-xs text-[var(--c-text)]"
            />
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--c-text-2)] mb-1">Cliente</label>
              <select
                value={empresaId}
                onChange={(e) => setEmpresaId(e.target.value)}
                className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-3 py-2 text-xs text-[var(--c-text)]"
              >
                <option value="">Selecciona empresa...</option>
                {empresas.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--c-text-2)] mb-1">Negocio</label>
              <select
                value={oportunidadId}
                onChange={(e) => setOportunidadId(e.target.value)}
                className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-3 py-2 text-xs text-[var(--c-text)]"
              >
                <option value="">(Opcional) Asociar negocio...</option>
                {oportunidadesFiltradas.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--c-text-2)] mb-1">Contacto</label>
              <select
                value={contactoId}
                onChange={(e) => setContactoId(e.target.value)}
                className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-3 py-2 text-xs text-[var(--c-text)]"
              >
                <option value="">(Opcional) Persona...</option>
                {contactosFiltrados.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} {c.apellido}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--c-text-2)] mb-1">Fecha y Hora</label>
              <input
                type="datetime-local"
                value={fechaActividad}
                onChange={(e) => setFechaActividad(e.target.value)}
                className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-3 py-1.5 text-xs text-[var(--c-text)] font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--c-text-2)] mb-1">Descripción / Minuta</label>
            <textarea
              rows={3}
              placeholder="Detalle de los puntos acordados o conclusiones..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded p-2.5 text-xs text-[var(--c-text)]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--c-text-2)] mb-1">Resultado / Acuerdo</label>
            <input
              type="text"
              placeholder="Ej: Aceptaron auditoría técnica sin costo previo a fee"
              value={resultado}
              onChange={(e) => setResultado(e.target.value)}
              className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-3 py-2 text-xs text-[var(--c-text)]"
            />
          </div>

          <div className="flex items-center gap-2.5 pt-3 border-t border-[var(--c-line)]">
            {editando && isAdmin && (
              <button
                type="button"
                onClick={handleEliminar}
                className="px-3 py-2 text-xs text-[var(--c-danger)] hover:bg-[var(--c-surface-3)] rounded flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar
              </button>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs text-[var(--c-muted)] hover:text-[var(--c-text)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold bg-[var(--c-accent)] text-black rounded"
            >
              {editando ? 'Guardar cambios' : 'Guardar Actividad'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
