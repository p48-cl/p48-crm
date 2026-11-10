import React, { useCallback, useEffect, useState } from 'react';
import { Target, Pencil, Check } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface Avance {
  miembro_id: string;
  nombre: string;
  leads: number;
  reuniones: number;
  cierres: number;
}
interface Meta {
  id: string;
  miembro_id: string | null;
  leads_mes: number;
  reuniones_mes: number;
  cierres_mes: number;
}

const Barra: React.FC<{ etiqueta: string; actual: number; meta: number }> = ({ etiqueta, actual, meta }) => {
  const pct = meta > 0 ? Math.min(100, Math.round((actual / meta) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-[var(--c-text-2)]">{etiqueta}</span>
        <span className="font-mono text-[var(--c-text)]">
          {actual} / {meta}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--c-surface-3)] overflow-hidden">
        <div className="h-full bg-[var(--c-accent)]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

export const MetasMes: React.FC = () => {
  const { isAdmin } = useAuth();
  const [avance, setAvance] = useState<Avance[]>([]);
  const [metas, setMetas] = useState<Meta[]>([]);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({ leads: 0, reuniones: 0, cierres: 0 });

  const cargar = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    const [a, m] = await Promise.all([
      supabase.from('v_avance_mes').select('*'),
      supabase.from('metas_comerciales').select('*'),
    ]);
    if (a.data) setAvance(a.data as Avance[]);
    if (m.data) setMetas(m.data as Meta[]);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const global = metas.find((x) => x.miembro_id === null);
  if (!global) return null;

  const total = avance.reduce(
    (t, a) => ({ leads: t.leads + a.leads, reuniones: t.reuniones + a.reuniones, cierres: t.cierres + a.cierres }),
    { leads: 0, reuniones: 0, cierres: 0 },
  );

  const guardar = async () => {
    if (!supabase) return;
    await supabase
      .from('metas_comerciales')
      .update({
        leads_mes: form.leads,
        reuniones_mes: form.reuniones,
        cierres_mes: form.cierres,
        updated_at: new Date().toISOString(),
      })
      .eq('id', global.id);
    setEditando(false);
    cargar();
  };

  const input =
    'w-16 px-2 py-1 text-xs bg-[var(--c-surface)] border border-[var(--c-line)] rounded text-[var(--c-text)]';

  return (
    <section className="surface p-4 space-y-4" aria-label="Metas del mes">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-[var(--c-accent)]" />
          <h2 className="text-sm font-semibold text-[var(--c-text)]">Metas del mes</h2>
        </div>
        {isAdmin && !editando && (
          <button
            onClick={() => {
              setForm({ leads: global.leads_mes, reuniones: global.reuniones_mes, cierres: global.cierres_mes });
              setEditando(true);
            }}
            className="text-[var(--c-muted)] hover:text-[var(--c-text)]"
            aria-label="Editar metas"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {editando ? (
        <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--c-text-2)]">
          {(['leads', 'reuniones', 'cierres'] as const).map((k) => (
            <label key={k} className="flex items-center gap-1.5">
              {k}
              <input
                type="number"
                min={0}
                className={input}
                value={form[k]}
                onChange={(e) => setForm({ ...form, [k]: Math.max(0, Number(e.target.value) || 0) })}
              />
            </label>
          ))}
          <button onClick={guardar} className="flex items-center gap-1 text-[var(--c-ok)] font-semibold">
            <Check className="w-3.5 h-3.5" /> Guardar
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-3 gap-4">
          <Barra etiqueta="Leads" actual={total.leads} meta={global.leads_mes} />
          <Barra etiqueta="Reuniones" actual={total.reuniones} meta={global.reuniones_mes} />
          <Barra etiqueta="Cierres" actual={total.cierres} meta={global.cierres_mes} />
        </div>
      )}

      {avance.length > 1 && (
        <div className="border-t border-[var(--c-line)] pt-3 space-y-1.5">
          {avance.map((a) => (
            <div key={a.miembro_id} className="flex items-center justify-between text-xs">
              <span className="text-[var(--c-text)]">{a.nombre}</span>
              <span className="font-mono text-[var(--c-muted)]">
                {a.leads} leads · {a.reuniones} reuniones · {a.cierres} cierres
              </span>
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] text-[var(--c-muted)]">
        Meta global del equipo. Leads = oportunidades creadas; reuniones = actividades tipo reunión; cierres = oportunidades ganadas en el mes.
      </p>
    </section>
  );
};
