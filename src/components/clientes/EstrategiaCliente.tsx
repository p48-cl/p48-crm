import React, { useCallback, useEffect, useState } from 'react';
import { Pencil, Target, Users, Megaphone, ChevronRight, Copy, Check } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { parseSupabaseError } from '../../lib/errorHandler';

export type Campo =
  | 'objetivo_ventas' | 'objetivo_marketing' | 'posicionamiento' | 'mercado_objetivo'
  | 'storytelling' | 'canal_prioritario' | 'tono_voz' | 'competidores' | 'notas_creativos';

export const CAMPOS: { id: Campo; titulo: string; ayuda: string }[] = [
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

export const GRUPOS: { titulo: string; sub: string; icono: React.ComponentType<{ className?: string }>; campos: Campo[] }[] = [
  { titulo: 'Negocio', sub: 'Qué meta persigue el cliente', icono: Target, campos: ['objetivo_ventas', 'objetivo_marketing', 'canal_prioritario'] },
  { titulo: 'Mercado', sub: 'A quién le habla y contra quién compite', icono: Users, campos: ['mercado_objetivo', 'posicionamiento', 'competidores'] },
  { titulo: 'Marca y creativos', sub: 'Cómo suena y qué debe respetarse', icono: Megaphone, campos: ['storytelling', 'tono_voz', 'notas_creativos'] },
];

export type Valores = Record<Campo, string>;
export const VACIO: Valores = Object.fromEntries(CAMPOS.map((c) => [c.id, ''])) as Valores;

// Lectura y guardado de estrategia_cliente (una fila por empresa)
export function useEstrategiaCliente(empresaId: string | null | undefined) {
  const [valores, setValores] = useState<Valores>(VACIO);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase || !empresaId) return;
    setCargando(true);
    const { data, error: err } = await supabase.from('estrategia_cliente').select('*').eq('empresa_id', empresaId).maybeSingle();
    if (err) setError(parseSupabaseError(err));
    const v = { ...VACIO };
    for (const c of CAMPOS) v[c.id] = ((data ?? {}) as Record<string, string | null>)[c.id] ?? '';
    setValores(v);
    setGuardado(null);
    setCargando(false);
  }, [empresaId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const guardar = async (campo: Campo, texto: string) => {
    if (!supabase || !empresaId) return;
    setError(null);
    const { error: err } = await supabase
      .from('estrategia_cliente')
      .upsert(
        { empresa_id: empresaId, [campo]: texto.trim() || null, updated_at: new Date().toISOString() },
        { onConflict: 'empresa_id' },
      );
    if (err) setError(parseSupabaseError(err));
    else setGuardado(CAMPOS.find((c) => c.id === campo)?.titulo ?? null);
  };

  // Guarda todos los campos de una vez (tarjeta editable completa)
  const guardarTodos = async (nuevos: Valores) => {
    if (!supabase || !empresaId) return;
    setError(null);
    const limpios = Object.fromEntries(CAMPOS.map((c) => [c.id, nuevos[c.id].trim()])) as Valores;
    const { error: err } = await supabase
      .from('estrategia_cliente')
      .upsert(
        { empresa_id: empresaId, ...Object.fromEntries(CAMPOS.map((c) => [c.id, limpios[c.id] || null])), updated_at: new Date().toISOString() },
        { onConflict: 'empresa_id' },
      );
    if (err) setError(parseSupabaseError(err));
    else {
      setValores(limpios);
      setGuardado('Estrategia');
    }
    return !err;
  };

  return { valores, setValores, error, guardado, guardar, guardarTodos, cargando };
}

const areaClase =
  'w-full px-2.5 py-1.5 text-xs bg-[var(--c-surface)] border border-[var(--c-line)] rounded text-[var(--c-text)] placeholder:text-[var(--c-muted-2)] focus:outline-none focus:border-[var(--c-accent)]';

// Editor completo (usado en Mkt Inteligence y en la pestaña Estrategia de la ficha)
export const EstrategiaEditor: React.FC<{ empresaId: string | null | undefined; nombreCliente?: string }> = ({
  empresaId,
  nombreCliente,
}) => {
  const { valores, setValores, error, guardado, guardar, cargando } = useEstrategiaCliente(empresaId);
  const [editando, setEditando] = useState<Campo | null>(null);
  const [copiado, setCopiado] = useState(false);
  const completos = CAMPOS.filter((c) => valores[c.id].trim()).length;

  const copiarBrief = async () => {
    const lineas = CAMPOS.filter((c) => valores[c.id].trim()).map((c) => `${c.titulo}: ${valores[c.id].trim()}`);
    const texto = `Brief de estrategia · ${nombreCliente ?? ''}\n\n${lineas.join('\n\n')}`;
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* el navegador no permitió copiar: el texto sigue visible para seleccionarlo */
    }
  };

  if (cargando) return <p className="text-sm text-[var(--c-muted)]">Cargando...</p>;

  return (
    <div className="space-y-5">
      <div className="surface p-4 flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--c-text)]">Estrategia del cliente</p>
          <p className="text-[11px] text-[var(--c-muted)]">Se guarda al salir de cada campo</p>
        </div>
        <button
          onClick={copiarBrief}
          disabled={completos === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border border-[var(--c-line)] text-[var(--c-text)] hover:bg-[var(--c-surface-2)] disabled:opacity-40 shrink-0"
        >
          {copiado ? <Check className="w-3.5 h-3.5 text-[var(--c-ok)]" /> : <Copy className="w-3.5 h-3.5" />}
          {copiado ? 'Copiado' : 'Copiar brief'}
        </button>
        <div className="w-40 shrink-0 hidden sm:block">
          <div className="h-1.5 rounded-full bg-[var(--c-surface-3)] overflow-hidden">
            <div className="h-full bg-[var(--c-accent)]" style={{ width: `${(completos / CAMPOS.length) * 100}%` }} />
          </div>
          <p className="text-[10px] font-mono text-[var(--c-muted)] mt-1 text-right">{completos}/{CAMPOS.length} definidos</p>
        </div>
      </div>

      {error && <p className="text-xs text-[var(--c-danger)] border border-[var(--c-danger)]/40 rounded p-2">{error}</p>}
      {guardado && !error && <p className="text-[11px] text-[var(--c-ok)]">Guardado: {guardado}</p>}

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
                  <div key={id} className="surface p-3.5 space-y-1.5 flex flex-col min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--c-text)]">
                        <span className={`w-1.5 h-1.5 rounded-full ${texto.trim() ? 'bg-[var(--c-ok)]' : 'bg-[var(--c-muted-2)]'}`} />
                        {c.titulo}
                      </span>
                      {!abierto && (
                        <button
                          onClick={() => setEditando(id)}
                          className="p-1 rounded text-[var(--c-muted)] hover:text-[var(--c-text)] hover:bg-[var(--c-surface-2)]"
                          aria-label={`Editar ${c.titulo}`}
                        >
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
                      <p onClick={() => setEditando(id)} className="text-xs text-[var(--c-text-2)] whitespace-pre-wrap cursor-text leading-relaxed break-words">
                        {texto}
                      </p>
                    ) : (
                      <button
                        onClick={() => setEditando(id)}
                        className="text-left text-[11px] text-[var(--c-muted)] border border-dashed border-[var(--c-line)] rounded p-2 hover:border-[var(--c-accent)]"
                      >
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

// Resumen compacto para la pestaña Resumen de la ficha de cliente
const CAMPOS_RESUMEN: Campo[] = ['objetivo_ventas', 'canal_prioritario', 'mercado_objetivo', 'posicionamiento'];

export const ResumenEstrategia: React.FC<{ empresaId: string; onVerTodo: () => void }> = ({ empresaId, onVerTodo }) => {
  const { valores, cargando } = useEstrategiaCliente(empresaId);
  if (cargando) return null;
  const completos = CAMPOS.filter((c) => valores[c.id].trim()).length;

  return (
    <div className="ficha-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-[var(--c-text)]">Estrategia</h3>
        <button onClick={onVerTodo} className="flex items-center gap-1 text-[11px] text-[var(--c-accent)] hover:underline">
          {completos}/{CAMPOS.length} definidos <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
      <dl className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-2 gap-x-4 gap-y-3">
        {CAMPOS_RESUMEN.map((id) => {
          const c = CAMPOS.find((x) => x.id === id)!;
          const texto = valores[id].trim();
          return (
            <div key={id} className="min-w-0">
              <dt className="text-[10px] font-mono uppercase tracking-wider text-[var(--c-muted)]">{c.titulo}</dt>
              <dd className={`text-xs mt-0.5 line-clamp-2 ${texto ? 'text-[var(--c-text-2)]' : 'text-[var(--c-warn)] italic'}`}>
                {texto || 'Sin definir'}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
};


// Tarjeta única de estrategia para la ficha: 3 campos clave, el resto con "Ver más", edición de la tarjeta completa
const CAMPOS_CLAVE: Campo[] = ['objetivo_ventas', 'canal_prioritario', 'posicionamiento'];

export const EstrategiaCard: React.FC<{ empresaId: string; nombreCliente?: string }> = ({ empresaId }) => {
  const { valores, error, guardarTodos, cargando } = useEstrategiaCliente(empresaId);
  const [editando, setEditando] = useState(false);
  const [verMas, setVerMas] = useState(true); // con espacio disponible, la estrategia completa se ve por defecto
  const [borrador, setBorrador] = useState<Valores>(VACIO);
  const [guardando, setGuardando] = useState(false);
  const completos = CAMPOS.filter((c) => valores[c.id].trim()).length;
  const clave = CAMPOS.filter((c) => CAMPOS_CLAVE.includes(c.id));
  const resto = CAMPOS.filter((c) => !CAMPOS_CLAVE.includes(c.id));

  const empezarEdicion = () => {
    setBorrador(valores);
    setVerMas(true);
    setEditando(true);
  };

  const guardar = async () => {
    setGuardando(true);
    const ok = await guardarTodos(borrador);
    setGuardando(false);
    if (ok) setEditando(false);
  };

  if (cargando) return <p className="text-sm text-[var(--c-muted)]">Cargando estrategia...</p>;

  const Fila: React.FC<{ c: { id: Campo; titulo: string }; recortar?: boolean }> = ({ c, recortar }) => {
    const texto = valores[c.id].trim();
    return (
      <div className="min-w-0">
        <dt className="text-[10px] font-mono uppercase tracking-wider text-[var(--c-muted)]">{c.titulo}</dt>
        <dd className={`text-xs mt-0.5 whitespace-pre-wrap ${recortar ? 'line-clamp-2' : ''} ${texto ? 'text-[var(--c-text-2)]' : 'text-[var(--c-warn)] italic'}`}>
          {texto || 'Sin definir'}
        </dd>
      </div>
    );
  };

  return (
    <div className="surface p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--c-text)]">Estrategia</p>
          <p className="text-[11px] font-mono text-[var(--c-muted)]">{completos}/{CAMPOS.length} definidos</p>
        </div>
        {editando ? (
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setEditando(false)} className="px-3 py-1.5 text-xs rounded border border-[var(--c-line)] text-[var(--c-text)] hover:bg-[var(--c-surface-2)]">Cancelar</button>
            <button onClick={guardar} disabled={guardando} className="px-3 py-1.5 text-xs font-semibold rounded bg-[var(--c-accent)] text-[var(--c-on-accent)] disabled:opacity-50">
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        ) : (
          <button onClick={empezarEdicion} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-[var(--c-line)] text-[var(--c-text)] hover:bg-[var(--c-surface-2)] shrink-0">
            <Pencil className="w-3 h-3" /> Editar
          </button>
        )}
      </div>

      {error && <p className="text-xs text-[var(--c-danger)] border border-[var(--c-danger)]/40 rounded p-2">{error}</p>}

      {editando ? (
        <div className="space-y-3">
          {CAMPOS.map((c) => (
            <label key={c.id} className="block space-y-1">
              <span className="block text-xs font-semibold text-[var(--c-text)]">{c.titulo}</span>
              <span className="block text-[11px] text-[var(--c-muted)]">{c.ayuda}</span>
              <textarea
                rows={2}
                className={areaClase}
                value={borrador[c.id]}
                onChange={(e) => setBorrador({ ...borrador, [c.id]: e.target.value })}
              />
            </label>
          ))}
        </div>
      ) : (
        <>
          <dl className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-3 gap-x-4 gap-y-3">
            {clave.map((c) => <Fila key={c.id} c={c} recortar={!verMas} />)}
          </dl>
          {verMas && (
            <dl className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-2 gap-x-4 gap-y-3 pt-4 border-t border-[var(--c-line)]">
              {resto.map((c) => <Fila key={c.id} c={c} />)}
            </dl>
          )}
          <button onClick={() => setVerMas(!verMas)} className="flex items-center gap-1 text-[11px] text-[var(--c-accent)] hover:underline">
            {verMas ? 'Ver menos' : `Ver más (${resto.length})`}
            {verMas ? null : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </>
      )}
    </div>
  );
};
