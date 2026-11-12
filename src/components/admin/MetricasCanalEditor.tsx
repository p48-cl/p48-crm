import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Copy, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { parseSupabaseError } from '../../lib/errorHandler';
import { useCRM } from '../../context/CRMContext';
import { CANALES } from '../marketing/canales';
import { FilaConfig, useConfigMetricas } from '../marketing/metricasConfig';

const input = 'bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-2 py-1 text-xs text-[var(--c-text)] focus:outline-none focus:border-[var(--c-accent)]';
const btn = 'text-xs font-semibold px-3 py-1.5 rounded border border-[var(--c-line)] text-[var(--c-text)] hover:bg-[var(--c-surface-2)] disabled:opacity-40';

const AGREGA: { valor: FilaConfig['agrega']; texto: string }[] = [
  { valor: 'suma', texto: 'Suma' },
  { valor: 'promedio', texto: 'Promedio' },
  { valor: 'ultimo', texto: 'Último' },
];
const FORMATOS: { valor: FilaConfig['formato']; texto: string }[] = [
  { valor: 'entero', texto: 'Entero' },
  { valor: 'decimal', texto: 'Decimal' },
  { valor: 'pct', texto: 'Porcentaje' },
  { valor: 'clp', texto: 'CLP' },
  { valor: 'x', texto: 'Veces (x)' },
];

// Administración > Métricas por canal: qué se muestra en cada canal según el rubro del cliente
export const MetricasCanalEditor: React.FC = () => {
  const { industrias } = useCRM();
  const { filas, error: errorCarga, recargar } = useConfigMetricas();
  const [rubro, setRubro] = useState<string>(''); // '' = por defecto
  const [plataforma, setPlataforma] = useState<string>('ga4');
  const [msg, setMsg] = useState<string | null>(null);
  const [nueva, setNueva] = useState({ metrica: '', titulo: '' });

  const rubroId = rubro || null;
  const todas = filas ?? [];
  const delAmbito = todas
    .filter((f) => f.plataforma === plataforma && f.industria_id === rubroId)
    .sort((a, b) => a.orden - b.orden);
  const porDefecto = todas.filter((f) => f.plataforma === plataforma && f.industria_id === null).sort((a, b) => a.orden - b.orden);
  const usaDefecto = rubroId !== null && delAmbito.length === 0;
  const listado = rubroId === null ? porDefecto : delAmbito;

  const ejecutar = async (promesa: PromiseLike<{ error: { message: string } | null }>, ok: string) => {
    const { error } = await promesa;
    if (error) setMsg(parseSupabaseError(error));
    else setMsg(ok);
    await recargar();
  };

  const cambiar = (f: FilaConfig, cambios: Partial<FilaConfig>, ok = 'Guardado') => {
    if (!supabase) return;
    return ejecutar(supabase.from('metricas_canal_config').update(cambios).eq('id', f.id), ok);
  };

  const mover = async (f: FilaConfig, dir: -1 | 1) => {
    const i = listado.findIndex((x) => x.id === f.id);
    const vecino = listado[i + dir];
    if (!vecino || !supabase) return;
    await supabase.from('metricas_canal_config').update({ orden: vecino.orden }).eq('id', f.id);
    await ejecutar(supabase.from('metricas_canal_config').update({ orden: f.orden }).eq('id', vecino.id), 'Orden guardado');
  };

  const quitar = (f: FilaConfig) => {
    if (!supabase || !window.confirm(`¿Quitar "${f.titulo}" de ${plataforma}?`)) return;
    return ejecutar(supabase.from('metricas_canal_config').delete().eq('id', f.id), 'Métrica quitada');
  };

  const copiarDefecto = async () => {
    if (!supabase || rubroId === null) return;
    const copias = porDefecto.map((f) => ({
      industria_id: rubroId,
      plataforma: f.plataforma,
      metrica: f.metrica,
      titulo: f.titulo,
      agrega: f.agrega,
      formato: f.formato,
      mejor_sube: f.mejor_sube,
      orden: f.orden,
      activo: true,
    }));
    if (copias.length === 0) return setMsg('No hay métricas por defecto para este canal');
    await ejecutar(supabase.from('metricas_canal_config').insert(copias), 'Copiado: ahora puedes personalizar este rubro');
  };

  const agregar = async () => {
    const clave = nueva.metrica.trim().toLowerCase().replace(/\s+/g, '_');
    if (!clave) return setMsg('Falta la clave de la métrica (la que envía el conector)');
    if (!supabase) return;
    const siguiente = listado.reduce((m, f) => Math.max(m, f.orden), 0) + 1;
    await ejecutar(
      supabase.from('metricas_canal_config').insert({
        industria_id: rubroId,
        plataforma,
        metrica: clave,
        titulo: nueva.titulo.trim() || clave.replace(/_/g, ' '),
        agrega: 'suma',
        formato: 'entero',
        mejor_sube: true,
        orden: siguiente,
        activo: true,
      }),
      'Métrica agregada',
    );
    setNueva({ metrica: '', titulo: '' });
  };

  const nombreRubro = rubroId ? industrias.find((i) => i.id === rubroId)?.nombre ?? 'Rubro' : 'Por defecto';
  const canal = CANALES.find((c) => c.plataforma === plataforma);

  return (
    <div className="bg-[var(--c-surface)] rounded-lg border border-[var(--c-line)] p-4 space-y-4">
      <div>
        <p className="text-sm font-semibold text-[var(--c-text)]">Métricas por canal</p>
        <p className="text-[11px] text-[var(--c-muted)] mt-0.5">
          Define qué se muestra en la ficha de cada cliente. Cada rubro puede tener su propio set; si no tiene uno para un canal, usa la configuración por defecto.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1">
          <span className="block text-[11px] text-[var(--c-muted)]">Rubro</span>
          <select className={input} value={rubro} onChange={(e) => setRubro(e.target.value)}>
            <option value="">Por defecto (todos)</option>
            {industrias.filter((i) => i.activo).map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
          </select>
        </label>
        <label className="space-y-1">
          <span className="block text-[11px] text-[var(--c-muted)]">Canal</span>
          <select className={input} value={plataforma} onChange={(e) => setPlataforma(e.target.value)}>
            {CANALES.map((c) => <option key={c.plataforma} value={c.plataforma}>{c.nombre}</option>)}
          </select>
        </label>
        <span className="text-[11px] font-mono text-[var(--c-muted)] pb-1.5">{nombreRubro} · {canal?.nombre}</span>
      </div>

      {(msg || errorCarga) && <p className="text-[11px] text-[var(--c-ok)]">{errorCarga ?? msg}</p>}

      {usaDefecto ? (
        <div className="flex items-center justify-between gap-3 rounded border border-dashed border-[var(--c-line)] p-3">
          <p className="text-xs text-[var(--c-muted)]">Este rubro usa la configuración por defecto para este canal.</p>
          <button onClick={copiarDefecto} className={`${btn} flex items-center gap-1.5 shrink-0`}>
            <Copy className="w-3 h-3" /> Copiar por defecto y personalizar
          </button>
        </div>
      ) : listado.length === 0 ? (
        <p className="text-xs text-[var(--c-muted)]">Sin métricas configuradas para este canal.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] font-mono uppercase tracking-wider text-[var(--c-muted)]">
                <th className="py-2 pr-2 font-normal">Clave</th>
                <th className="py-2 pr-2 font-normal">Título</th>
                <th className="py-2 pr-2 font-normal">Agregación</th>
                <th className="py-2 pr-2 font-normal">Formato</th>
                <th className="py-2 pr-2 font-normal">Mejor si sube</th>
                <th className="py-2 pr-2 font-normal">Activa</th>
                <th className="py-2 pr-2 font-normal">Orden</th>
                <th className="py-2 font-normal" />
              </tr>
            </thead>
            <tbody>
              {listado.map((f, i) => (
                <tr key={f.id} className="border-t border-[var(--c-line)]">
                  <td className="py-2 pr-2 font-mono text-[var(--c-text-2)]">{f.metrica}</td>
                  <td className="py-2 pr-2">
                    <input
                      className={`${input} w-full min-w-[140px]`}
                      defaultValue={f.titulo}
                      onBlur={(e) => e.target.value.trim() && e.target.value !== f.titulo && cambiar(f, { titulo: e.target.value.trim() })}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <select className={input} value={f.agrega} onChange={(e) => cambiar(f, { agrega: e.target.value as FilaConfig['agrega'] })}>
                      {AGREGA.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
                    </select>
                  </td>
                  <td className="py-2 pr-2">
                    <select className={input} value={f.formato} onChange={(e) => cambiar(f, { formato: e.target.value as FilaConfig['formato'] })}>
                      {FORMATOS.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
                    </select>
                  </td>
                  <td className="py-2 pr-2 text-center">
                    <input type="checkbox" checked={f.mejor_sube} onChange={(e) => cambiar(f, { mejor_sube: e.target.checked })} aria-label="Mejor si sube" />
                  </td>
                  <td className="py-2 pr-2 text-center">
                    <input type="checkbox" checked={f.activo} onChange={(e) => cambiar(f, { activo: e.target.checked })} aria-label="Activa" />
                  </td>
                  <td className="py-2 pr-2">
                    <div className="flex items-center gap-1">
                      <button onClick={() => mover(f, -1)} disabled={i === 0} className="p-1 rounded hover:bg-[var(--c-surface-2)] disabled:opacity-30" aria-label="Subir"><ChevronUp className="w-3.5 h-3.5" /></button>
                      <button onClick={() => mover(f, 1)} disabled={i === listado.length - 1} className="p-1 rounded hover:bg-[var(--c-surface-2)] disabled:opacity-30" aria-label="Bajar"><ChevronDown className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                  <td className="py-2 text-right">
                    <button onClick={() => quitar(f)} className="p-1 rounded text-[var(--c-muted)] hover:text-[var(--c-danger)]" aria-label="Quitar"><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!usaDefecto && (
        <div className="flex flex-wrap items-end gap-2 border-t border-[var(--c-line)] pt-4">
          <label className="space-y-1">
            <span className="block text-[11px] text-[var(--c-muted)]">Clave de la métrica</span>
            <input className={input} placeholder="ej: transacciones" value={nueva.metrica} onChange={(e) => setNueva({ ...nueva, metrica: e.target.value })} />
          </label>
          <label className="space-y-1">
            <span className="block text-[11px] text-[var(--c-muted)]">Título visible</span>
            <input className={input} placeholder="ej: Compras" value={nueva.titulo} onChange={(e) => setNueva({ ...nueva, titulo: e.target.value })} />
          </label>
          <button onClick={agregar} className={btn}>Agregar métrica</button>
        </div>
      )}
    </div>
  );
};
