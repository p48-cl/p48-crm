import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { formatCLP } from '../lib/formatters';
import type { ViewType } from '../components/layout/Sidebar';
import { MetasMes } from '../components/dashboard/MetasMes';
import { LoUrgenteHoy } from '../components/dashboard/LoUrgenteHoy';
import { useProyectos } from '../components/proyectos/useProyectos';
import { Kpi, Bloque, Dona, BarraApilada, FilaBarra, Vacio, COLOR_SALUD } from '../components/dashboard/ui';
import {
  PERIODOS,
  Periodo,
  inicioPeriodo,
  metricasPipeline,
  resultadosPeriodo,
  forecastMensual,
  metricasCartera,
  metricasTareas,
  metricasProyectos,
} from '../components/dashboard/metricas';

type Seccion = 'todo' | 'comercial' | 'clientes' | 'operacion' | 'marketing';
const SECCIONES: { id: Seccion; label: string }[] = [
  { id: 'todo', label: 'Todo' },
  { id: 'comercial', label: 'Comercial' },
  { id: 'clientes', label: 'Clientes' },
  { id: 'operacion', label: 'Operación' },
  { id: 'marketing', label: 'Marketing' },
];

interface Hallazgo { tipo: 'alerta' | 'oportunidad' | 'ok'; canal?: string; texto: string }
interface Analisis { empresa_id: string; resumen: string | null; hallazgos: Hallazgo[] | null; created_at: string }
interface PautaCliente { empresa_id: string; costo: number; valor: number; conversiones: number }

const mesCorto = (ym: string) =>
  new Date(ym + '-01T12:00:00').toLocaleDateString('es-CL', { month: 'short', year: '2-digit' });

const chip = (activo: boolean) =>
  `shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
    activo ? 'bg-[var(--c-surface-3)] text-[var(--c-text)]' : 'text-[var(--c-muted)] hover:text-[var(--c-text-2)]'
  }`;

interface DashboardViewProps {
  onNavigate: (v: ViewType) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { oportunidades, etapas, empresas, tareas, miembros, fuentes, motivosPerdida, filtroAlcance, setFiltroAlcance, refetchTodo } = useCRM();
  const { currentUser } = useAuth();
  const { proyectos, recargar: recargarProyectos } = useProyectos();
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [seccion, setSeccion] = useState<Seccion>('todo');
  const [analisis, setAnalisis] = useState<Analisis[]>([]);
  const [pauta, setPauta] = useState<PautaCliente[]>([]);
  const [actualizando, setActualizando] = useState(false);

  const desde = inicioPeriodo(periodo);
  const ver = (s: Seccion) => seccion === 'todo' || seccion === s;

  // Alcance "Mis datos": todo se filtra por responsable = usuario actual.
  const mios = filtroAlcance === 'mis_datos' && currentUser ? currentUser.id : null;
  const d = useMemo(() => {
    const deMi = <T extends { responsable_id?: string | null }>(xs: T[]) => (mios ? xs.filter((x) => x.responsable_id === mios) : xs);
    return {
      oportunidades: deMi(oportunidades),
      empresas: deMi(empresas),
      tareas: deMi(tareas),
      proyectos: deMi(proyectos),
    };
  }, [mios, oportunidades, empresas, tareas, proyectos]);

  const pipe = useMemo(() => metricasPipeline(d.oportunidades, etapas), [d.oportunidades, etapas]);
  const res = useMemo(() => resultadosPeriodo(d.oportunidades, etapas, desde), [d.oportunidades, etapas, desde]);
  const fc = useMemo(() => forecastMensual(pipe.abiertas), [pipe.abiertas]);
  const cart = useMemo(() => metricasCartera(d.empresas, d.oportunidades, etapas), [d.empresas, d.oportunidades, etapas]);
  const tar = useMemo(() => metricasTareas(d.tareas), [d.tareas]);
  // Avance de proyectos con todas sus tareas (no solo las mías): el avance es del proyecto.
  const proy = useMemo(() => metricasProyectos(d.proyectos, tareas), [d.proyectos, tareas]);

  // Datos de marketing: último análisis por cliente y pauta del período.
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    let vivo = true;
    Promise.all([
      supabase.from('analisis_cliente').select('empresa_id,resumen,hallazgos,created_at').order('created_at', { ascending: false }).limit(200),
      supabase.from('metricas_campanas').select('empresa_id,costo_clp,valor_conversion_clp,conversiones').eq('es_prueba', false).gte('periodo', desde).limit(5000),
    ]).then(([a, m]) => {
      if (!vivo) return;
      if (!a.error) {
        const ultimo = new Map<string, Analisis>();
        for (const x of (a.data ?? []) as Analisis[]) if (!ultimo.has(x.empresa_id)) ultimo.set(x.empresa_id, x);
        setAnalisis([...ultimo.values()]);
      }
      if (!m.error) {
        const agg = new Map<string, PautaCliente>();
        for (const f of (m.data ?? []) as { empresa_id: string; costo_clp: unknown; valor_conversion_clp: unknown; conversiones: unknown }[]) {
          const p = agg.get(f.empresa_id) ?? { empresa_id: f.empresa_id, costo: 0, valor: 0, conversiones: 0 };
          p.costo += Number(f.costo_clp) || 0;
          p.valor += Number(f.valor_conversion_clp) || 0;
          p.conversiones += Number(f.conversiones) || 0;
          agg.set(f.empresa_id, p);
        }
        setPauta([...agg.values()].sort((x, y) => y.costo - x.costo));
      }
    });
    return () => { vivo = false; };
  }, [desde]);

  const idsVisibles = useMemo(() => new Set(d.empresas.map((e) => e.id)), [d.empresas]);
  const nombreEmpresa = (id: string) => empresas.find((e) => e.id === id)?.nombre ?? 'Cliente';
  const pautaVis = mios ? pauta.filter((p) => idsVisibles.has(p.empresa_id)) : pauta;
  const analisisVis = mios ? analisis.filter((a) => idsVisibles.has(a.empresa_id)) : analisis;
  const alertas = analisisVis
    .flatMap((a) => (a.hallazgos ?? []).filter((h) => h.tipo === 'alerta').map((h) => ({ ...h, empresa_id: a.empresa_id, fecha: a.created_at })))
    .slice(0, 8);
  const inversion = pautaVis.reduce((s, p) => s + p.costo, 0);
  const valorConv = pautaVis.reduce((s, p) => s + p.valor, 0);
  const conversiones = pautaVis.reduce((s, p) => s + p.conversiones, 0);

  // Agregados por catálogo / responsable
  const porNombre = (ids: (string | null | undefined)[], catalogo: { id: string; nombre: string }[]) => {
    const m = new Map<string, number>();
    for (const id of ids) {
      const n = catalogo.find((c) => c.id === id)?.nombre ?? 'Sin dato';
      m.set(n, (m.get(n) ?? 0) + 1);
    }
    return [...m.entries()].map(([nombre, n]) => ({ nombre, n })).sort((a, b) => b.n - a.n);
  };
  const fuentesPeriodo = porNombre(res.nuevas.map((o) => o.fuente_id), fuentes);
  const motivosPeriodo = porNombre(res.perdidas.map((o) => o.motivo_perdida_id), motivosPerdida);
  const equipo = miembros
    .filter((m) => m.activo !== false)
    .map((m) => {
      const ops = pipe.abiertas.filter((o) => o.responsable_id === m.id && o.moneda === 'CLP');
      const t = metricasTareas(d.tareas.filter((x) => x.responsable_id === m.id));
      return { m, n: ops.length, ponderado: ops.reduce((s, o) => s + (Number(o.valor_ponderado) || 0), 0), ...t };
    })
    .filter((x) => x.n > 0 || x.pendientes > 0)
    .sort((a, b) => b.ponderado - a.ponderado);

  const maxForecast = Math.max(...fc.meses.map((m) => m.ponderado), fc.atrasado.ponderado, 1);
  const maxEtapa = Math.max(...pipe.porEtapa.map((e) => e.valor), 1);
  const maxEquipo = Math.max(...equipo.map((e) => e.ponderado), 1);
  const etiquetaPeriodo = PERIODOS.find((p) => p.id === periodo)!.label.toLowerCase();
  const pctPonderado = pipe.valorCLP > 0 ? (pipe.ponderadoCLP / pipe.valorCLP) * 100 : null;
  const proyectosActivos = proy.activos.length;

  const actualizar = async () => {
    setActualizando(true);
    await Promise.all([refetchTodo(), recargarProyectos()]);
    setActualizando(false);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      {/* Cabecera y filtros globales */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-[var(--c-text)]">Overview</h1>
          <p className="text-xs text-[var(--c-muted)] mt-0.5">Comercial, clientes, operación y marketing en una vista</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="surface p-1 flex gap-1" role="group" aria-label="Alcance">
            <button type="button" className={chip(filtroAlcance === 'todo_el_equipo')} onClick={() => setFiltroAlcance('todo_el_equipo')}>Todo el equipo</button>
            <button type="button" className={chip(filtroAlcance === 'mis_datos')} onClick={() => setFiltroAlcance('mis_datos')}>Mis datos</button>
          </div>
          <div className="surface p-1 flex gap-1 overflow-x-auto max-w-full" role="group" aria-label="Período">
            {PERIODOS.map((p) => (
              <button key={p.id} type="button" className={chip(periodo === p.id)} onClick={() => setPeriodo(p.id)}>{p.label}</button>
            ))}
          </div>
          <button type="button" onClick={actualizar} disabled={actualizando} title="Actualizar datos"
            className="surface p-2 text-[var(--c-muted)] hover:text-[var(--c-accent)] disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${actualizando ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <nav className="surface p-1 flex overflow-x-auto gap-1 max-w-full" aria-label="Secciones">
        {SECCIONES.map((s) => (
          <button key={s.id} type="button" aria-pressed={seccion === s.id} className={chip(seccion === s.id)} onClick={() => setSeccion(s.id)}>
            {s.label}
          </button>
        ))}
      </nav>

      {seccion === 'todo' && (
        <LoUrgenteHoy
          seguimientosAtrasados={pipe.atrasados}
          tareasHoy={tar.hoy}
          onNavigateKanban={() => onNavigate('crm')}
          onNavigateTasks={() => onNavigate('tareas')}
        />
      )}

      {(seccion === 'todo' || seccion === 'comercial') && <MetasMes />}

      {/* Indicadores globales */}
      {seccion === 'todo' && (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <Kpi etiqueta="Pipeline abierto" valor={formatCLP(pipe.valorCLP)}
            nota={pctPonderado !== null ? `${formatCLP(pipe.ponderadoCLP)} ponderado` : `${pipe.abiertas.length} negocios`}
            onClick={() => onNavigate('crm')} />
          <Kpi etiqueta={`Ganado · ${etiquetaPeriodo}`} valor={formatCLP(res.valorGanadoCLP)}
            nota={`${res.ganadas.length} negocios · cierre ${res.tasaCierre !== null ? `${res.tasaCierre.toFixed(0)}%` : '—'}`} />
          <Kpi etiqueta="MRR" valor={formatCLP(cart.mrr)} nota={`${cart.clientes.length} clientes activos`} onClick={() => onNavigate('empresas')} />
          <Kpi etiqueta="Renovaciones ≤ 60 d" valor={cart.renovaciones.length} tono={cart.renovacionesVencidas > 0 ? 'peligro' : 'normal'}
            nota={cart.renovacionesVencidas > 0 ? `${cart.renovacionesVencidas} vencidas` : cart.renovaciones[0] ? `Próxima en ${cart.renovaciones[0].dias} días` : 'Ninguna próxima'} />
          <Kpi etiqueta="Proyectos activos" valor={proyectosActivos} tono={proy.conAtraso > 0 ? 'aviso' : 'normal'}
            nota={proy.conAtraso > 0 ? `${proy.conAtraso} con atraso` : 'Todos al día'} onClick={() => onNavigate('proyectos')} />
          <Kpi etiqueta="Tareas vencidas" valor={tar.vencidas} tono={tar.vencidas > 0 ? 'peligro' : 'normal'}
            nota={`${tar.hoy} para hoy · ${tar.pendientes} pendientes`} onClick={() => onNavigate('tareas')} />
        </div>
      )}

      {/* COMERCIAL */}
      {ver('comercial') && (
        <>
          {seccion === 'comercial' && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Kpi etiqueta="Pipeline abierto" valor={formatCLP(pipe.valorCLP)}
                nota={`${pipe.abiertas.length} negocios${pipe.valorUSD > 0 ? ` · US$ ${pipe.valorUSD.toLocaleString('es-CL')} aparte` : ''}`} />
              <Kpi etiqueta="Forecast ponderado" valor={formatCLP(pipe.ponderadoCLP)} nota={pctPonderado !== null ? `${pctPonderado.toFixed(0)}% del abierto` : '—'} />
              <Kpi etiqueta={`Tasa de cierre · ${etiquetaPeriodo}`} valor={res.tasaCierre !== null ? `${res.tasaCierre.toFixed(0)}%` : '—'}
                progreso={res.tasaCierre} nota={`${res.ganadas.length} ganadas · ${res.perdidas.length} perdidas`} />
              <Kpi etiqueta={`Negocios nuevos · ${etiquetaPeriodo}`} valor={res.nuevas.length}
                nota={res.cicloDias !== null ? `Ciclo de venta ${res.cicloDias} días` : 'Sin cierres para medir ciclo'} />
            </div>
          )}
          <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-2 gap-4">
            <Bloque titulo="Pipeline por etapa" sub="Negocios abiertos en CLP, con los colores de cada etapa">
              {pipe.abiertas.length === 0 ? <Vacio texto="Sin negocios abiertos." /> : (
                <div className="space-y-3">
                  {pipe.porEtapa.map((e) => (
                    <FilaBarra key={e.id} etiqueta={`${e.nombre} · ${e.n}`} valor={formatCLP(e.valor)} pct={(e.valor / maxEtapa) * 100} color={e.color} />
                  ))}
                </div>
              )}
            </Bloque>
            <Bloque titulo="Forecast por mes de cierre" sub="Valor ponderado, próximos 6 meses (CLP)">
              {pipe.abiertas.length === 0 ? <Vacio texto="Sin negocios abiertos." /> : (
                <div className="space-y-3">
                  {fc.atrasado.n > 0 && (
                    <FilaBarra etiqueta={`Fecha vencida · ${fc.atrasado.n}`} valor={formatCLP(fc.atrasado.ponderado)} pct={(fc.atrasado.ponderado / maxForecast) * 100} color="var(--c-danger)" />
                  )}
                  {fc.meses.map((m) => (
                    <FilaBarra key={m.mes} etiqueta={<span className="capitalize">{mesCorto(m.mes)} · {m.n}</span>} valor={formatCLP(m.ponderado)} pct={(m.ponderado / maxForecast) * 100} />
                  ))}
                  {fc.sinFecha > 0 && <p className="text-[10px] text-[var(--c-muted)]">{fc.sinFecha} negocios sin fecha de cierre estimada</p>}
                </div>
              )}
            </Bloque>
            <Bloque titulo={`Fuentes · ${etiquetaPeriodo}`} sub="De dónde vienen los negocios nuevos">
              {fuentesPeriodo.length === 0 ? <Vacio texto="Sin negocios nuevos en el período." /> : (
                <div className="space-y-3">
                  {fuentesPeriodo.map((f) => (
                    <FilaBarra key={f.nombre} etiqueta={f.nombre} valor={`${f.n} · ${Math.round((f.n / res.nuevas.length) * 100)}%`} pct={(f.n / fuentesPeriodo[0].n) * 100} color="var(--c-muted-2)" />
                  ))}
                </div>
              )}
            </Bloque>
            <Bloque titulo={`Motivos de pérdida · ${etiquetaPeriodo}`} sub="Por qué se cayeron los negocios">
              {motivosPeriodo.length === 0 ? <Vacio texto="Sin negocios perdidos en el período." /> : (
                <div className="space-y-3">
                  {motivosPeriodo.map((m) => (
                    <FilaBarra key={m.nombre} etiqueta={m.nombre} valor={m.n} pct={(m.n / motivosPeriodo[0].n) * 100} color="var(--c-danger)" />
                  ))}
                </div>
              )}
            </Bloque>
          </div>
        </>
      )}

      {/* CLIENTES */}
      {ver('clientes') && (
        <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-3 gap-4">
          <Bloque titulo="Salud de clientes" sub={cart.incompletos > 0 ? `${cart.incompletos} con ficha incompleta` : 'Fichas completas'}>
            {cart.clientes.length === 0 ? <Vacio texto="Sin clientes activos." /> : (
              <Dona rotulo={`Salud de ${cart.clientes.length} clientes`}
                centro={<><span className="text-lg font-bold font-mono text-[var(--c-text)] leading-none">{cart.clientes.length}</span><span className="text-[9px] font-mono uppercase text-[var(--c-muted)] mt-0.5">clientes</span></>}
                segmentos={[
                  { clave: 'verde', etiqueta: 'Verde', n: cart.salud.verde, color: COLOR_SALUD.verde },
                  { clave: 'amarillo', etiqueta: 'Amarillo', n: cart.salud.amarillo, color: COLOR_SALUD.amarillo },
                  { clave: 'rojo', etiqueta: 'Rojo', n: cart.salud.rojo, color: COLOR_SALUD.rojo },
                  { clave: 'sin', etiqueta: 'Sin evaluar', n: cart.salud.sin, color: COLOR_SALUD.sin },
                ]} />
            )}
          </Bloque>
          <Bloque titulo="Renovaciones próximas" sub="Vencidas y próximos 60 días">
            {cart.renovaciones.length === 0 ? <Vacio texto="Ninguna renovación en 60 días." /> : (
              <ul className="divide-y divide-[var(--c-line)] text-xs">
                {cart.renovaciones.slice(0, 6).map((r) => (
                  <li key={r.empresa.id} className="py-2 flex items-center justify-between gap-3">
                    <span className="truncate text-[var(--c-text)]">{r.empresa.nombre}</span>
                    <span className={`font-mono whitespace-nowrap ${r.dias < 0 ? 'text-[var(--c-danger)]' : r.dias <= 15 ? 'text-[var(--c-warn)]' : 'text-[var(--c-muted)]'}`}>
                      {r.dias < 0 ? `vencida ${-r.dias} d` : `${r.dias} d`} · {formatCLP(cart.mrrDe(r.empresa))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Bloque>
          <Bloque titulo="MRR por cliente" sub={`${formatCLP(cart.mrr)} en total`}>
            {cart.clientes.length === 0 ? <Vacio texto="Sin clientes activos." /> : (
              <div className="space-y-3">
                {[...cart.clientes].sort((a, b) => cart.mrrDe(b) - cart.mrrDe(a)).slice(0, 6).map((e) => (
                  <FilaBarra key={e.id} etiqueta={e.nombre} valor={formatCLP(cart.mrrDe(e))} pct={cart.mrr > 0 ? (cart.mrrDe(e) / cart.mrr) * 100 : 0}
                    color={e.salud ? COLOR_SALUD[e.salud] : COLOR_SALUD.sin} />
                ))}
              </div>
            )}
          </Bloque>
        </div>
      )}

      {/* OPERACIÓN */}
      {ver('operacion') && (
        <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-2 gap-4">
          <Bloque titulo="Proyectos activos" sub="Avance según tareas; primero los atrasados"
            accion={<button type="button" onClick={() => onNavigate('proyectos')} className="text-[11px] font-mono uppercase text-[var(--c-muted)] hover:text-[var(--c-accent)]">Ver todos</button>}>
            {proyectosActivos === 0 ? <Vacio texto="Sin proyectos activos." /> : (
              <div className="space-y-3">
                {proy.activos.slice(0, 6).map((f) => (
                  <FilaBarra key={f.proyecto.id}
                    etiqueta={<>{f.proyecto.nombre}<span className="text-[var(--c-muted)]"> · {f.proyecto.empresa_id ? nombreEmpresa(f.proyecto.empresa_id) : 'Interno'}</span></>}
                    valor={`${Math.round(f.avance)}%`} pct={f.avance}
                    color={f.atrasadas > 0 || f.vencido ? 'var(--c-warn)' : 'var(--c-accent)'}
                    sub={`${f.hechas}/${f.total} tareas${f.atrasadas > 0 ? ` · ${f.atrasadas} atrasadas` : ''}${f.vencido ? ' · fecha de entrega vencida' : ''}`} />
                ))}
              </div>
            )}
          </Bloque>
          <Bloque titulo="Equipo" sub="Pipeline ponderado y tareas por responsable">
            {equipo.length === 0 ? <Vacio texto="Sin negocios ni tareas asignadas." /> : (
              <div className="space-y-3">
                {equipo.map((e) => (
                  <FilaBarra key={e.m.id} etiqueta={`${e.m.nombre} · ${e.n} negocios`} valor={formatCLP(e.ponderado)} pct={(e.ponderado / maxEquipo) * 100}
                    sub={<>{e.pendientes} tareas pend.{e.vencidas > 0 && <span className="text-[var(--c-danger)]"> · {e.vencidas} vencidas</span>}{e.hoy > 0 && ` · ${e.hoy} hoy`}</>} />
                ))}
              </div>
            )}
          </Bloque>
        </div>
      )}

      {/* MARKETING */}
      {ver('marketing') && (
        <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-2 gap-4">
          <Bloque titulo={`Pauta · ${etiquetaPeriodo}`}
            sub={inversion > 0 ? `${formatCLP(inversion)} invertidos · ${conversiones.toLocaleString('es-CL')} conv. · ROAS ${(valorConv / inversion).toFixed(1)}x` : 'Inversión, conversiones y ROAS por cliente'}
            accion={<button type="button" onClick={() => onNavigate('marketing')} className="text-[11px] font-mono uppercase text-[var(--c-muted)] hover:text-[var(--c-accent)]">Marketing</button>}>
            {pautaVis.length === 0 ? <Vacio texto="Sin datos de campañas en el período." /> : (
              <>
                <BarraApilada rotulo="Inversión por cliente" peso={(s) => s.n}
                  segmentos={pautaVis.slice(0, 6).map((p, i) => ({
                    clave: p.empresa_id, etiqueta: nombreEmpresa(p.empresa_id), n: Math.round(p.costo),
                    color: ['var(--c-accent)', 'var(--c-info)', 'var(--c-ok)', 'var(--c-warn)', 'var(--c-muted)', 'var(--c-muted-2)'][i],
                    detalle: `${formatCLP(p.costo)} · ${p.costo > 0 ? (p.valor / p.costo).toFixed(1) : '—'}x`,
                  }))} />
              </>
            )}
          </Bloque>
          <Bloque titulo="Alertas del último análisis" sub="Hallazgos marcados como alerta, por cliente">
            {alertas.length === 0 ? <Vacio texto={analisisVis.length === 0 ? 'Aún no hay análisis de marketing.' : 'Sin alertas en los últimos análisis.'} /> : (
              <ul className="divide-y divide-[var(--c-line)] text-xs">
                {alertas.map((h, i) => (
                  <li key={i} className="py-2 space-y-0.5">
                    <p className="text-[var(--c-text)]"><span className="font-medium">{nombreEmpresa(h.empresa_id)}</span>{h.canal && <span className="text-[var(--c-muted)]"> · {h.canal}</span>}</p>
                    <p className="text-[var(--c-text-2)]">{h.texto}</p>
                  </li>
                ))}
              </ul>
            )}
          </Bloque>
        </div>
      )}
    </div>
  );
};
