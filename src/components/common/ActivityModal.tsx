import React, { useState } from 'react';
import { Clock, Phone, Video, FileText, Mail, X } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { TipoActividad } from '../../types/crm';

interface ActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  empresaIdInicial?: string;
  oportunidadIdInicial?: string;
}

export const ActivityModal: React.FC<ActivityModalProps> = ({
  isOpen,
  onClose,
  empresaIdInicial,
  oportunidadIdInicial,
}) => {
  const { empresas, oportunidades, contactos, registrarActividad } = useCRM();

  const [tipo, setTipo] = useState<TipoActividad>('llamada');
  const [empresaId, setEmpresaId] = useState(empresaIdInicial || '');
  const [oportunidadId, setOportunidadId] = useState(oportunidadIdInicial || '');
  const [contactoId, setContactoId] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [resultado, setResultado] = useState('');
  const [fechaActividad, setFechaActividad] = useState(new Date().toISOString().slice(0, 16));

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;

    await registrarActividad({
      tipo,
      titulo,
      descripcion,
      resultado: resultado || undefined,
      fecha_actividad: new Date(fechaActividad).toISOString(),
      empresa_id: empresaId || undefined,
      oportunidad_id: oportunidadId || undefined,
      contacto_id: contactoId || undefined,
    });

    onClose();
    setTitulo('');
    setDescripcion('');
    setResultado('');
  };

  const contactosFiltrados = empresaId
    ? contactos.filter((c) => c.empresa_id === empresaId && !c.archivado)
    : contactos.filter((c) => !c.archivado);

  const oportunidadesFiltradas = empresaId
    ? oportunidades.filter((o) => o.empresa_id === empresaId && !o.archivado)
    : oportunidades.filter((o) => !o.archivado);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[var(--c-surface)] border border-[var(--c-line)] rounded-xl max-w-lg w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[var(--c-accent)]/15 flex items-center justify-center text-[var(--c-accent)]">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--c-text)]">Registrar Actividad</h2>
              <p className="text-xs text-[var(--c-muted)]">Bitácora de contacto comercial</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[var(--c-muted)] hover:text-[var(--c-text)]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selector de Tipo de Actividad */}
        <div className="grid grid-cols-4 gap-2 mb-4">
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

          <div className="grid grid-cols-2 gap-3">
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

          <div className="grid grid-cols-2 gap-3">
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
              Guardar Actividad
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
