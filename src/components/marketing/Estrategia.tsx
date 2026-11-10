import React, { useCallback, useEffect, useState } from 'react';
import { Copy, Check, Pencil, Target, Users, Megaphone } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { parseSupabaseError } from '../../lib/errorHandler';
import { useDatosMarketing } from './comun';

type Campo =
  | 'objetivo_ventas' | 'objetivo_marketing' | 'posicionamiento' | 'mercado_objetivo'
  | 'storytelling' | 'canal_prioritario' | 'tono_voz' | 'competidores' | 'notas_creativos';

const CAMPOS: { id: Campo; titulo: string; ayuda: string }[] = [
  { id: 'objetivo_ventas', titulo: 'Objetivo de ventas', ayuda: 'Meta de negocio del cliente (leads, ventas, reservas) con cifra y plazo.' },
  { id: 'objetivo_marketing', titulo: 'Objetivo de marketing', ayuda: 'Qué debe lograr marketing para cumplir la meta de ventas.' },
  { id: 'posicionamiento', titulo: 'Posicionamiento', ayuda: 'Cómo queremos que lo vea el mercado frente a la competencia.' },
  { id: 'mercado_objetivo', titulo: 'Mercado objetivo', ayuda: 'Segmento, país o ciudad, perfil del comprador y su decisión de compra.' },
  { id: 'storytelling', titulo: 'Storytelling', ayuda: 'Historia y mensaje central que sostiene campañas y creativos.' },
  { id: 'canal_prioritario', titulo: 'Canal prioritario', ayuda: 'Dónde se concentra la inversión y por qué (Google Ads, Meta, SEO...).' },
  { id: 'tono_voz', titulo: 'Tono de voz', ayuda: 'Cómo habla la marca. Palabras que sí y que no.' },
  { id: 'competidores', titulo: 'Competidores', ayuda: 'Dominios o marcas con los que se compara.' },
  { id: 'notas_creativos', titulo: 'Notas para creativos', ayuda: 'Restricciones, referencias, colores o formatos que el equipo creativo debe respetar.' },
];

const GRUPOS: { titulo: string; sub: string; icono: React.ComponentType<{ className?: string }>; campos: Campo[] }[] = [
  { titulo: 'Negocio', sub: 'Qué meta persigue el cliente', icono: Target, campos: ['objetivo_ventas', 'objetivo_marketing', 'canal_prioritario'] },
  { titulo: 'Mercado', sub: 'A quién le habla y contra quién compite', icono: Users, campos: ['mercado_objetivo', 'posicionamiento', 'competidores'] },
  { titulo: 'Marca y creativos', sub: 'Cómo suena y qué debe respetarse', icono: Megaphone, campos: ['storytelling', 'tono_voz', 'notas_creativos'] },
];

type Valores = Record<Campo, string>;
const VACIO: Valores = Object.fromEntries(CAMPOS.map((c) => [c.id, ''])) as Valores;

const areaClase =
  'w-full px-2.5 py-1.5 text-xs bg-[var(--c-surface)] border border-[var(--c-line)] rounded text-[var(--c-text)] placeholder:text-[var(--c-muted-2)] focus:outline-none focus:border-[var(--c-accent)]';

export const Estrategia: React.FC = () => {
  const { clientes, cargando } = useDatosMarketing();
  const [clienteSel, setClienteSel] = useState('');
  const [valores, setValores] = useState<Valores>(VACIO);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [editando, setEditando] = useState<Campo | null>(null);

  const clienteId = clienteSel || clientes[0]?.id || '';
  const cliente = clientes.find((c) => c.id === clienteId);

  const cargar = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase || !clienteId) return;
    const { data, error: err } = await supabase.from('estrategia_cliente').select('*').eq('empresa_id', clienteId).maybeSingle();
    if (err) setError(parseSupabaseError(err));
    const v = { ...VACIO };
    for (const c of CAMPOS) v[c.id] = ((data ?? {}) as Record<string, string | null>)[c.id] ?? '';
    setValores(v);
    setGuardado(null);
    setEditando(null);
  }, [clienteId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const guardar = async (campo: Campo, texto: string) => {
    if (!supabase || !clienteId) return;
    setError(null);
    const { error: err } = await supabase
      .from('estrategia_cliente')
      .upsert({ empresa_id: clienteId, [campo]: texto.trim() || null, updated_at: new Date().toISOString() }, { onConflict: 'empresa_id' });
    if (err) setError(parseSupabaseError(err));
    else setGuardado(CAMPOS.find((c) => c.id === campo)?.titulo ?? null);
  };

  const copiarBrief = async () => {
    const lineas = CAMPOS.filter((c) => valores[c.id].trim()).map((c) => `${c.titulo}: ${valores[c.id].trim()}`);
    const texto = `Brief de estrategia · ${cliente?.nombre ?? ''}\n\n${lineas.join('\n\n')}`;
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setError('No se pudo copiar. Selecciona el texto manualmente.');
    }
  };

  if (cargando) return <p className="text-sm text-[var(--c-muted)]">Cargando...</p>;
  if (clientes.length === 0) return <div className="surface p-6 text-sm text-[var(--c-muted)]">No hay clientes activos todavía.</div>;

  const completos = CAMPOS.filter((c) => valores[c.id].trim()).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <select
          value={clienteId}
          onChange={(e) => setClienteSel(e.target.value)}
          className="px-2.5 py-1.5 text-xs bg-[var(--c-surface)] border border-[var(--c-line)] rounded text-[var(--c-text)]"
          aria-label="Cliente"
        >
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
        <div className="flex items-center gap-3">
          <button
            onClick={copiarBrief}
            disabled={completos === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border border-[var(--c-line)] text-[var(--c-text)] hover:bg-[var(--c-surface-2)] disabled:opacity-40"
          >
            {copiado ? <Check className="w-3.5 h-3.5 text-[var(--c-ok)]" /> : <Copy className="w-3.5 h-3.5" />}
            {copiado ? 'Copiado' : 'Copiar brief'}
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-[var(--c-danger)] border border-[var(--c-danger)]/40 rounded p-2">{error}</p>}
      {guardado && !error && <p className="text-[11px] text-[var(--c-ok)]">Guardado: {guardado}</p>}

      <div className="surface p-4 flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--c-text)] truncate">{cliente?.nombre}</p>
          <p className="text-[11px] text-[var(--c-muted)]">Estrategia del cliente · se guarda al salir de cada campo</p>
        </div>
        <div className="w-40 shrink-0">
          <div className="h-1.5 rounded-full bg-[var(--c-surface-3)] overflow-hidden">
            <div className="h-full bg-[var(--c-accent)]" style={{ width: `${(completos / CAMPOS.length) * 100}%` }} />
          </div>
          <p className="text-[10px] font-mono text-[var(--c-muted)] mt-1 text-right">{completos}/{CAMPOS.length} definidos</p>
        </div>
      </div>

      {GRUPOS.map((g) => {
        const Icono = g.icono;
        return (
          <section key={g.titulo} className="space-y-2">
            <div className="flex items-center gap-2">
              <Icono className="w-4 h-4 text-[var(--c-accent)]" />
              <h3 className="text-xs font-semibold text-[var(--c-text)]">{g.titulo}</h3>
              <span className="text-[11px] text-[var(--c-muted)]">· {g.sub}</span>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-3 gap-3">
              {g.campos.map((id) => {
                const c = CAMPOS.find((x) => x.id === id)!;
                const texto = valores[id];
                const abierto = editando === id;
                return (
                  <div key={id} className="surface p-3.5 space-y-1.5 flex flex-col">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--c-text)]">
                        <span className={`w-1.5 h-1.5 rounded-full ${texto.trim() ? 'bg-[var(--c-ok)]' : 'bg-[var(--c-muted-2)]'}`} />
                        {c.titulo}
                      </span>
                      {!abierto && (
                        <button onClick={() => setEditando(id)} className="p-1 rounded text-[var(--c-muted)] hover:text-[var(--c-text)] hover:bg-[var(--c-surface-2)]" aria-label={`Editar ${c.titulo}`}>
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    {abierto ? (
                      <>
                        <p className="text-[11px] text-[var(--c-muted)]">{c.ayuda}</p>
                        <textarea
                          autoFocus
                          rows={5}
                          className={areaClase}
                          value={texto}
                          onChange={(e) => setValores({ ...valores, [id]: e.target.value })}
                          onBlur={(e) => { guardar(id, e.target.value); setEditando(null); }}
                        />
                      </>
                    ) : texto.trim() ? (
                      <p onClick={() => setEditando(id)} className="text-xs text-[var(--c-text-2)] whitespace-pre-wrap cursor-text leading-relaxed">{texto}</p>
                    ) : (
                      <button onClick={() => setEditando(id)} className="text-left text-[11px] text-[var(--c-muted)] border border-dashed border-[var(--c-line)] rounded p-2 hover:border-[var(--c-accent)]">
                        {c.ayuda}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
};
