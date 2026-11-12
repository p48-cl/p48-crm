import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Eye, EyeOff, Archive, Paperclip, FileText } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { parseSupabaseError } from '../../lib/errorHandler';
import {
  Proyecto,
  Entregable,
  Reporte,
  ClienteUsuario,
  EstadoProyecto,
  EstadoEntregable,
  TipoReporte,
} from '../../types/crm';

const input =
  'w-full px-2.5 py-1.5 text-xs bg-[var(--c-surface)] border border-[var(--c-line)] rounded text-[var(--c-text)] placeholder-[var(--c-muted-2)] focus:outline-none focus:border-[var(--c-accent)]';
const btnPrimario =
  'text-xs text-[var(--c-on-accent)] bg-[var(--c-accent)] hover:bg-[var(--c-accent-hover)] px-2.5 py-1 rounded font-medium flex items-center gap-1 transition-colors disabled:opacity-50';
const btnLink = 'text-[11px] font-mono uppercase text-[var(--c-muted)] hover:text-[var(--c-accent)]';
const filaCard = 'p-3 bg-[var(--c-surface-2)] rounded border border-[var(--c-line)] space-y-2 text-xs';

const ESTADOS_PROYECTO: EstadoProyecto[] = ['planificado', 'en_curso', 'pausado', 'finalizado'];
const ESTADOS_ENTREGABLE: EstadoEntregable[] = ['pendiente', 'en_progreso', 'en_revision', 'entregado'];
const TIPOS_REPORTE: TipoReporte[] = ['mensual', 'auditoria', 'presentacion', 'otro'];
const MAX_BYTES = 50 * 1024 * 1024;
const tamano = (b?: number | null) => (!b ? '' : b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const etiqueta = (v: string) => v.replace('_', ' ');

type SubTab = 'proyectos' | 'reportes' | 'portal';

interface Props {
  empresaId: string;
  // Si se indica, el panel muestra solo esa sección (cada una es un sub menú de la ficha)
  vista?: SubTab;
}

export const ClientePanel: React.FC<Props> = ({ empresaId, vista }) => {
  const [subInterno, setSub] = useState<SubTab>('proyectos');
  const sub = vista ?? subInterno;
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [entregables, setEntregables] = useState<Entregable[]>([]);
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [usuarios, setUsuarios] = useState<ClienteUsuario[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [nuevoProyecto, setNuevoProyecto] = useState(false);
  const [fp, setFp] = useState({ nombre: '', descripcion: '', estado: 'planificado' as EstadoProyecto, fecha_inicio: '', fecha_fin: '', visible_cliente: true });
  const [entProyecto, setEntProyecto] = useState<string | null>(null);
  const [fe, setFe] = useState({ titulo: '', estado: 'pendiente' as EstadoEntregable, fecha_comprometida: '', url_documento: '', notas_internas: '', visible_cliente: true });
  const [nuevoReporte, setNuevoReporte] = useState(false);
  const [fr, setFr] = useState({ titulo: '', tipo: 'mensual' as TipoReporte, periodo: '', url: '', visible_cliente: false });
  const [archivo, setArchivo] = useState<File | null>(null);
  const [fu, setFu] = useState({ nombre: '', email: '' });

  const cargar = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    const { data: pr, error: e1 } = await supabase.from('proyectos').select('*').eq('empresa_id', empresaId).eq('archivado', false).order('created_at', { ascending: false });
    const { data: re, error: e3 } = await supabase.from('reportes').select('*').eq('empresa_id', empresaId).eq('archivado', false).order('periodo', { ascending: false, nullsFirst: false });
    const { data: us, error: e4 } = await supabase.from('cliente_usuarios').select('*').eq('empresa_id', empresaId).order('created_at');
    const ids = (pr ?? []).map((p) => p.id);
    let en: Entregable[] = [];
    let e2 = null;
    if (ids.length > 0) {
      const r = await supabase.from('entregables').select('*').in('proyecto_id', ids).eq('archivado', false).order('fecha_comprometida', { ascending: true, nullsFirst: false });
      en = (r.data as Entregable[]) ?? [];
      e2 = r.error;
      // Notas internas: tabla propia, solo miembros. Se unen solo para mostrar.
      if (en.length > 0) {
        const n = await supabase.from('entregables_internos').select('entregable_id, notas').in('entregable_id', en.map((x) => x.id));
        const mapa = new Map((n.data ?? []).map((x: { entregable_id: string; notas: string | null }) => [x.entregable_id, x.notas]));
        en = en.map((x) => ({ ...x, notas_internas: mapa.get(x.id) ?? null }));
      }
    }
    const fallo = e1 || e2 || e3 || e4;
    if (fallo) setError(parseSupabaseError(fallo));
    setProyectos((pr as Proyecto[]) ?? []);
    setEntregables(en);
    setReportes((re as Reporte[]) ?? []);
    setUsuarios((us as ClienteUsuario[]) ?? []);
  }, [empresaId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Ejecuta una operación, muestra el error si lo hay y recarga
  const ejecutar = async (op: () => PromiseLike<{ error: unknown }>) => {
    setGuardando(true);
    setError(null);
    const { error: err } = await op();
    setGuardando(false);
    if (err) {
      setError(parseSupabaseError(err));
      return false;
    }
    await cargar();
    return true;
  };

  const crearProyecto = async () => {
    if (!supabase || !fp.nombre.trim()) return;
    const ok = await ejecutar(() =>
      supabase!.from('proyectos').insert({
        empresa_id: empresaId,
        nombre: fp.nombre.trim(),
        descripcion: fp.descripcion.trim() || null,
        estado: fp.estado,
        fecha_inicio: fp.fecha_inicio || null,
        fecha_fin: fp.fecha_fin || null,
        visible_cliente: fp.visible_cliente,
      })
    );
    if (ok) {
      setNuevoProyecto(false);
      setFp({ nombre: '', descripcion: '', estado: 'planificado', fecha_inicio: '', fecha_fin: '', visible_cliente: true });
    }
  };

  const crearEntregable = async (proyectoId: string) => {
    if (!supabase || !fe.titulo.trim()) return;
    setGuardando(true);
    setError(null);
    const { data: creado, error: errE } = await supabase
      .from('entregables')
      .insert({
        proyecto_id: proyectoId,
        titulo: fe.titulo.trim(),
        estado: fe.estado,
        fecha_comprometida: fe.fecha_comprometida || null,
        url_documento: fe.url_documento.trim() || null,
        visible_cliente: fe.visible_cliente,
      })
      .select('id')
      .single();
    if (!errE && creado && fe.notas_internas.trim()) {
      const { error: errN } = await supabase
        .from('entregables_internos')
        .insert({ entregable_id: creado.id, notas: fe.notas_internas.trim() });
      if (errN) setError(parseSupabaseError(errN));
    }
    setGuardando(false);
    if (errE) {
      setError(parseSupabaseError(errE));
      return;
    }
    const ok = true;
    await cargar();
    if (ok) {
      setEntProyecto(null);
      setFe({ titulo: '', estado: 'pendiente', fecha_comprometida: '', url_documento: '', notas_internas: '', visible_cliente: true });
    }
  };

  const crearReporte = async () => {
    if (!supabase || !fr.titulo.trim() || (!fr.url.trim() && !archivo)) {
      setError('Pon un título y sube un archivo o pega un enlace.');
      return;
    }
    if (archivo && archivo.size > MAX_BYTES) {
      setError('El archivo supera los 50 MB. Súbelo a Drive y pega el enlace.');
      return;
    }
    setGuardando(true);
    setError(null);
    let archivo_path: string | null = null;
    if (archivo) {
      const limpio = archivo.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '_');
      archivo_path = `${empresaId}/${Date.now()}_${limpio}`;
      const { error: errUp } = await supabase.storage.from('reportes').upload(archivo_path, archivo, { upsert: false });
      if (errUp) {
        setGuardando(false);
        setError(parseSupabaseError(errUp));
        return;
      }
    }
    setGuardando(false);
    const ok = await ejecutar(() =>
      supabase!.from('reportes').insert({
        empresa_id: empresaId,
        titulo: fr.titulo.trim(),
        tipo: fr.tipo,
        periodo: fr.periodo || null,
        url: fr.url.trim() || null,
        archivo_path,
        archivo_nombre: archivo?.name ?? null,
        archivo_bytes: archivo?.size ?? null,
        visible_cliente: fr.visible_cliente,
      })
    );
    if (ok) {
      setNuevoReporte(false);
      setArchivo(null);
      setFr({ titulo: '', tipo: 'mensual', periodo: '', url: '', visible_cliente: false });
    } else if (archivo_path) {
      await supabase.storage.from('reportes').remove([archivo_path]);
    }
  };

  const abrirArchivo = async (r: Reporte) => {
    if (!supabase || !r.archivo_path) return;
    const { data, error: errS } = await supabase.storage.from('reportes').createSignedUrl(r.archivo_path, 300, { download: r.archivo_nombre ?? true });
    if (errS || !data) {
      setError(parseSupabaseError(errS ?? { message: 'No se pudo abrir el archivo' }));
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener');
  };

  const invitarUsuario = async () => {
    if (!supabase || !fu.email.trim() || !fu.nombre.trim()) return;
    const ok = await ejecutar(() =>
      supabase!.from('cliente_usuarios').insert({
        empresa_id: empresaId,
        email: fu.email.trim().toLowerCase(),
        nombre: fu.nombre.trim(),
      })
    );
    if (ok) setFu({ nombre: '', email: '' });
  };

  if (!isSupabaseConfigured) {
    return <p className="text-xs text-[var(--c-muted)] py-4 text-center">Disponible solo con Supabase conectado.</p>;
  }

  const ocultos =
    proyectos.filter((p) => !p.visible_cliente).length +
    entregables.filter((e) => !e.visible_cliente).length +
    reportes.filter((r) => !r.visible_cliente).length;

  return (
    <div className="space-y-4">
      {!vista && <div className="flex gap-3 text-[11px] font-mono uppercase">
        {(['proyectos', 'reportes', 'portal'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setSub(t)}
            className={sub === t ? 'text-[var(--c-accent)]' : 'text-[var(--c-muted)] hover:text-[var(--c-text-2)]'}
          >
            {t === 'portal' ? 'Accesos de portal' : t}
          </button>
        ))}
      </div>}

      {ocultos > 0 && (
        <p className="text-[11px] text-[var(--c-muted)] border border-[var(--c-line)] rounded p-2">
          {ocultos} elemento(s) marcados como no visibles para el cliente.
        </p>
      )}
      {error && <p className="text-xs text-[var(--c-danger)] border border-[var(--c-danger)]/40 rounded p-2">{error}</p>}

      {sub === 'proyectos' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-[var(--c-text)]">Proyectos y entregables</h3>
            <button className={btnPrimario} onClick={() => setNuevoProyecto((v) => !v)}>
              <Plus className="w-3.5 h-3.5" /> Proyecto
            </button>
          </div>

          {nuevoProyecto && (
            <div className={filaCard}>
              <input className={input} placeholder="Nombre del proyecto" value={fp.nombre} onChange={(e) => setFp({ ...fp, nombre: e.target.value })} />
              <textarea className={input} rows={2} placeholder="Descripción (visible para el cliente)" value={fp.descripcion} onChange={(e) => setFp({ ...fp, descripcion: e.target.value })} />
              <div className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-3 gap-2">
                <select className={input} value={fp.estado} onChange={(e) => setFp({ ...fp, estado: e.target.value as EstadoProyecto })}>
                  {ESTADOS_PROYECTO.map((s) => <option key={s} value={s}>{etiqueta(s)}</option>)}
                </select>
                <input type="date" className={input} value={fp.fecha_inicio} onChange={(e) => setFp({ ...fp, fecha_inicio: e.target.value })} />
                <input type="date" className={input} value={fp.fecha_fin} onChange={(e) => setFp({ ...fp, fecha_fin: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-[11px] text-[var(--c-text-2)]">
                <input type="checkbox" checked={fp.visible_cliente} onChange={(e) => setFp({ ...fp, visible_cliente: e.target.checked })} /> Visible para el cliente
              </label>
              <button className={btnPrimario} disabled={guardando} onClick={crearProyecto}>Guardar proyecto</button>
            </div>
          )}

          {proyectos.length === 0 ? (
            <p className="text-xs text-[var(--c-muted)] py-4 text-center">Sin proyectos para este cliente.</p>
          ) : (
            proyectos.map((p) => {
              const ents = entregables.filter((e) => e.proyecto_id === p.id);
              return (
                <div key={p.id} className={filaCard}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-[var(--c-text)] truncate">{p.nombre}</p>
                      {p.descripcion && <p className="text-[11px] text-[var(--c-muted)]">{p.descripcion}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button title="Visibilidad para el cliente" onClick={() => ejecutar(() => supabase!.from('proyectos').update({ visible_cliente: !p.visible_cliente }).eq('id', p.id))} className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--c-muted)] hover:text-[var(--c-accent)]">
                        {p.visible_cliente ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button title="Archivar" onClick={() => ejecutar(() => supabase!.from('proyectos').update({ archivado: true }).eq('id', p.id))} className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--c-muted)] hover:text-[var(--c-danger)]">
                        <Archive className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <select className={input + ' max-w-[180px]'} value={p.estado} onChange={(e) => ejecutar(() => supabase!.from('proyectos').update({ estado: e.target.value }).eq('id', p.id))}>
                    {ESTADOS_PROYECTO.map((s) => <option key={s} value={s}>{etiqueta(s)}</option>)}
                  </select>

                  <div className="space-y-2 pt-1">
                    {ents.map((en) => (
                      <div key={en.id} className="p-2 bg-[var(--c-surface)] rounded border border-[var(--c-line)] space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[var(--c-text)] truncate">{en.titulo}</p>
                          <div className="flex items-center gap-2 shrink-0">
                            <button title="Visibilidad para el cliente" onClick={() => ejecutar(() => supabase!.from('entregables').update({ visible_cliente: !en.visible_cliente }).eq('id', en.id))} className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--c-muted)] hover:text-[var(--c-accent)]">
                              {en.visible_cliente ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </button>
                            <button title="Archivar" onClick={() => ejecutar(() => supabase!.from('entregables').update({ archivado: true }).eq('id', en.id))} className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--c-muted)] hover:text-[var(--c-danger)]">
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <select className={input + ' max-w-[150px]'} value={en.estado} onChange={(e) => ejecutar(() => supabase!.from('entregables').update({ estado: e.target.value, fecha_entrega: e.target.value === 'entregado' ? new Date().toISOString().slice(0, 10) : null }).eq('id', en.id))}>
                            {ESTADOS_ENTREGABLE.map((s) => <option key={s} value={s}>{etiqueta(s)}</option>)}
                          </select>
                          {en.fecha_comprometida && <span className="font-mono text-[10px] text-[var(--c-muted)]">Comprometido {en.fecha_comprometida}</span>}
                          {en.url_documento && <a href={en.url_documento} target="_blank" rel="noreferrer" className="text-[11px] text-[var(--c-accent)] hover:underline">Documento</a>}
                        </div>
                        {en.notas_internas && <p className="text-[10px] text-[var(--c-muted-2)]">Nota interna: {en.notas_internas}</p>}
                      </div>
                    ))}

                    {entProyecto === p.id ? (
                      <div className="p-2 bg-[var(--c-surface)] rounded border border-[var(--c-line)] space-y-2">
                        <input className={input} placeholder="Título del entregable" value={fe.titulo} onChange={(e) => setFe({ ...fe, titulo: e.target.value })} />
                        <div className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-2 gap-2">
                          <select className={input} value={fe.estado} onChange={(e) => setFe({ ...fe, estado: e.target.value as EstadoEntregable })}>
                            {ESTADOS_ENTREGABLE.map((s) => <option key={s} value={s}>{etiqueta(s)}</option>)}
                          </select>
                          <input type="date" className={input} value={fe.fecha_comprometida} onChange={(e) => setFe({ ...fe, fecha_comprometida: e.target.value })} />
                        </div>
                        <input className={input} placeholder="Enlace al documento (Drive)" value={fe.url_documento} onChange={(e) => setFe({ ...fe, url_documento: e.target.value })} />
                        <input className={input} placeholder="Nota interna (el cliente no la ve)" value={fe.notas_internas} onChange={(e) => setFe({ ...fe, notas_internas: e.target.value })} />
                        <label className="flex items-center gap-2 text-[11px] text-[var(--c-text-2)]">
                          <input type="checkbox" checked={fe.visible_cliente} onChange={(e) => setFe({ ...fe, visible_cliente: e.target.checked })} /> Visible para el cliente
                        </label>
                        <div className="flex gap-3">
                          <button className={btnPrimario} disabled={guardando} onClick={() => crearEntregable(p.id)}>Guardar entregable</button>
                          <button className={btnLink + " min-h-[44px] inline-flex items-center"} onClick={() => setEntProyecto(null)}>Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <button className={btnLink + " min-h-[44px] inline-flex items-center"} onClick={() => setEntProyecto(p.id)}>+ Entregable</button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {sub === 'reportes' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-[var(--c-text)]">Reportes</h3>
            <button className={btnPrimario} onClick={() => setNuevoReporte((v) => !v)}>
              <Plus className="w-3.5 h-3.5" /> Reporte
            </button>
          </div>
          {nuevoReporte && (
            <div className={filaCard}>
              <input className={input} placeholder="Título del reporte" value={fr.titulo} onChange={(e) => setFr({ ...fr, titulo: e.target.value })} />
              <div className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-2 gap-2">
                <select className={input} value={fr.tipo} onChange={(e) => setFr({ ...fr, tipo: e.target.value as TipoReporte })}>
                  {TIPOS_REPORTE.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <input type="date" className={input} value={fr.periodo} onChange={(e) => setFr({ ...fr, periodo: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 px-2.5 py-2 text-xs border border-dashed border-[var(--c-line)] rounded cursor-pointer hover:border-[var(--c-accent)] text-[var(--c-text-2)]">
                <Paperclip className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{archivo ? `${archivo.name} · ${tamano(archivo.size)}` : 'Subir archivo (PDF, PPTX, XLSX, DOCX, imagen… hasta 50 MB)'}</span>
                <input type="file" className="hidden" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
              </label>
              <input className={input} placeholder="o pega un enlace (Drive, Looker, Canva…)" value={fr.url} onChange={(e) => setFr({ ...fr, url: e.target.value })} />
              <label className="flex items-center gap-2 text-[11px] text-[var(--c-text-2)]">
                <input type="checkbox" checked={fr.visible_cliente} onChange={(e) => setFr({ ...fr, visible_cliente: e.target.checked })} /> Visible para el cliente
              </label>
              <button className={btnPrimario} disabled={guardando} onClick={crearReporte}>Guardar reporte</button>
            </div>
          )}
          {reportes.length === 0 ? (
            <p className="text-xs text-[var(--c-muted)] py-4 text-center">Sin reportes.</p>
          ) : (
            reportes.map((r) => (
              <div key={r.id} className={filaCard + ' flex items-center justify-between gap-2'}>
                <div className="min-w-0">
                  <p className="text-[var(--c-text)] truncate">{r.titulo}</p>
                  <p className="font-mono text-[10px] text-[var(--c-muted)]">{r.tipo}{r.periodo ? ` · ${r.periodo}` : ''}</p>
                  {r.archivo_path && (
                    <button onClick={() => abrirArchivo(r)} className="flex items-center gap-1 text-[11px] text-[var(--c-accent)] hover:underline">
                      <FileText className="w-3 h-3" />{r.archivo_nombre ?? 'Archivo'}{r.archivo_bytes ? ` · ${tamano(r.archivo_bytes)}` : ''}
                    </button>
                  )}
                  {r.url && <a href={r.url} target="_blank" rel="noreferrer" className="block text-[11px] text-[var(--c-accent)] hover:underline">Abrir enlace</a>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button title="Visibilidad para el cliente" onClick={() => ejecutar(() => supabase!.from('reportes').update({ visible_cliente: !r.visible_cliente }).eq('id', r.id))} className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--c-muted)] hover:text-[var(--c-accent)]">
                    {r.visible_cliente ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button title="Archivar" onClick={() => ejecutar(() => supabase!.from('reportes').update({ archivado: true }).eq('id', r.id))} className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--c-muted)] hover:text-[var(--c-danger)]">
                    <Archive className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {sub === 'portal' && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-[var(--c-text)]">Personas con acceso al portal</h3>
          <p className="text-[11px] text-[var(--c-muted)]">
            Registrar un correo no envía invitación. El acceso del cliente al portal se habilita cuando esté definido el método de inicio de sesión.
          </p>
          <div className={filaCard}>
            <div className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-2 gap-2">
              <input className={input} placeholder="Nombre" value={fu.nombre} onChange={(e) => setFu({ ...fu, nombre: e.target.value })} />
              <input type="email" className={input} placeholder="correo@cliente.cl" value={fu.email} onChange={(e) => setFu({ ...fu, email: e.target.value })} />
            </div>
            <button className={btnPrimario} disabled={guardando} onClick={invitarUsuario}>Registrar persona</button>
          </div>
          {usuarios.length === 0 ? (
            <p className="text-xs text-[var(--c-muted)] py-2 text-center">Nadie registrado todavía.</p>
          ) : (
            usuarios.map((u) => (
              <div key={u.id} className={filaCard + ' flex items-center justify-between gap-2'}>
                <div className="min-w-0">
                  <p className="text-[var(--c-text)] truncate">{u.nombre}</p>
                  <p className="font-mono text-[10px] text-[var(--c-muted)] truncate">{u.email}{u.user_id ? ' · ya inició sesión' : ''}</p>
                </div>
                <button className={btnLink + " min-h-[44px] inline-flex items-center"} onClick={() => ejecutar(() => supabase!.from('cliente_usuarios').update({ activo: !u.activo }).eq('id', u.id))}>
                  {u.activo ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
