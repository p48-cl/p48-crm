import { fondoCerrable } from '../../lib/fondo';
import React, { useState } from 'react';
import { CheckSquare, X } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { Tarea } from '../../types/crm';

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  empresaIdInicial?: string;
  oportunidadIdInicial?: string;
  tareaEditar?: Tarea | null;
}

export const NewTaskModal: React.FC<NewTaskModalProps> = ({
  isOpen,
  onClose,
  empresaIdInicial,
  oportunidadIdInicial,
  tareaEditar,
}) => {
  const { empresas, oportunidades, miembros, crearTarea, actualizarTarea } = useCRM();
  const { currentUser } = useAuth();

  const [titulo, setTitulo] = useState(tareaEditar?.titulo ?? '');
  const [descripcion, setDescripcion] = useState(tareaEditar?.descripcion ?? '');
  const [empresaId, setEmpresaId] = useState(tareaEditar?.empresa_id ?? empresaIdInicial ?? '');
  const [oportunidadId, setOportunidadId] = useState(tareaEditar?.oportunidad_id ?? oportunidadIdInicial ?? '');
  const [responsableId, setResponsableId] = useState(tareaEditar?.responsable_id ?? currentUser?.id ?? miembros[0]?.id ?? '');
  const [fechaVencimiento, setFechaVencimiento] = useState(
    tareaEditar?.fecha_vencimiento?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)
  );
  const [prioridad, setPrioridad] = useState<'alta' | 'media' | 'baja'>(tareaEditar?.prioridad ?? 'media');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;

    if (tareaEditar) {
      await actualizarTarea(tareaEditar.id, {
        titulo: titulo.trim(),
        descripcion,
        empresa_id: empresaId || null,
        oportunidad_id: oportunidadId || null,
        responsable_id: responsableId,
        fecha_vencimiento: fechaVencimiento,
        prioridad,
      });
    } else {
      await crearTarea({
        titulo: titulo.trim(),
        descripcion,
        empresa_id: empresaId || undefined,
        oportunidad_id: oportunidadId || undefined,
        responsable_id: responsableId,
        fecha_vencimiento: fechaVencimiento,
        prioridad,
        completada: false,
      });
    }

    onClose();
    setTitulo('');
    setDescripcion('');
  };

  const oportunidadesFiltradas = empresaId
    ? oportunidades.filter((o) => o.empresa_id === empresaId && !o.archivado)
    : oportunidades.filter((o) => !o.archivado);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" {...fondoCerrable(onClose)}>
      <div className="bg-[var(--c-surface)] border border-[var(--c-line)] rounded-xl max-w-md w-full p-4 sm:p-6 shadow-2xl max-h-[92dvh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[var(--c-accent)]/15 flex items-center justify-center text-[var(--c-accent)]">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--c-text)]">{tareaEditar ? 'Editar tarea' : 'Nueva Tarea'}</h2>
              <p className="text-xs text-[var(--c-muted)]">Compromiso comercial u operativo</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[var(--c-muted)] hover:text-[var(--c-text)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-[var(--c-text)] mb-1">
              Título de la tarea <span className="text-[var(--c-accent)]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Enviar propuesta de inversión en medios revisada"
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
                <option value="">(Opcional) Cliente...</option>
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
                <option value="">(Opcional) Negocio...</option>
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
              <label className="block text-xs font-medium text-[var(--c-text-2)] mb-1">Responsable</label>
              <select
                value={responsableId}
                onChange={(e) => setResponsableId(e.target.value)}
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
              <label className="block text-xs font-medium text-[var(--c-text-2)] mb-1">Prioridad</label>
              <select
                value={prioridad}
                onChange={(e) => setPrioridad(e.target.value as any)}
                className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-3 py-2 text-xs text-[var(--c-text)]"
              >
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--c-text-2)] mb-1">
              Fecha de Vencimiento <span className="text-[var(--c-accent)]">*</span>
            </label>
            <input
              type="date"
              required
              value={fechaVencimiento}
              onChange={(e) => setFechaVencimiento(e.target.value)}
              className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-3 py-1.5 text-xs text-[var(--c-text)] font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--c-text-2)] mb-1">
              Instrucciones / Notas adicionales
            </label>
            <textarea
              rows={2}
              placeholder="Detalle o enlaces de referencia..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded p-2 text-xs text-[var(--c-text)]"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--c-line)]">
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
              {tareaEditar ? 'Guardar cambios' : 'Guardar Tarea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
