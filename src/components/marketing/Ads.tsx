import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { formatCLP } from '../../lib/formatters';
import { Barras, Variacion, fechaCorta, useDatosMarketing } from './comun';

interface Campana {
  empresa_id: string;
  plataforma: string;
  campana_id: string;
  campana_nombre: string;
  canal: string | null;
  periodo: string;
  presupuesto_diario_clp: number | null;
  costo_clp: number;
  impresiones: number;
  clics: number;
  conversiones: number;
  valor_conversion_clp: number;
  es_prueba: boolean;
}

const select = 'px-2.5 py-1.5 text-xs bg-[var(--c-surface)] border border-[var(--c-line)] rounded text-[var(--c-text)]';
const pct = (v: number) => `${Math.round(v * 100)}%`;

export const Ads: React.FC<{ plataforma?: string }> = ({ plataforma }) => {
  const { clientes, cargando } = useDatosMarketing();
  const [clienteSel, setClienteSel] = useState('todos');
  const [campanas, setCampanas] = useState<Campana[]>([]);
  const [conPrueba, setConPrueba] = useState(false);
  const [plataformaSel, setPlataformaSel] = useState(plataforma ?? 'todas');

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    let vivo = true;
    supabase
      .from('metricas_campanas')
      .select('*')
      .order('periodo', { ascending: true })
      .then(({ data }) => {
        if (vivo) setCampanas(((data as any[]) ?? []).map((r) => ({ ...r, costo_clp: Number(r.costo_clp), valor_conversion_clp: Number(r.valor_conversion_clp), conversiones: Number(r.conversiones), presupuesto_diario_clp: r.presupuesto_diario_clp === null ? null : Number(r.presupuesto_diario_clp) })));
      });
    return () => {
      vivo = false;
    };
  }, []);

  const nombres = useMemo(() => new Map(clientes.map((c) => [c.id, c.nombre])), [clientes]);

  const d = useMemo(() => {
    const filtradas = campanas.filter(
      (c) =>
        (clienteSel === 'todos' || c.empresa_id === clienteSel) &&
        (plataformaSel === 'todas' || c.plataforma === plataformaSel) &&
        (conPrueba || !c.es_prueba),
    );
    const periodos = [...new Set(filtradas.map((c) => c.periodo))].sort();
    const ultima = periodos[periodos.length - 1];
    const penultima = periodos[periodos.length - 2];
    const semana = (p?: string) => (p ? filtradas.filter((c) => c.periodo === p) : []);
    const resumen = (rows: Campana[]) => {
      const costo = rows.reduce((a, r) => a + r.costo_clp, 0);
      const valor = rows.reduce((a, r) => a + r.valor_conversion_clp, 0);
      const conv = rows.reduce((a, r) => a + r.conversiones, 0);
      const clics = rows.reduce((a, r) => a + r.clics, 0);
      const imp = rows.reduce((a, r) => a + r.impresiones, 0);
      const presupuesto = rows.reduce((a, r) => a + (r.presupuesto_diario_clp ?? 0) * 7, 0);
      return { costo, valor, conv, clics, imp, presupuesto, roas: costo > 0 ? valor / costo : 0, cpa: conv > 0 ? costo / conv : 0 };
    };
    const ahora = resumen(semana(ultima));
    const antes = resumen(semana(penultima));

    const porSemana = periodos.slice(-8).map((p) => ({ etiqueta: fechaCorta(p), valor: resumen(semana(p)).costo }));

    const alertas: { campana: string; cliente: string; texto: string }[] = [];
    for (const c of semana(ultima)) {
      const cli = nombres.get(c.empresa_id) ?? '';
      const semanal = (c.presupuesto_diario_clp ?? 0) * 7;
      const ejec = semanal > 0 ? c.costo_clp / semanal : null;
      if (ejec !== null && ejec < 0.7)
        alertas.push({ campana: c.campana_nombre, cliente: cli, texto: `Gasta ${pct(ejec)} de su presupuesto semanal: no está consumiendo.` });
      if (ejec !== null && ejec > 1.1)
        alertas.push({ campana: c.campana_nombre, cliente: cli, texto: `Gasta ${pct(ejec)} de su presupuesto semanal: sobre el techo.` });
      if (c.costo_clp > 0 && c.conversiones === 0)
        alertas.push({ campana: c.campana_nombre, cliente: cli, texto: `${formatCLP(c.costo_clp)} sin conversiones en la semana.` });
    }

    const tabla = semana(ultima).map((c) => {
      const semanal = (c.presupuesto_diario_clp ?? 0) * 7;
      const previa = filtradas.find((x) => x.periodo === penultima && x.campana_id === c.campana_id && x.empresa_id === c.empresa_id);
      return {
        ...c,
        cliente: nombres.get(c.empresa_id) ?? '',
        ejec: semanal > 0 ? c.costo_clp / semanal : null,
        ctr: c.impresiones > 0 ? c.clics / c.impresiones : null,
        cpa: c.conversiones > 0 ? c.costo_clp / c.conversiones : null,
        roas: c.costo_clp > 0 ? c.valor_conversion_clp / c.costo_clp : null,
        costoPrev: previa?.costo_clp,
      };
    });

    return { ultima, ahora, antes, porSemana, alertas, tabla, hayDatos: periodos.length > 0 };
  }, [campanas, clienteSel, plataformaSel, conPrueba, nombres]);

  if (cargando) return <p className="text-sm text-[var(--c-muted)]">Cargando...</p>;

  const k = [
    { t: 'Inversión semanal', v: formatCLP(d.ahora.costo), a: d.ahora.costo, b: d.antes.costo, mejor: true },
    { t: 'ROAS', v: `${d.ahora.roas.toFixed(1)}x`, a: d.ahora.roas, b: d.antes.roas, mejor: true },
    { t: 'CPA', v: d.ahora.cpa ? formatCLP(d.ahora.cpa) : '—', a: d.ahora.cpa, b: d.antes.cpa, mejor: false },
    { t: 'Conversiones', v: d.ahora.conv.toLocaleString('es-CL'), a: d.ahora.conv, b: d.antes.conv, mejor: true },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <select className={select} value={clienteSel} onChange={(e) => setClienteSel(e.target.value)} aria-label="Cliente">
          <option value="todos">Toda la cartera</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
        {!plataforma && (
        <select className={select} value={plataformaSel} onChange={(e) => setPlataformaSel(e.target.value)} aria-label="Plataforma">
          <option value="todas">Todas las plataformas</option>
          <option value="google_ads">Google Ads</option>
          <option value="meta_ads">Meta Ads</option>
          <option value="tiktok_ads">TikTok Ads</option>
          <option value="linkedin_ads">LinkedIn Ads</option>
        </select>
        )}
        <label className="flex items-center gap-1.5 text-xs text-[var(--c-text-2)]">
          <input type="checkbox" checked={conPrueba} onChange={(e) => setConPrueba(e.target.checked)} />
          Incluir datos de prueba
        </label>
        {d.ultima && <span className="text-[11px] text-[var(--c-muted)] ml-auto">Semana del {fechaCorta(d.ultima)}</span>}
      </div>

      {!d.hayDatos ? (
        <div className="surface p-6 text-sm text-[var(--c-muted)]">Sin campañas registradas para este filtro.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {k.map((x) => (
              <div key={x.t} className="surface p-4 space-y-1">
                <p className="text-[11px] font-mono uppercase tracking-wider text-[var(--c-muted)]">{x.t}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold font-mono text-[var(--c-text)]">{x.v}</span>
                  <Variacion actual={x.a} previo={x.b} mejorSube={x.mejor} />
                </div>
              </div>
            ))}
          </div>

          <div className="surface p-4 space-y-2">
            <p className="text-sm font-semibold text-[var(--c-text)]">Inversión por semana</p>
            <Barras puntos={d.porSemana} formato={formatCLP} />
          </div>

          <div className="surface overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[var(--c-muted)] border-b border-[var(--c-line)]">
                  {['Campaña', 'Cliente', 'Inversión', 'Ejecución', 'Clics', 'CTR', 'CPA', 'ROAS'].map((h) => (
                    <th key={h} className="p-3 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.tabla.map((r) => (
                  <tr key={`${r.empresa_id}-${r.campana_id}`} className="border-b border-[var(--c-line)] last:border-0">
                    <td className="p-3 font-medium text-[var(--c-text)]">
                      {r.campana_nombre}
                      {r.es_prueba && <span className="ml-2 text-[10px] font-mono text-[var(--c-warn)]">PRUEBA</span>}
                    </td>
                    <td className="p-3 text-[var(--c-text-2)] whitespace-nowrap">{r.cliente}</td>
                    <td className="p-3 font-mono">
                      {formatCLP(r.costo_clp)} <Variacion actual={r.costo_clp} previo={r.costoPrev} mejorSube={false} />
                    </td>
                    <td className={`p-3 font-mono ${r.ejec !== null && r.ejec < 0.7 ? 'text-[var(--c-danger)]' : ''}`}>
                      {r.ejec !== null ? pct(r.ejec) : '—'}
                    </td>
                    <td className="p-3 font-mono">{r.clics.toLocaleString('es-CL')}</td>
                    <td className="p-3 font-mono">{r.ctr !== null ? `${(r.ctr * 100).toFixed(1)}%` : '—'}</td>
                    <td className="p-3 font-mono">{r.cpa !== null ? formatCLP(r.cpa) : '—'}</td>
                    <td className="p-3 font-mono">{r.roas !== null ? `${r.roas.toFixed(1)}x` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <section className="surface p-4 space-y-2" aria-label="Alertas de Ads">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[var(--c-warn)]" />
          <h2 className="text-sm font-semibold text-[var(--c-text)]">Alertas de pauta</h2>
        </div>
        {d.alertas.length === 0 ? (
          <p className="text-xs text-[var(--c-muted)]">Sin alertas de pauta en la última semana.</p>
        ) : (
          <ul className="space-y-1.5 text-xs">
            {d.alertas.map((a, i) => (
              <li key={i} className="text-[var(--c-text-2)]">
                <span className="font-medium text-[var(--c-text)]">{a.cliente}</span> · {a.campana} · {a.texto}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
