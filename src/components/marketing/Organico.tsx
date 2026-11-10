import React, { useEffect, useMemo, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { Variacion, fechaCorta, useDatosMarketing } from './comun';

const REDES: { id: string; nombre: string }[] = [
  { id: 'instagram', nombre: 'Instagram' },
  { id: 'facebook', nombre: 'Facebook' },
  { id: 'tiktok', nombre: 'TikTok' },
  { id: 'linkedin', nombre: 'LinkedIn' },
  { id: 'youtube', nombre: 'YouTube' },
  { id: 'otro', nombre: 'Otra red' },
];

interface Punto { plataforma: string; metrica: string; periodo: string; valor: number }

const select = 'px-2.5 py-1.5 text-xs bg-[var(--c-surface)] border border-[var(--c-line)] rounded text-[var(--c-text)]';
const etiqueta = (m: string) => m.replace(/_/g, ' ');

export const Organico: React.FC<{ plataformas?: string[]; nombres?: Record<string, string> }> = ({ plataformas, nombres }) => {
  const redes = plataformas
    ? plataformas.map((id) => ({ id, nombre: nombres?.[id] ?? REDES.find((r) => r.id === id)?.nombre ?? id }))
    : REDES;
  const clave = redes.map((r) => r.id).join(',');
  const { clientes, cargando } = useDatosMarketing();
  const [clienteSel, setClienteSel] = useState('');
  const [puntos, setPuntos] = useState<Punto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const clienteId = clienteSel || clientes[0]?.id || '';

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !clienteId) return;
    let vivo = true;
    supabase
      .from('metricas_snapshot')
      .select('plataforma,metrica,periodo,valor')
      .eq('empresa_id', clienteId)
      .in('plataforma', clave.split(','))
      .order('periodo', { ascending: true })
      .limit(5000)
      .then(({ data, error: err }) => {
        if (!vivo) return;
        if (err) setError(err.message);
        setPuntos(((data ?? []) as Punto[]).map((p) => ({ ...p, valor: Number(p.valor) })));
      });
    return () => { vivo = false; };
  }, [clienteId, clave]);

  // Por red: métricas con su última lectura y la anterior
  const porRed = useMemo(() => {
    const out = new Map<string, Map<string, Punto[]>>();
    for (const p of puntos) {
      if (!out.has(p.plataforma)) out.set(p.plataforma, new Map());
      const m = out.get(p.plataforma)!;
      m.set(p.metrica, [...(m.get(p.metrica) ?? []), p]);
    }
    return out;
  }, [puntos]);

  if (cargando) return <p className="text-sm text-[var(--c-muted)]">Cargando...</p>;
  if (clientes.length === 0) return <div className="surface p-6 text-sm text-[var(--c-muted)]">No hay clientes activos todavía.</div>;

  const redesConDatos = redes.filter((r) => porRed.has(r.id));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <select value={clienteId} onChange={(e) => setClienteSel(e.target.value)} className={select} aria-label="Cliente">
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <span className="text-[11px] text-[var(--c-muted)]">Sincronizado por el conector o cargado por CSV / manual</span>
      </div>

      {error && <p className="text-xs text-[var(--c-danger)] border border-[var(--c-danger)]/40 rounded p-2">{error}</p>}

      {redesConDatos.length === 0 ? (
        <div className="surface p-6 text-xs text-[var(--c-muted)]">
          Sin métricas de {redes.map((r) => r.nombre).join(', ')} para este cliente. Aparecerán tras la próxima sincronización o al cargar un CSV.
        </div>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-2 gap-3">
          {redesConDatos.map((red) => {
            const metricas = porRed.get(red.id)!;
            const ultimaSemana = [...new Set([...metricas.values()].flat().map((p) => p.periodo))].sort().pop();
            return (
              <div key={red.id} className="surface p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-[var(--c-text)]">{red.nombre}</p>
                  {ultimaSemana && <span className="text-[10px] font-mono text-[var(--c-muted)]">{fechaCorta(ultimaSemana)}</span>}
                </div>
                <div className="divide-y divide-[var(--c-line)]">
                  {[...metricas.entries()].map(([nombre, serie]) => {
                    const ult = serie[serie.length - 1];
                    const prev = serie[serie.length - 2];
                    return (
                      <div key={nombre} className="py-2 flex items-center justify-between gap-3 text-xs">
                        <span className="text-[var(--c-text-2)] capitalize">{etiqueta(nombre)}</span>
                        <span className="flex items-baseline gap-2">
                          <span className="font-mono font-semibold text-[var(--c-text)]">{ult.valor.toLocaleString('es-CL')}</span>
                          <Variacion actual={ult.valor} previo={prev?.valor} mejorSube />
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
