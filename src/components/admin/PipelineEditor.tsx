import React, { useMemo, useState } from 'react';
import { ArrowUp, ArrowDown, Plus } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import type { Etapa } from '../../types/crm';

const input =
  'px-2.5 py-1.5 text-xs bg-[var(--c-surface)] border border-[var(--c-line)] rounded text-[var(--c-text)] focus:outline-none focus:border-[var(--c-accent)]';

type Tipo = 'en_curso' | 'ganada' | 'perdida';
const tipoDe = (e: Etapa): Tipo => (e.es_ganada ? 'ganada' : e.es_perdida ? 'perdida' : 'en_curso');

export const PipelineEditor: React.FC = () => {
  const { etapas, oportunidades, guardarEtapa, crearEtapa, reordenarEtapas } = useCRM();
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevaProb, setNuevaProb] = useState(10);
  const [pipelineVista, setPipelineVista] = useState<'captacion' | 'expansion'>('captacion');

  const ordenadas = useMemo(
    () => [...etapas].filter((e) => e.pipeline === pipelineVista).sort((a, b) => a.orden - b.orden),
    [etapas, pipelineVista],
  );

  // Oportunidades vivas por etapa (para no desactivar una etapa con negocios dentro)
  const vivasPorEtapa = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of oportunidades) if (!o.archivado) m.set(o.etapa_id, (m.get(o.etapa_id) ?? 0) + 1);
    return m;
  }, [oportunidades]);

  const ejecutar = async (fn: () => Promise<string | null>) => {
    setError(null);
    setAviso(null);
    const err = await fn();
    if (err) setError(err);
  };

  const cambiarTipo = (e: Etapa, tipo: Tipo) =>
    ejecutar(async () => {
      // Solo una etapa ganada y una perdida: se limpia la marca anterior antes de asignar la nueva
      if (tipo === 'ganada') {
        for (const otra of etapas.filter((x) => x.es_ganada && x.id !== e.id && x.pipeline === e.pipeline)) {
          const r = await guardarEtapa(otra.id, { es_ganada: false });
          if (r) return r;
        }
      }
      if (tipo === 'perdida') {
        for (const otra of etapas.filter((x) => x.es_perdida && x.id !== e.id && x.pipeline === e.pipeline)) {
          const r = await guardarEtapa(otra.id, { es_perdida: false });
          if (r) return r;
        }
      }
      return guardarEtapa(e.id, {
        es_ganada: tipo === 'ganada',
        es_perdida: tipo === 'perdida',
        probabilidad_default: tipo === 'ganada' ? 100 : tipo === 'perdida' ? 0 : e.probabilidad_default,
      });
    });

  const alternarActiva = (e: Etapa) => {
    const vivas = vivasPorEtapa.get(e.id) ?? 0;
    if (e.activa && vivas > 0) {
      setAviso(`«${e.nombre}» tiene ${vivas} negocio(s) abierto(s). Muévelos a otra etapa antes de desactivarla.`);
      return;
    }
    ejecutar(() => guardarEtapa(e.id, { activa: !e.activa }));
  };

  const mover = (indice: number, dir: -1 | 1) => {
    const destino = indice + dir;
    if (destino < 0 || destino >= ordenadas.length) return;
    const ids = ordenadas.map((e) => e.id);
    [ids[indice], ids[destino]] = [ids[destino], ids[indice]];
    ejecutar(() => reordenarEtapas(ids));
  };

  const agregar = () => {
    const nombre = nuevoNombre.trim();
    if (!nombre) return setError('Pon un nombre para la etapa.');
    if (nuevaProb < 0 || nuevaProb > 100) return setError('La probabilidad debe estar entre 0 y 100.');
    ejecutar(async () => {
      const r = await crearEtapa(nombre, nuevaProb, pipelineVista);
      if (!r) { setNuevoNombre(''); setNuevaProb(10); }
      return r;
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs font-semibold text-[var(--c-text)]">Etapas del pipeline</h3>
        <p className="text-[11px] text-[var(--c-muted)]">
          Orden de las columnas del tablero. Una etapa inactiva deja de aparecer, pero sus negocios se conservan.
          La probabilidad se usa para el forecast ponderado.
        </p>
      </div>

      <div className="flex items-center p-0.5 bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded text-xs w-fit">
        {([['captacion', 'Captación (prospectos)'], ['expansion', 'Expansión (clientes activos)']] as ['captacion' | 'expansion', string][]).map(([p, label]) => (
          <button
            key={p}
            type="button"
            onClick={() => setPipelineVista(p)}
            className={`px-3 py-1.5 rounded transition-colors ${pipelineVista === p ? 'bg-[var(--c-surface-3)] text-[var(--c-text)] font-medium shadow-sm' : 'text-[var(--c-muted)] hover:text-[var(--c-text-2)]'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="text-xs text-[var(--c-danger)] border border-[var(--c-danger)]/40 rounded p-2">{error}</p>}
      {aviso && <p className="text-xs text-[var(--c-warn)] border border-[var(--c-warn)]/40 rounded p-2">{aviso}</p>}

      <div className="surface divide-y divide-[var(--c-line)]">
        {ordenadas.map((e, i) => {
          const tipo = tipoDe(e);
          const vivas = vivasPorEtapa.get(e.id) ?? 0;
          return (
            <div key={e.id} className={`p-3 flex flex-wrap items-center gap-3 ${e.activa ? '' : 'opacity-50'}`}>
              <div className="flex flex-col">
                <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} className="p-0.5 disabled:opacity-30 text-[var(--c-muted)] hover:text-[var(--c-text)]" aria-label="Subir">
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => mover(i, 1)} disabled={i === ordenadas.length - 1} className="p-0.5 disabled:opacity-30 text-[var(--c-muted)] hover:text-[var(--c-text)]" aria-label="Bajar">
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>

              <input
                type="color"
                value={e.color || '#888888'}
                onChange={(ev) => ejecutar(() => guardarEtapa(e.id, { color: ev.target.value }))}
                className="w-7 h-7 rounded border border-[var(--c-line)] bg-transparent cursor-pointer"
                aria-label={`Color de ${e.nombre}`}
              />

              <input
                className={`${input} flex-1 min-w-[160px]`}
                defaultValue={e.nombre}
                onBlur={(ev) => {
                  const n = ev.target.value.trim();
                  if (n && n !== e.nombre) ejecutar(() => guardarEtapa(e.id, { nombre: n }));
                  else ev.target.value = e.nombre;
                }}
                aria-label="Nombre de la etapa"
              />

              <label className="flex items-center gap-1.5 text-[11px] text-[var(--c-muted)]">
                Prob.
                <input
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={Number(e.probabilidad_default)}
                  disabled={tipo !== 'en_curso'}
                  onBlur={(ev) => {
                    const v = Number(ev.target.value);
                    if (Number.isNaN(v) || v < 0 || v > 100) { setError('La probabilidad debe estar entre 0 y 100.'); ev.target.value = String(e.probabilidad_default); return; }
                    if (v !== Number(e.probabilidad_default)) ejecutar(() => guardarEtapa(e.id, { probabilidad_default: v }));
                  }}
                  className={`${input} w-16 font-mono disabled:opacity-40`}
                />
                %
              </label>

              <div className="flex rounded border border-[var(--c-line)] overflow-hidden text-[11px]" role="radiogroup" aria-label="Tipo de etapa">
                {([['en_curso', 'En curso'], ['ganada', 'Ganada'], ['perdida', 'Perdida']] as [Tipo, string][]).map(([t, label]) => (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={tipo === t}
                    onClick={() => tipo !== t && cambiarTipo(e, t)}
                    className={`px-2.5 py-1 ${tipo === t ? 'bg-[var(--c-accent)] text-[var(--c-on-accent)] font-semibold' : 'text-[var(--c-muted)] hover:text-[var(--c-text)]'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => alternarActiva(e)}
                className="px-2.5 py-1 text-[11px] rounded border border-[var(--c-line)] text-[var(--c-text)] hover:bg-[var(--c-surface-2)]"
              >
                {e.activa ? 'Desactivar' : 'Activar'}
              </button>

              <span className="text-[10px] font-mono text-[var(--c-muted)] w-20 text-right">{vivas} abiertos</span>
            </div>
          );
        })}
        {ordenadas.length === 0 && <p className="p-4 text-xs text-[var(--c-muted)]">No hay etapas cargadas.</p>}
      </div>

      <div className="surface p-3 flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-[var(--c-muted)]">Nueva etapa en {pipelineVista === 'captacion' ? 'Captación' : 'Expansión'}</span>
        <input className={`${input} min-w-[200px]`} placeholder="Nombre (ej: Reunión agendada)" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} />
        <input type="number" min={0} max={100} className={`${input} w-20 font-mono`} value={nuevaProb} onChange={(e) => setNuevaProb(Number(e.target.value))} aria-label="Probabilidad" />
        <button type="button" onClick={agregar} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-[var(--c-accent)] text-[var(--c-on-accent)]">
          <Plus className="w-3.5 h-3.5" /> Agregar
        </button>
      </div>
    </div>
  );
};
