import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { formatCLP } from '../../lib/formatters';
import { Barras, FiltroPeriodo, Rango, Variacion, fechaCorta, useDatosMarketing, ventanas } from './comun';
import { ThOrdenable } from '../common/ThOrdenable';
import { useOrden } from '../../lib/orden';

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

interface Acumulado {
  key: string;
  nombre: string;
  cliente: string;
  es_prueba: boolean;
  costo: number;
  valor: number;
  conv: number;
  clics: number;
  imp: number;
  presupuesto: number;
}

const select = 'px-2.5 py-1.5 text-xs bg-[var(--c-surface)] border border-[var(--c-line)] rounded text-[var(--c-text)]';
const pct = (v: number) => `${Math.round(v * 100)}%`;

export const Ads: React.FC<{ plataforma?: string }> = ({ plataforma }) => {
  const { clientes, cargando } = useDatosMarketing();
  const [clienteSel, setClienteSel] = useState('todos');
  const [campanas, setCampanas] = useState<Campana[]>([]);
  const [conPrueba, setConPrueba] = useState(false);
  const [plataformaSel, setPlataformaSel] = useState(plataforma ?? 'todas');
  const [rango, setRango] = useState<Rango>(1);

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
    const base = campanas.filter(
      (c) =>
        (clienteSel === 'todos' || c.empresa_id === clienteSel) &&
        (plataformaSel === 'todas' || c.plataforma === plataformaSel) &&
        (conPrueba || !c.es_prueba),
    );
    const v = ventanas(base.map((c) => c.periodo), rango);
    const enActual = base.filter((c) => v.actual.includes(c.periodo));
    const enPrevia = base.filter((c) => v.previa.includes(c.periodo));

    const resumen = (rows: Campana[]) => {
      const costo = rows.reduce((a, r) => a + r.costo_clp, 0);
      const valor = rows.reduce((a, r) => a + r.valor_conversion_clp, 0);
      const conv = rows.reduce((a, r) => a + r.conversiones, 0);
      return { costo, conv, roas: costo > 0 ? valor / costo : 0, cpa: conv > 0 ? costo / conv : 0 };
    };

    // Una fila por campaña dentro de la ventana, sumando sus semanas
    const grupos = new Map<string, Acumulado>();
    for (const c of enActual) {
      const key = `${c.empresa_id}|${c.campana_id}`;
      const g = grupos.get(key) ?? { key, nombre: c.campana_nombre, cliente: nombres.get(c.empresa_id) ?? '', es_prueba: c.es_prueba, costo: 0, valor: 0, conv: 0, clics: 0, imp: 0, presupuesto: 0 };
      g.costo += c.costo_clp;
      g.valor += c.valor_conversion_clp;
      g.conv += c.conversiones;
      g.clics += c.clics;
      g.imp += c.impresiones;
      g.presupuesto += (c.presupuesto_diario_clp ?? 0) * 7;
      grupos.set(key, g);
    }
    const costoPrevio = new Map<string, number>();
    for (const c of enPrevia) {
      const key = `${c.empresa_id}|${c.campana_id}`;
      costoPrevio.set(key, (costoPrevio.get(key) ?? 0) + c.costo_clp);
    }

    const tabla = [...grupos.values()].map((g) => ({
      ...g,
      costoPrevio: costoPrevio.get(g.key),
      ejec: g.presupuesto > 0 ? g.costo / g.presupuesto : null,
      ctr: g.imp > 0 ? g.clics / g.imp : null,
      cpa: g.conv > 0 ? g.costo / g.conv : null,
      roas: g.costo > 0 ? g.valor / g.costo : null,
    }));

    const alertas: { campana: string; cliente: string; texto: string }[] = [];
    for (const r of tabla) {
      if (r.ejec !== null && r.ejec < 0.7)
        alertas.push({ campana: r.nombre, cliente: r.cliente, texto: `Gasta ${pct(r.ejec)} de su presupuesto del periodo: no está consumiendo.` });
      if (r.ejec !== null && r.ejec > 1.1)
        alertas.push({ campana: r.nombre, cliente: r.cliente, texto: `Gasta ${pct(r.ejec)} de su presupuesto del periodo: sobre el techo.` });
      if (r.costo > 0 && r.conv === 0)
        alertas.push({ campana: r.nombre, cliente: r.cliente, texto: `${formatCLP(r.costo)} sin conversiones en el periodo.` });
    }

    const porPeriodo = v.actual.map((p) => ({
      etiqueta: fechaCorta(p),
      valor: enActual.filter((c) => c.periodo === p).reduce((a, c) => a + c.costo_clp, 0),
    }));

    return {
      actual: v.actual,
      ahora: resumen(enActual),
      antes: resumen(enPrevia),
      porPeriodo,
      alertas,
      tabla,
      hayDatos: enActual.length > 0,
    };
  }, [campanas, clienteSel, plataformaSel, conPrueba, rango, nombres]);

  // Orden de la tabla de campañas (hook antes del return condicional)
  const ordAds = useOrden<'campana' | 'cliente' | 'inversion' | 'ejec' | 'clics' | 'ctr' | 'cpa' | 'roas'>('inversion', 'desc');
  const tablaOrdenada = ordAds.ordenar(d.tabla, (r, k) => {
    switch (k) {
      case 'campana': return r.nombre;
      case 'cliente': return r.cliente;
      case 'inversion': return r.costo;
      case 'ejec': return r.ejec ?? -1;
      case 'clics': return r.clics;
      case 'ctr': return r.ctr ?? -1;
      case 'cpa': return r.cpa ?? -1;
      case 'roas': return r.roas ?? -1;
    }
  });

  if (cargando) return <p className="text-sm text-[var(--c-muted)]">Cargando...</p>;

  const k = [
    { t: 'Inversión', v: formatCLP(d.ahora.costo), a: d.ahora.costo, b: d.antes.costo, mejor: true },
    { t: 'ROAS', v: `${d.ahora.roas.toFixed(1)}x`, a: d.ahora.roas, b: d.antes.roas, mejor: true },
    { t: 'CPA', v: d.ahora.cpa ? formatCLP(d.ahora.cpa) : '—', a: d.ahora.cpa, b: d.antes.cpa, mejor: false },
    { t: 'Conversiones', v: d.ahora.conv.toLocaleString('es-CL'), a: d.ahora.conv, b: d.antes.conv, mejor: true },
  ];

  const primera = d.actual[0];
  const ultima = d.actual[d.actual.length - 1];
  const rotulo = !primera ? '' : primera === ultima ? `Semana del ${fechaCorta(primera)}` : `${fechaCorta(primera)} – ${fechaCorta(ultima)}`;

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
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <FiltroPeriodo valor={rango} onChange={setRango} />
          {rotulo && <span className="text-[11px] text-[var(--c-muted)]">{rotulo}</span>}
        </div>
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

          {d.porPeriodo.length > 1 && (
            <div className="surface p-4 space-y-2">
              <p className="text-sm font-semibold text-[var(--c-text)]">Inversión por semana</p>
              <Barras puntos={d.porPeriodo} formato={formatCLP} />
            </div>
          )}

          <div className="surface overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[var(--c-muted)] border-b border-[var(--c-line)]">
                  <ThOrdenable etiqueta="Campaña" className="p-3 font-medium whitespace-nowrap" activa={ordAds.clave === 'campana'} dir={ordAds.dir} onClick={() => ordAds.alternar('campana')} />
                  <ThOrdenable etiqueta="Cliente" className="p-3 font-medium whitespace-nowrap" activa={ordAds.clave === 'cliente'} dir={ordAds.dir} onClick={() => ordAds.alternar('cliente')} />
                  <ThOrdenable etiqueta="Inversión" className="p-3 font-medium whitespace-nowrap" activa={ordAds.clave === 'inversion'} dir={ordAds.dir} onClick={() => ordAds.alternar('inversion')} />
                  <ThOrdenable etiqueta="Ejecución" className="p-3 font-medium whitespace-nowrap" activa={ordAds.clave === 'ejec'} dir={ordAds.dir} onClick={() => ordAds.alternar('ejec')} />
                  <ThOrdenable etiqueta="Clics" className="p-3 font-medium whitespace-nowrap" activa={ordAds.clave === 'clics'} dir={ordAds.dir} onClick={() => ordAds.alternar('clics')} />
                  <ThOrdenable etiqueta="CTR" className="p-3 font-medium whitespace-nowrap" activa={ordAds.clave === 'ctr'} dir={ordAds.dir} onClick={() => ordAds.alternar('ctr')} />
                  <ThOrdenable etiqueta="CPA" className="p-3 font-medium whitespace-nowrap" activa={ordAds.clave === 'cpa'} dir={ordAds.dir} onClick={() => ordAds.alternar('cpa')} />
                  <ThOrdenable etiqueta="ROAS" className="p-3 font-medium whitespace-nowrap" activa={ordAds.clave === 'roas'} dir={ordAds.dir} onClick={() => ordAds.alternar('roas')} />
                </tr>
              </thead>
              <tbody>
                {tablaOrdenada.map((r) => (
                  <tr key={r.key} className="border-b border-[var(--c-line)] last:border-0">
                    <td className="p-3 font-medium text-[var(--c-text)]">
                      {r.nombre}
                      {r.es_prueba && <span className="ml-2 text-[10px] font-mono text-[var(--c-warn)]">PRUEBA</span>}
                    </td>
                    <td className="p-3 text-[var(--c-text-2)] whitespace-nowrap">{r.cliente}</td>
                    <td className="p-3 font-mono">
                      {formatCLP(r.costo)} <Variacion actual={r.costo} previo={r.costoPrevio} mejorSube={false} />
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
          <p className="text-xs text-[var(--c-muted)]">Sin alertas de pauta en el periodo seleccionado.</p>
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
