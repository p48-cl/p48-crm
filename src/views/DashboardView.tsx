import React, { useState } from 'react';
import {
  TrendingUp,
  Kanban,
  AlertCircle,
  CheckSquare,
  BarChart3,
  PieChart,
  Filter,
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { formatCLP } from '../lib/formatters';
import { AgencyDashboard, SeccionDashboard } from '../components/dashboard/AgencyDashboard';
import { MetasMes } from '../components/dashboard/MetasMes';
import { LoUrgenteHoy } from '../components/dashboard/LoUrgenteHoy';

const PESTANAS: { id: SeccionDashboard; label: string }[] = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'ventas', label: 'Ventas' },
  { id: 'clientes', label: 'Clientes' },
  { id: 'equipo', label: 'Equipo' },
];

interface DashboardViewProps {
  onNavigateKanban: () => void;
  onNavigateTasks: () => void;
  onSelectOportunidad: (id: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateKanban,
  onNavigateTasks,
}) => {
  const [pestana, setPestana] = useState<SeccionDashboard>('resumen');
  const {
    kpis,
    filtroAlcance,
    setFiltroAlcance,
    graficoPipeline,
    graficoFuentes,
    graficoMotivos,
  } = useCRM();

  // Filtrar gráfico de pipeline: SOLO etapas abiertas (excluye es_ganada y es_perdida)
  const etapasAbiertas = graficoPipeline.filter((g) => !g.es_ganada && !g.es_perdida);
  const etapasCerradas = graficoPipeline.filter((g) => g.es_ganada || g.es_perdida);

  const maxPonderado = Math.max(
    ...etapasAbiertas.map((d) => Number(d.valor_ponderado) || 0),
    10000000
  );

  // Escala de grises pura para dona de fuentes (sin azul, naranja ni morado)
  const escalaGrisesFuentes = ['#3B82F6', '#60A5FA', '#93C5FD', '#1D4ED8', '#BFDBFE', '#64748B'];
  const totalFuentes = graficoFuentes.reduce((sum, f) => sum + (Number(f.cantidad) || 0), 0) || 1;

  // Max motivos de pérdida para barras horizontales
  const maxMotivos = Math.max(...graficoMotivos.map((m) => Number(m.cantidad) || 0), 1);

  // Alerta única en Magenta (#E8005A): Seguimientos atrasados
  const haySeguimientosAtrasados = kpis.seguimientos_atrasados_count > 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Cabecera & Selector de Alcance */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight font-sans text-[var(--c-text)]">
            Panel de Rendimiento Comercial
          </h1>
          <p className="text-xs text-[var(--c-muted)] mt-0.5">
            P48 · Agencia B2B de Performance Marketing en Chile
          </p>
        </div>

        {/* Filtro Mis datos / Todo el equipo */}
        <div className="flex items-center gap-1 p-1 bg-[var(--c-surface)] border border-[var(--c-line)] rounded-lg text-xs">
          <Filter className="w-3.5 h-3.5 text-[var(--c-muted)] ml-2 mr-1" />
          <button
            onClick={() => setFiltroAlcance('todo_el_equipo')}
            className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
              filtroAlcance === 'todo_el_equipo'
                ? 'bg-[var(--c-surface-3)] text-[var(--c-text)] font-medium shadow-sm'
                : 'text-[var(--c-muted)] hover:text-[var(--c-text-2)]'
            }`}
          >
            Todo el equipo
          </button>
          <button
            onClick={() => setFiltroAlcance('mis_datos')}
            className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
              filtroAlcance === 'mis_datos'
                ? 'bg-[var(--c-surface-3)] text-[var(--c-text)] font-medium shadow-sm'
                : 'text-[var(--c-muted)] hover:text-[var(--c-text-2)]'
            }`}
          >
            Mis datos
          </button>
        </div>
      </div>

      {/* Pestañas de la vista */}
      <nav className="surface p-1 flex overflow-x-auto gap-1 max-w-full" aria-label="Secciones del panel">
        {PESTANAS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setPestana(t.id)}
            aria-pressed={pestana === t.id}
            className={`shrink-0 whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-colors min-h-[44px] ${
              pestana === t.id ? 'bg-[var(--c-surface-3)] text-[var(--c-text)]' : 'text-[var(--c-muted)] hover:text-[var(--c-text-2)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Grid de 5 KPIs Clave (Cifras en Blanco Aire #F5F5F5) */}
      {pestana === 'resumen' && <MetasMes />}

      {pestana === 'resumen' && (
        <LoUrgenteHoy
          seguimientosAtrasados={kpis.seguimientos_atrasados_count}
          tareasHoy={kpis.tareas_hoy_count}
          onNavigateKanban={onNavigateKanban}
          onNavigateTasks={onNavigateTasks}
        />
      )}

      <div className={`grid grid-cols-[minmax(0,1fr)] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 ${pestana === 'resumen' ? '' : 'hidden'}`}>
        {/* KPI 1: Pipeline Ponderado */}
        <div className="surface p-4 space-y-1">
          <p className="text-[11px] font-mono text-[var(--c-muted)] uppercase tracking-wider">
            Pipeline Ponderado
          </p>
          <p className="text-lg font-bold font-mono text-[var(--c-text)] tracking-tight">
            {formatCLP(kpis.pipeline_ponderado_total)}
          </p>
          <p className="text-[10px] text-[var(--c-muted)] font-mono">Pesos Chilenos (CLP)</p>
        </div>

        {/* KPI 2: Oportunidades Abiertas */}
        <div
          onClick={onNavigateKanban}
          className="p-4 bg-[var(--c-surface)] rounded-lg border border-[var(--c-line)] space-y-1 cursor-pointer hover:border-[var(--c-line)] transition-colors"
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-mono text-[var(--c-muted)] uppercase tracking-wider">
              Oportunidades Abiertas
            </p>
            <Kanban className="w-3.5 h-3.5 text-[var(--c-muted)]" />
          </div>
          <p className="text-lg font-bold font-mono text-[var(--c-text)]">
            {kpis.oportunidades_abiertas_count}
          </p>
          <p className="text-[10px] text-[var(--c-muted)] font-mono">Ver tablero kanban →</p>
        </div>

        {/* KPI 3: Seguimientos Atrasados (ÚNICO foco de Magenta #E8005A de la pantalla si hay alerta) */}
        <div
          onClick={onNavigateKanban}
          className={`p-4 rounded-lg border space-y-1 cursor-pointer transition-colors ${
            haySeguimientosAtrasados
              ? 'bg-[var(--c-surface-2)] border-[var(--c-danger)] text-[var(--c-danger)]'
              : 'bg-[var(--c-surface)] border-[var(--c-line)]'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-mono uppercase tracking-wider">
              Seguimientos Atrasados
            </p>
            <AlertCircle
              className={`w-3.5 h-3.5 ${
                haySeguimientosAtrasados ? 'text-[var(--c-danger)]' : 'text-[var(--c-muted)]'
              }`}
            />
          </div>
          <p
            className={`text-lg font-bold font-mono ${
              haySeguimientosAtrasados ? 'text-[var(--c-danger)]' : 'text-[var(--c-text)]'
            }`}
          >
            {kpis.seguimientos_atrasados_count}
          </p>
          <p className="text-[10px] font-mono">
            {haySeguimientosAtrasados ? '¡Requiere atención!' : 'Todo al día'}
          </p>
        </div>

        {/* KPI 4: Tareas de Hoy */}
        <div
          onClick={onNavigateTasks}
          className="p-4 bg-[var(--c-surface)] rounded-lg border border-[var(--c-line)] space-y-1 cursor-pointer hover:border-[var(--c-line)] transition-colors"
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-mono text-[var(--c-muted)] uppercase tracking-wider">
              Tareas de Hoy
            </p>
            <CheckSquare className="w-3.5 h-3.5 text-[var(--c-muted)]" />
          </div>
          <p className="text-lg font-bold font-mono text-[var(--c-text)]">
            {kpis.tareas_hoy_count}
          </p>
          <p className="text-[10px] text-[var(--c-muted)] font-mono">Revisar lista diaria →</p>
        </div>

        {/* KPI 5: MRR Clientes Activos */}
        <div className="surface p-4 space-y-1">
          <p className="text-[11px] font-mono text-[var(--c-muted)] uppercase tracking-wider">
            MRR Clientes Activos
          </p>
          <p className="text-lg font-bold font-mono text-[var(--c-text)] tracking-tight">
            {formatCLP(kpis.mrr_clientes_activos)}
          </p>
          <p className="text-[10px] text-[var(--c-muted)] font-mono">Ingreso Mensual Recurrente</p>
        </div>
      </div>

      {/* Grid de Gráficos Nativos en Escala de Grises */}
      <div className={`grid grid-cols-[minmax(0,1fr)] lg:grid-cols-3 gap-6 ${pestana === 'ventas' ? '' : 'hidden'}`}>
        {/* GRÁFICO 1: Pipeline por Etapa (Solo etapas abiertas) */}
        <div className="surface p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-[var(--c-text)]">
                Pipeline Ponderado (Etapas Abiertas)
              </h3>
              <p className="text-[11px] text-[var(--c-muted)]">Excluye ganadas y perdidas</p>
            </div>
            <BarChart3 className="w-4 h-4 text-[var(--c-muted)]" />
          </div>

          <div className="h-44 flex items-end justify-between gap-3 pt-6 pb-2 px-1 border-b border-[var(--c-line)]">
            {etapasAbiertas.length === 0 ? (
              <p className="text-xs text-[var(--c-muted-2)] w-full text-center py-10">Sin etapas abiertas con datos.</p>
            ) : (
              etapasAbiertas.map((d) => {
                const alturaPct = Math.max(
                  Math.round(((Number(d.valor_ponderado) || 0) / maxPonderado) * 100),
                  10
                );
                return (
                  <div key={d.etapa_id} className="flex-1 min-w-0 h-full flex flex-col items-center gap-1.5 group">
                    <span className="font-mono text-[9px] text-[var(--c-text-2)] opacity-0 group-hover:opacity-100 transition-opacity">
                      ${Math.round((Number(d.valor_ponderado) || 0) / 1000000)}M
                    </span>
                    <div className="w-full flex-1 min-h-0 flex items-end justify-center">
                      <div
                        style={{ height: `${alturaPct}%` }}
                        className="w-full max-w-[36px] bg-[var(--c-line)] border border-[var(--c-line)] group-hover:bg-[var(--c-line)] rounded-t transition-all"
                      />
                    </div>
                    <span className="font-mono text-[9px] sm:text-[10px] text-[var(--c-muted)] leading-tight break-words w-full text-center">
                      {d.nombre.split(' ')[0]}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Resumen separado de Ganadas y Perdidas */}
          <div className="pt-2 border-t border-[var(--c-line)] space-y-1 text-[11px] font-mono text-[var(--c-muted)]">
            <p className="text-[10px] text-[var(--c-muted-2)] uppercase">Cierres Históricos:</p>
            <div className="flex justify-between">
              {etapasCerradas.map((c) => (
                <span key={c.etapa_id} className="text-[var(--c-text-2)]">
                  {c.nombre}: <strong className="text-[var(--c-text)]">{c.cantidad}</strong> negocios ({formatCLP(c.valor_ponderado)})
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* GRÁFICO 2: Oportunidades por Fuente (Dona en escala de grises y etiquetas) */}
        <div className="surface p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-[var(--c-text)]">
                Oportunidades por Canal / Fuente
              </h3>
              <p className="text-[11px] text-[var(--c-muted)]">Distinguidas con tonos monocromos</p>
            </div>
            <PieChart className="w-4 h-4 text-[var(--c-muted)]" />
          </div>

          <div className="flex items-center justify-center py-1">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="38" className="stroke-[var(--c-surface-3)]" strokeWidth="16" fill="none" />
                {(() => {
                  let accumulatedOffset = 0;
                  const circumference = 2 * Math.PI * 38;

                  return graficoFuentes.map((f, i) => {
                    const cant = Number(f.cantidad) || 0;
                    const pct = cant / totalFuentes;
                    const strokeDasharray = `${pct * circumference} ${circumference}`;
                    const strokeDashoffset = -accumulatedOffset;
                    accumulatedOffset += pct * circumference;
                    const colorGris = escalaGrisesFuentes[i % escalaGrisesFuentes.length];

                    return (
                      <circle
                        key={f.nombre}
                        cx="50"
                        cy="50"
                        r="38"
                        stroke={colorGris}
                        strokeWidth="16"
                        fill="none"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                      />
                    );
                  });
                })()}
              </svg>
              <div className="absolute text-center">
                <span className="font-mono text-base font-bold text-[var(--c-text)]">
                  {totalFuentes}
                </span>
                <p className="text-[9px] text-[var(--c-muted)] font-mono uppercase">Fuentes</p>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 pt-1 text-xs">
            {graficoFuentes.map((f, i) => (
              <div key={f.nombre} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 truncate">
                  <div
                    className="w-2.5 h-2.5 rounded-sm"
                    style={{ backgroundColor: escalaGrisesFuentes[i % escalaGrisesFuentes.length] }}
                  />
                  <span className="text-[var(--c-text-2)] truncate">{f.nombre}</span>
                </div>
                <span className="font-mono text-[var(--c-text-2)]">
                  {f.cantidad} ({Math.round(((Number(f.cantidad) || 0) / totalFuentes) * 100)}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* GRÁFICO 3: Motivos de Pérdida (Barras en escala de gris) */}
        <div className="surface p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-[var(--c-text)]">
                Motivos de Pérdida
              </h3>
              <p className="text-[11px] text-[var(--c-muted)]">Frecuencia de descartes comerciales</p>
            </div>
            <TrendingUp className="w-4 h-4 text-[var(--c-muted)]" />
          </div>

          <div className="space-y-3 pt-2">
            {graficoMotivos.length === 0 ? (
              <p className="text-xs text-[var(--c-muted-2)] text-center py-8">Sin descartes registrados.</p>
            ) : (
              graficoMotivos.map((m) => {
                const cant = Number(m.cantidad) || 0;
                const pct = Math.round((cant / maxMotivos) * 100);
                return (
                  <div key={m.nombre} className="space-y-1 text-xs">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[var(--c-text-2)] truncate max-w-[200px]">{m.nombre}</span>
                      <span className="font-mono text-[var(--c-muted)]">{cant} negocios</span>
                    </div>
                    <div className="w-full bg-[var(--c-surface-2)] h-2 rounded overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className="bg-[var(--c-muted-2)] h-full rounded transition-all"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <AgencyDashboard seccion={pestana} />
    </div>
  );
};
