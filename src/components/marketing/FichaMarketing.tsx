import React, { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { formatCLP } from '../../lib/formatters';
import { METRICAS, Variacion } from './comun';
import { UltimoAnalisis } from './UltimoAnalisis';

interface Punto { plataforma: string; metrica: string; periodo: string; valor: number }
interface Camp { campana_nombre: string; periodo: string; costo_clp: number; conversiones: number; valor_conversion_clp: number }

const ETIQUETAS: Record<string, string> = {
  objetivo_ventas: 'Objetivo de ventas',
  objetivo_marketing: 'Objetivo de marketing',
  canal_prioritario: 'Canal prioritario',
  mercado_objetivo: 'Mercado objetivo',
  posicionamiento: 'Posicionamiento',
  competidores: 'Competidores',
  storytelling: 'Storytelling',
  tono_voz: 'Tono de voz',
  notas_creativos: 'Notas para creativos',
};

// Resumen de marketing dentro de la ficha de Empresa (solo clientes).
export const FichaMarketing: React.FC<{ empresaId: string }> = ({ empresaId }) => {
  const [puntos, setPuntos] = useState<Punto[]>([]);
  const [camps, setCamps] = useState<Camp[]>([]);
  const [estrategia, setEstrategia] = useState<Record<string, string | null>>({});
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    let vivo = true;
    setCargando(true);
    Promise.all([
      supabase.from('metricas_snapshot').select('plataforma,metrica,periodo,valor').eq('empresa_id', empresaId).order('periodo', { ascending: true }).limit(500),
      supabase.from('metricas_campanas').select('campana_nombre,periodo,costo_clp,conversiones,valor_conversion_clp').eq('empresa_id', empresaId).order('periodo', { ascending: true }).limit(500),
      supabase.from('estrategia_cliente').select('*').eq('empresa_id', empresaId).maybeSingle(),
    ]).then(([m, c, e]) => {
      if (!vivo) return;
      setPuntos(((m.data ?? []) as Punto[]).map((p) => ({ ...p, valor: Number(p.valor) })));
      setCamps(((c.data ?? []) as Camp[]).map((r) => ({ ...r, costo_clp: Number(r.costo_clp), conversiones: Number(r.conversiones), valor_conversion_clp: Number(r.valor_conversion_clp) })));
      setEstrategia((e.data ?? {}) as Record<string, string | null>);
      setCargando(false);
    });
    return () => { vivo = false; };
  }, [empresaId]);

  if (cargando) return <p className="text-xs text-[var(--c-muted)]">Cargando marketing...</p>;

  const ultimaSemana = [...new Set(camps.map((c) => c.periodo))].sort().pop();
  const campsSemana = camps.filter((c) => c.periodo === ultimaSemana);
  const campos = Object.keys(ETIQUETAS).filter((k) => estrategia[k]?.trim());

  return (
    <div className="space-y-5">
      <UltimoAnalisis empresaId={empresaId} />
      <section className="space-y-2">
        <h3 className="text-xs font-semibold text-[var(--c-text)]">Métricas de la última semana</h3>
        <div className="grid grid-cols-2 gap-2">
          {METRICAS.map((m) => {
            const s = puntos.filter((p) => p.plataforma === m.plataforma && p.metrica === m.metrica);
            const ult = s[s.length - 1];
            const prev = s[s.length - 2];
            return (
              <div key={m.clave} className="surface p-3 space-y-0.5">
                <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--c-muted)]">{m.titulo}</p>
                {ult ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-bold font-mono text-[var(--c-text)]">{m.formato(ult.valor)}</span>
                    <Variacion actual={ult.valor} previo={prev?.valor} mejorSube={m.mejorSube} />
                  </div>
                ) : (
                  <span className="text-xs text-[var(--c-muted-2)]">Sin datos</span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-semibold text-[var(--c-text)]">Campañas{ultimaSemana ? ` · semana ${ultimaSemana}` : ''}</h3>
        {campsSemana.length === 0 ? (
          <p className="text-xs text-[var(--c-muted)]">Sin campañas cargadas.</p>
        ) : (
          <div className="surface divide-y divide-[var(--c-line)]">
            {campsSemana.map((c) => (
              <div key={c.campana_nombre} className="p-3 flex items-center justify-between gap-3 text-xs">
                <span className="text-[var(--c-text)] truncate">{c.campana_nombre}</span>
                <span className="font-mono text-[var(--c-muted)] shrink-0">
                  {formatCLP(c.costo_clp)} · {c.conversiones} conv.
                  {c.costo_clp > 0 && c.valor_conversion_clp > 0 ? ` · ROAS ${(c.valor_conversion_clp / c.costo_clp).toFixed(1)}x` : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-semibold text-[var(--c-text)]">Estrategia ({campos.length}/{Object.keys(ETIQUETAS).length})</h3>
        {campos.length === 0 ? (
          <p className="text-xs text-[var(--c-muted)]">Aún no se define. Se completa en Mkt Inteligence &gt; Estrategia.</p>
        ) : (
          <div className="space-y-2">
            {campos.map((k) => (
              <div key={k} className="surface p-3">
                <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--c-muted)]">{ETIQUETAS[k]}</p>
                <p className="text-xs text-[var(--c-text-2)] whitespace-pre-wrap mt-0.5">{estrategia[k]}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
