import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { parseSupabaseError } from '../../lib/errorHandler';
import { useCRM } from '../../context/CRMContext';
import type { EstadoProyecto, Proyecto } from '../../types/crm';

const campo = 'w-full px-2.5 py-1.5 text-sm bg-[var(--c-field)] border border-[var(--c-line)] rounded text-[var(--c-text)]';
const etiqueta = 'block text-[11px] font-mono uppercase tracking-wider text-[var(--c-muted)] mb-1';
const ESTADOS: [EstadoProyecto, string][] = [['planificado', 'Planificado'], ['en_curso', 'En curso'], ['pausado', 'Pausado'], ['finalizado', 'Finalizado']];

interface Props {
  proyecto: Proyecto;
  onCerrar: () => void;
  onGuardado: () => Promise<void> | void;
}

export const EditarProyectoModal: React.FC<Props> = ({ proyecto, onCerrar, onGuardado }) => {
  const { miembros } = useCRM();
  const [nombre, setNombre] = useState(proyecto.nombre);
  const [descripcion, setDescripcion] = useState(proyecto.descripcion ?? '');
  const [estado, setEstado] = useState<EstadoProyecto>(proyecto.estado);
  const [responsableId, setResponsableId] = useState(proyecto.responsable_id ?? '');
  const [inicio, setInicio] = useState(proyecto.fecha_inicio ?? '');
  const [fin, setFin] = useState(proyecto.fecha_fin ?? '');
  const [visibleCliente, setVisibleCliente] = useState(proyecto.visible_cliente);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activos = miembros.filter((m) => m.activo || m.id === proyecto.responsable_id);
  const esCliente = (proyecto.tipo ?? 'cliente') === 'cliente';

  const guardar = async () => {
    if (!supabase) return;
    if (!nombre.trim()) return setError('El nombre no puede estar vacío.');
    if (inicio && fin && fin < inicio) return setError('La fecha de entrega es anterior al inicio.');
    setGuardando(true);
    setError(null);
    const { error: e } = await supabase
      .from('proyectos')
      .update({
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || null,
        estado,
        responsable_id: responsableId || null,
        fecha_inicio: inicio || null,
        fecha_fin: fin || null,
        ...(esCliente ? { visible_cliente: visibleCliente } : {}),
      })
      .eq('id', proyecto.id);
    setGuardando(false);
    if (e) return setError(parseSupabaseError(e));
    await onGuardado();
    onCerrar();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="bg-[var(--c-surface)] border border-[var(--c-line)] rounded-xl max-w-lg w-full p-4 sm:p-6 shadow-2xl max-h-[92dvh] overflow-y-auto" role="dialog" aria-label="Editar proyecto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-[var(--c-text)]">Editar proyecto</h2>
          <button onClick={onCerrar} aria-label="Cerrar" className="text-[var(--c-muted)] hover:text-[var(--c-text)]"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-3">
          <div><label className={etiqueta} htmlFor="ep-nombre">Nombre</label><input id="ep-nombre" className={campo} value={nombre} onChange={(e) => setNombre(e.target.value)} /></div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={etiqueta} htmlFor="ep-estado">Estado</label>
              <select id="ep-estado" className={campo} value={estado} onChange={(e) => setEstado(e.target.value as EstadoProyecto)}>
                {ESTADOS.map(([k, t]) => <option key={k} value={k}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={etiqueta} htmlFor="ep-resp">Responsable</label>
              <select id="ep-resp" className={campo} value={responsableId} onChange={(e) => setResponsableId(e.target.value)}>
                <option value="">Sin asignar</option>
                {activos.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className={etiqueta} htmlFor="ep-ini">Inicio</label><input id="ep-ini" type="date" className={campo} value={inicio} onChange={(e) => setInicio(e.target.value)} /></div>
            <div><label className={etiqueta} htmlFor="ep-fin">Entrega</label><input id="ep-fin" type="date" className={campo} value={fin} onChange={(e) => setFin(e.target.value)} /></div>
          </div>

          <div><label className={etiqueta} htmlFor="ep-desc">Descripción</label><textarea id="ep-desc" rows={2} className={campo} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} /></div>

          {esCliente && (
            <label className="flex items-center gap-2 text-xs text-[var(--c-text-2)]">
              <input type="checkbox" checked={visibleCliente} onChange={(e) => setVisibleCliente(e.target.checked)} />
              Visible para el cliente en el portal
            </label>
          )}

          {error && <p className="text-xs text-[var(--c-danger)] border border-[var(--c-danger)]/40 rounded p-2">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onCerrar} className="px-3 py-2 text-xs rounded border border-[var(--c-line)] text-[var(--c-muted)]">Cancelar</button>
            <button type="button" onClick={guardar} disabled={guardando} className="px-3 py-2 text-xs font-semibold rounded bg-[var(--c-accent)] text-[var(--c-on-accent)] disabled:opacity-50">
              {guardando ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
