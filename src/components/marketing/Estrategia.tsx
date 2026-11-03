import React, { useCallback, useEffect, useState } from 'react';
import { Copy, Check } from 'lucide-react';
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

  const clienteId = clienteSel || clientes[0]?.id || '';
  const cliente = clientes.find((c) => c.id === clienteId);

  const cargar = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase || !clienteId) return;
    const { data, error: err } = await supabase.from('estrategia_cliente').select('*').eq('empresa_id', clienteId).maybeSingle();
    if (err) setError(parseSupabaseError(err));
    const v = { ...VACIO };
    for (const c of CAMPOS) v[c.id] = (data as any)?.[c.id] ?? '';
    setValores(v);
    setGuardado(null);
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
          <span className="text-[11px] text-[var(--c-muted)]">{completos} de {CAMPOS.length} campos completos</span>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {CAMPOS.map((c) => (
          <div key={c.id} className="surface p-4 space-y-1.5">
            <label className="block text-xs font-semibold text-[var(--c-text)]">{c.titulo}</label>
            <p className="text-[11px] text-[var(--c-muted)]">{c.ayuda}</p>
            <textarea
              rows={3}
              className={areaClase}
              value={valores[c.id]}
              onChange={(e) => setValores({ ...valores, [c.id]: e.target.value })}
              onBlur={(e) => guardar(c.id, e.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
