import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { parseSupabaseError } from '../../lib/errorHandler';
import { useAuth } from '../../context/AuthContext';
import type { Miembro, Proyecto, ProyectoFase, Tarea, TareaDependencia } from '../../types/crm';
import { hoyIso } from './fechas';

const campo = 'w-full px-2.5 py-1.5 text-sm bg-[var(--c-field)] border border-[var(--c-line)] rounded text-[var(--c-text)]';
const etiqueta = 'block text-[11px] font-mono uppercase tracking-wider text-[var(--c-muted)] mb-1';

interface Props {
  proyecto: Proyecto;
  fases: ProyectoFase[];
  tareasProyecto: Tarea[];
  dependencias: TareaDependencia[];
  miembros: Miembro[]; // quienes pueden recibir la tarea
  tarea?: Tarea; // si viene, se edita
  faseInicial?: string;
  onCerrar: () => void;
  onGuardado: () => void;
}

// ¿predecesora depende (directa o indirectamente) de la tarea? Evita ciclos.
const generaCiclo = (tareaId: string, predecesoraId: string, deps: TareaDependencia[]) => {
  const visitadas = new Set<string>();
  const pila = [predecesoraId];
  while (pila.length) {
    const actual = pila.pop()!;
    if (actual === tareaId) return true;
    if (visitadas.has(actual)) continue;
    visitadas.add(actual);
    for (const d of deps) if (d.tarea_id === actual) pila.push(d.depende_de_id);
  }
  return false;
};

export const TareaProyectoModal: React.FC<Props> = ({ proyecto, fases, tareasProyecto, dependencias, miembros, tarea, faseInicial, onCerrar, onGuardado }) => {
  const { currentUser } = useAuth();
  const [titulo, setTitulo] = useState(tarea?.titulo ?? '');
  const [faseId, setFaseId] = useState(tarea?.fase_id ?? faseInicial ?? '');
  const [inicio, setInicio] = useState(tarea?.fecha_inicio ?? tarea?.fecha_vencimiento ?? hoyIso());
  const [fin, setFin] = useState(tarea?.fecha_vencimiento ?? hoyIso());
  const [responsable, setResponsable] = useState(tarea?.responsable_id ?? (miembros.some((m) => m.id === currentUser?.id) ? currentUser!.id : miembros[0]?.id ?? ''));
  const [prioridad, setPrioridad] = useState<Tarea['prioridad']>(tarea?.prioridad ?? 'media');
  const [descripcion, setDescripcion] = useState(tarea?.descripcion ?? '');
  const [espera, setEspera] = useState<string[]>(tarea ? dependencias.filter((d) => d.tarea_id === tarea.id).map((d) => d.depende_de_id) : []);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const candidatas = useMemo(
    () => tareasProyecto.filter((t) => t.id !== tarea?.id && !(tarea && generaCiclo(tarea.id, t.id, dependencias))),
    [tareasProyecto, tarea, dependencias],
  );
  const finMayor = espera.map((id) => tareasProyecto.find((t) => t.id === id)).filter(Boolean).reduce((m, t) => (t!.fecha_vencimiento > m ? t!.fecha_vencimiento : m), '');
  const adelantada = finMayor !== '' && inicio <= finMayor;

  const guardar = async () => {
    if (!supabase) return;
    if (!titulo.trim()) return setError('Falta el título.');
    if (!responsable) return setError('Elige un responsable.');
    if (fin < inicio) return setError('El fin es anterior al inicio.');
    setGuardando(true);
    setError(null);
    try {
      const datos = {
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || null,
        proyecto_id: proyecto.id,
        fase_id: faseId || null,
        empresa_id: proyecto.empresa_id ?? null,
        responsable_id: responsable,
        fecha_inicio: inicio,
        fecha_vencimiento: fin,
        prioridad,
      };
      let id = tarea?.id;
      if (tarea) {
        const { error: e } = await supabase.from('tareas').update(datos).eq('id', tarea.id);
        if (e) throw e;
      } else {
        const { data, error: e } = await supabase.from('tareas').insert({ ...datos, completada: false }).select('id').single();
        if (e || !data) throw e ?? new Error('No se pudo crear la tarea.');
        id = (data as { id: string }).id;
      }
      if (id) {
        const { error: e1 } = await supabase.from('tarea_dependencias').delete().eq('tarea_id', id);
        if (e1) throw e1;
        if (espera.length > 0) {
          const { error: e2 } = await supabase.from('tarea_dependencias').insert(espera.map((d) => ({ tarea_id: id, depende_de_id: d })));
          if (e2) throw e2;
        }
      }
      onGuardado();
    } catch (e) {
      setError(parseSupabaseError(e));
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async () => {
    if (!supabase || !tarea) return;
    if (!window.confirm('¿Eliminar esta tarea del proyecto? No se puede deshacer.')) return;
    const { error: e } = await supabase.from('tareas').delete().eq('id', tarea.id);
    if (e) return setError(parseSupabaseError(e));
    onGuardado();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="bg-[var(--c-surface)] border border-[var(--c-line)] rounded-xl max-w-lg w-full p-4 sm:p-6 shadow-2xl max-h-[92dvh] overflow-y-auto" role="dialog" aria-label={tarea ? 'Editar tarea' : 'Nueva tarea'}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-[var(--c-text)]">{tarea ? 'Editar tarea' : 'Nueva tarea'} · {proyecto.nombre}</h2>
          <button onClick={onCerrar} aria-label="Cerrar" className="text-[var(--c-muted)] hover:text-[var(--c-text)]"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-3">
          <div><label className={etiqueta} htmlFor="t-titulo">Título</label><input id="t-titulo" className={campo} value={titulo} onChange={(e) => setTitulo(e.target.value)} autoFocus /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={etiqueta} htmlFor="t-ini">Inicio</label><input id="t-ini" type="date" className={campo} value={inicio} onChange={(e) => { setInicio(e.target.value); if (fin < e.target.value) setFin(e.target.value); }} /></div>
            <div><label className={etiqueta} htmlFor="t-fin">Fin</label><input id="t-fin" type="date" className={campo} value={fin} min={inicio} onChange={(e) => setFin(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={etiqueta} htmlFor="t-fase">Fase</label>
              <select id="t-fase" className={campo} value={faseId} onChange={(e) => setFaseId(e.target.value)}>
                <option value="">Sin fase</option>
                {fases.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className={etiqueta} htmlFor="t-resp">Responsable</label>
              <select id="t-resp" className={campo} value={responsable} onChange={(e) => setResponsable(e.target.value)}>
                {miembros.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={etiqueta} htmlFor="t-prio">Prioridad</label>
            <select id="t-prio" className={campo} value={prioridad} onChange={(e) => setPrioridad(e.target.value as Tarea['prioridad'])}>
              <option value="alta">Alta</option><option value="media">Media</option><option value="baja">Baja</option>
            </select>
          </div>

          {candidatas.length > 0 && (
            <div>
              <p className={etiqueta}>Espera a (dependencias)</p>
              <div className="max-h-32 overflow-y-auto border border-[var(--c-line)] rounded p-2 space-y-1">
                {candidatas.map((t) => (
                  <label key={t.id} className="flex items-center gap-2 text-xs text-[var(--c-text-2)]">
                    <input type="checkbox" checked={espera.includes(t.id)} onChange={() => setEspera((e) => (e.includes(t.id) ? e.filter((x) => x !== t.id) : [...e, t.id]))} />
                    <span className="truncate">{t.titulo}</span>
                  </label>
                ))}
              </div>
              {adelantada && <p className="text-[11px] text-[var(--c-warn)] mt-1">Empieza antes de que termine una tarea de la que depende.</p>}
            </div>
          )}

          <div><label className={etiqueta} htmlFor="t-desc">Notas</label><textarea id="t-desc" rows={2} className={campo} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} /></div>
          {error && <p className="text-xs text-[var(--c-danger)] border border-[var(--c-danger)]/40 rounded p-2">{error}</p>}
        </div>

        <div className="flex items-center justify-between mt-5">
          {tarea ? <button onClick={eliminar} className="text-xs text-[var(--c-danger)] hover:underline">Eliminar</button> : <span />}
          <div className="flex gap-2">
            <button onClick={onCerrar} className="px-3 py-1.5 text-xs text-[var(--c-muted)] hover:text-[var(--c-text)]">Cancelar</button>
            <button onClick={guardar} disabled={guardando} className="px-4 py-1.5 text-xs font-semibold rounded bg-[var(--c-accent)] text-[var(--c-on-accent)] disabled:opacity-50">{guardando ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};
