import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { parseSupabaseError } from '../../lib/errorHandler';
import { useAuth } from '../../context/AuthContext';
import { useCRM } from '../../context/CRMContext';
import type { TipoProyecto } from '../../types/crm';
import { PLANTILLAS, planificar } from './plantillas';
import { hoyIso } from './fechas';

const campo = 'w-full px-2.5 py-1.5 text-sm bg-[var(--c-field)] border border-[var(--c-line)] rounded text-[var(--c-text)]';
const etiqueta = 'block text-[11px] font-mono uppercase tracking-wider text-[var(--c-muted)] mb-1';

interface Props {
  onCerrar: () => void;
  onCreado: (proyectoId: string) => void;
  empresaIdInicial?: string;
  /** Fija el tipo y oculta el selector (por ejemplo, 'interno' desde Agencia). */
  tipoFijo?: TipoProyecto;
}

export const NuevoProyectoModal: React.FC<Props> = ({ onCerrar, onCreado, empresaIdInicial, tipoFijo }) => {
  const { currentUser, isAdmin } = useAuth();
  const { empresas, miembros, refetchTodo } = useCRM();
  const [tipo, setTipo] = useState<TipoProyecto>(tipoFijo ?? (empresaIdInicial ? 'cliente' : 'interno'));
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [empresaId, setEmpresaId] = useState(empresaIdInicial ?? '');
  const [inicio, setInicio] = useState(hoyIso());
  const [fin, setFin] = useState('');
  const [plantillaId, setPlantillaId] = useState('');
  const [responsableId, setResponsableId] = useState(currentUser?.id ?? '');
  const [colaboradores, setColaboradores] = useState<string[]>([]);
  const [visibleCliente, setVisibleCliente] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientes = useMemo(() => empresas.filter((e) => e.estado === 'cliente' && !e.archivado), [empresas]);
  const activos = useMemo(() => miembros.filter((m) => m.activo), [miembros]);
  const plantillas = PLANTILLAS.filter((p) => p.tipo === tipo);
  const plantilla = PLANTILLAS.find((p) => p.id === plantillaId && p.tipo === tipo);
  const plan = useMemo(() => (plantilla && inicio ? planificar(plantilla, inicio) : null), [plantilla, inicio]);

  const crear = async () => {
    if (!supabase || !currentUser) return;
    if (!nombre.trim()) return setError('Falta el nombre del proyecto.');
    if (tipo === 'cliente' && !empresaId) return setError('Elige el cliente del proyecto.');
    if (!plan && !inicio) return setError('Falta la fecha de inicio.');
    if (fin && inicio && fin < inicio) return setError('La fecha de entrega es anterior al inicio.');
    setGuardando(true);
    setError(null);
    try {
      // 1) Proyecto: lo crea quien lo está usando (así lo ve de inmediato) y después se asigna el responsable
      const { data: proy, error: e1 } = await supabase
        .from('proyectos')
        .insert({
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || null,
          tipo,
          empresa_id: tipo === 'cliente' ? empresaId : null,
          estado: 'planificado',
          fecha_inicio: inicio || null,
          fecha_fin: (plan?.fin ?? fin) || null,
          visible_cliente: tipo === 'cliente' && visibleCliente,
          plantilla: plantilla?.id ?? null,
          responsable_id: currentUser.id,
        })
        .select('id')
        .single();
      if (e1 || !proy) throw e1 ?? new Error('No se pudo crear el proyecto.');
      const pid = (proy as { id: string }).id;

      // 2) Miembros
      const colab = colaboradores.filter((id) => id !== currentUser.id && id !== responsableId);
      const filasMiembros = [{ proyecto_id: pid, miembro_id: currentUser.id, rol: 'responsable' as const },
        ...colab.map((id) => ({ proyecto_id: pid, miembro_id: id, rol: 'colaborador' as const }))];
      const { error: e2 } = await supabase.from('proyecto_miembros').insert(filasMiembros);
      if (e2) throw e2;

      // 3) Fases, tareas y dependencias de la plantilla
      if (plantilla && plan) {
        const { data: fasesCreadas, error: e3 } = await supabase
          .from('proyecto_fases')
          .insert(plan.fases.map((f, i) => ({ proyecto_id: pid, nombre: f.nombre, orden: i, fecha_inicio: f.inicio, fecha_fin: f.fin })))
          .select('id, orden');
        if (e3 || !fasesCreadas) throw e3 ?? new Error('No se crearon las fases.');
        const idFase = new Map((fasesCreadas as { id: string; orden: number }[]).map((f) => [f.orden, f.id]));
        const { data: tareasCreadas, error: e4 } = await supabase
          .from('tareas')
          .insert(plan.tareas.map((t) => ({
            titulo: t.titulo,
            proyecto_id: pid,
            fase_id: idFase.get(t.fase) ?? null,
            empresa_id: tipo === 'cliente' ? empresaId : null,
            responsable_id: currentUser.id,
            fecha_inicio: t.inicio,
            fecha_vencimiento: t.fin,
            prioridad: 'media',
            completada: false,
          })))
          .select('id, titulo, fecha_vencimiento');
        if (e4 || !tareasCreadas) throw e4 ?? new Error('No se crearon las tareas.');
        // El insert devuelve las filas en el mismo orden en que se enviaron
        const ids = (tareasCreadas as { id: string }[]).map((t) => t.id);
        const deps = plan.tareas.flatMap((t, i) => (t.dependeDe !== null ? [{ tarea_id: ids[i], depende_de_id: ids[t.dependeDe] }] : []));
        if (deps.length > 0) {
          const { error: e5 } = await supabase.from('tarea_dependencias').insert(deps);
          if (e5) throw e5;
        }
      }

      // 4) Responsable distinto de quien crea (solo admin): se cambia al final, ya con todo asignado
      if (isAdmin && responsableId && responsableId !== currentUser.id) {
        await supabase.from('proyecto_miembros').upsert({ proyecto_id: pid, miembro_id: responsableId, rol: 'responsable' });
        await supabase.from('proyecto_miembros').update({ rol: 'colaborador' }).eq('proyecto_id', pid).eq('miembro_id', currentUser.id);
        const { error: e6 } = await supabase.from('proyectos').update({ responsable_id: responsableId }).eq('id', pid);
        if (e6) throw e6;
      }

      await refetchTodo();
      onCreado(pid);
    } catch (e) {
      setError(parseSupabaseError(e));
    } finally {
      setGuardando(false);
    }
  };

  const alternar = (id: string) => setColaboradores((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="bg-[var(--c-surface)] border border-[var(--c-line)] rounded-xl max-w-xl w-full p-4 sm:p-6 shadow-2xl max-h-[92dvh] overflow-y-auto" role="dialog" aria-label="Nuevo proyecto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-[var(--c-text)]">Nuevo proyecto</h2>
          <button onClick={onCerrar} aria-label="Cerrar" className="text-[var(--c-muted)] hover:text-[var(--c-text)]"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-3">
          <div role="group" aria-label="Tipo" className={tipoFijo ? 'hidden' : 'grid grid-cols-2 gap-2'}>
            {([['interno', 'Interno de la agencia'], ['cliente', 'De cliente']] as const).map(([k, t]) => (
              <button key={k} type="button" aria-pressed={tipo === k} onClick={() => { setTipo(k); setPlantillaId(''); }} className={`px-3 py-2 text-xs rounded border ${tipo === k ? 'border-[var(--module)] bg-[var(--module-soft)] text-[var(--c-text)] font-semibold' : 'border-[var(--c-line)] text-[var(--c-muted)]'}`}>{t}</button>
            ))}
          </div>

          <div><label className={etiqueta} htmlFor="p-nombre">Nombre</label><input id="p-nombre" className={campo} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder={tipo === 'interno' ? 'Remodelar sitio web P48' : 'Implementar GA4'} /></div>

          {tipo === 'cliente' && (
            <div>
              <label className={etiqueta} htmlFor="p-cliente">Cliente</label>
              <select id="p-cliente" className={campo} value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}>
                <option value="">Elegir cliente…</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className={etiqueta} htmlFor="p-plantilla">Plantilla</label>
            <select id="p-plantilla" className={campo} value={plantillaId} onChange={(e) => setPlantillaId(e.target.value)}>
              <option value="">Proyecto vacío</option>
              {plantillas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
            {plantilla && <p className="text-[11px] text-[var(--c-muted)] mt-1">{plantilla.descripcion} Fechas en días hábiles, con tareas encadenadas.</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className={etiqueta} htmlFor="p-ini">Inicio</label><input id="p-ini" type="date" className={campo} value={inicio} onChange={(e) => setInicio(e.target.value)} /></div>
            <div>
              <label className={etiqueta} htmlFor="p-fin">Entrega</label>
              <input id="p-fin" type="date" className={campo} value={plan?.fin ?? fin} disabled={Boolean(plan)} onChange={(e) => setFin(e.target.value)} />
            </div>
          </div>

          <div><label className={etiqueta} htmlFor="p-desc">Descripción</label><textarea id="p-desc" rows={2} className={campo} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} /></div>

          {isAdmin && (
            <div>
              <label className={etiqueta} htmlFor="p-resp">Responsable</label>
              <select id="p-resp" className={campo} value={responsableId} onChange={(e) => setResponsableId(e.target.value)}>
                {activos.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
            </div>
          )}

          {activos.filter((m) => m.id !== currentUser?.id && m.id !== responsableId).length > 0 && (
            <div>
              <p className={etiqueta}>Quién más lo ve y trabaja en él</p>
              <div className="flex flex-wrap gap-2">
                {activos.filter((m) => m.id !== currentUser?.id && m.id !== responsableId).map((m) => (
                  <label key={m.id} className="flex items-center gap-1.5 text-xs text-[var(--c-text-2)] px-2 py-1 rounded border border-[var(--c-line)]">
                    <input type="checkbox" checked={colaboradores.includes(m.id)} onChange={() => alternar(m.id)} />
                    {m.nombre}
                  </label>
                ))}
              </div>
            </div>
          )}

          {tipo === 'cliente' && (
            <label className="flex items-start gap-2 text-xs text-[var(--c-text-2)]">
              <input type="checkbox" className="mt-0.5" checked={visibleCliente} onChange={(e) => setVisibleCliente(e.target.checked)} />
              <span>Mostrar en el portal del cliente (verá el proyecto y sus fases, no las tareas internas). Se puede cambiar después.</span>
            </label>
          )}

          <p className="text-[11px] text-[var(--c-muted)]">Solo el responsable, los miembros elegidos y los admin verán este proyecto y sus tareas.</p>
          {error && <p className="text-xs text-[var(--c-danger)] border border-[var(--c-danger)]/40 rounded p-2">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onCerrar} className="px-3 py-1.5 text-xs text-[var(--c-muted)] hover:text-[var(--c-text)]">Cancelar</button>
          <button onClick={crear} disabled={guardando} className="px-4 py-1.5 text-xs font-semibold rounded bg-[var(--c-accent)] text-[var(--c-on-accent)] disabled:opacity-50">{guardando ? 'Creando…' : 'Crear proyecto'}</button>
        </div>
      </div>
    </div>
  );
};
