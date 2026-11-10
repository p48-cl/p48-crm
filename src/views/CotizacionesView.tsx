import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Filter, Plus, Search } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { parseSupabaseError } from '../lib/errorHandler';
import { formatFecha, formatMoneda, formatCorrelativo } from '../lib/formatters';
import { estadoEfectivo, redondear, MonedaCotizacion } from '../lib/cotizaciones';
import { useCRM } from '../context/CRMContext';
import { SelectorCliente } from '../components/common/SelectorCliente';
import { Kpi } from '../components/dashboard/ui';
import { ThOrdenable } from '../components/common/ThOrdenable';
import { useOrden } from '../lib/orden';

interface Fila {
  id: string;
  numero: number;
  empresa_id: string;
  titulo: string;
  estado: string;
  fecha_emision: string;
  vence_el: string;
  moneda: MonedaCotizacion;
  iva_pct: number;
  neto_mensual: number;
  neto_unico: number;
}

const ESTADOS = ['borrador', 'enviada', 'aceptada', 'rechazada', 'vencida'] as const;

const ESTILO_ESTADO: Record<string, { label: string; color: string }> = {
  borrador: { label: 'Borrador', color: 'text-[var(--c-muted)]' },
  enviada: { label: 'Enviada', color: 'text-[var(--c-info)]' },
  aceptada: { label: 'Aceptada', color: 'text-[var(--c-ok)] font-medium' },
  rechazada: { label: 'Rechazada', color: 'text-[var(--c-danger)]' },
  vencida: { label: 'Vencida', color: 'text-[var(--c-warn)]' },
};

type ClaveOrden = 'numero' | 'titulo' | 'cliente' | 'estado' | 'emitida' | 'vence' | 'mensual' | 'unico';

const selectClase =
  'bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-2 py-1.5 text-xs text-[var(--c-text)] focus:outline-none focus:border-[var(--c-accent)]';

interface CotizacionesViewProps {
  onAbrirFicha: (empresaId: string, nueva?: boolean) => void;
  // Sube cada vez que se cierra la ficha de un cliente: fuerza a recargar la lista y las tarjetas
  version?: number;
}

export const CotizacionesView: React.FC<CotizacionesViewProps> = ({ onAbrirFicha, version = 0 }) => {
  const { empresas, agencia, crearEmpresa } = useCRM();
  const [filasTodas, setFilas] = useState<Fila[]>([]);
  // Las cotizaciones de la cuenta interna de la agencia se ven solo en Agencia.
  const filas = useMemo(() => filasTodas.filter((f) => f.empresa_id !== agencia?.id), [filasTodas, agencia]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState<string>('todos');
  const [mostrarNueva, setMostrarNueva] = useState(false);
  const { clave: sortKey, dir: sortDir, alternar: alternarOrden, ordenar } = useOrden<ClaveOrden>('numero', 'desc');

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setCargando(false);
      return;
    }
    supabase
      .from('v_cotizaciones')
      .select('*')
      .order('numero', { ascending: false })
      .then(({ data, error: err }) => {
        if (err) setError(parseSupabaseError(err));
        else {
          setError(null);
          setFilas(
            ((data ?? []) as Fila[]).map((f) => ({
              ...f,
              neto_mensual: Number(f.neto_mensual),
              neto_unico: Number(f.neto_unico),
              iva_pct: Number(f.iva_pct),
            }))
          );
        }
        setCargando(false);
      });
  }, [version]);

  const nombres = useMemo(() => new Map(empresas.map((e) => [e.id, e.nombre])), [empresas]);
  const clientesActivos = useMemo(
    () => empresas.filter((e) => !e.archivado).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [empresas]
  );

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return filas.filter((f) => {
      if (estado !== 'todos' && estadoEfectivo(f) !== estado) return false;
      if (!q) return true;
      return (
        formatCorrelativo('COT', f.numero).toLowerCase().includes(q) || String(f.numero).includes(q) ||
        f.titulo.toLowerCase().includes(q) ||
        (nombres.get(f.empresa_id) ?? '').toLowerCase().includes(q)
      );
    });
  }, [filas, busqueda, estado, nombres]);

  // Orden de la tabla: clic en el encabezado (primer clic de mayor a menor, segundo de menor a mayor)
  const visibles = useMemo(
    () =>
      ordenar(filtradas, (c, clave) => {
        switch (clave) {
          case 'numero': return c.numero;
          case 'titulo': return c.titulo;
          case 'cliente': return nombres.get(c.empresa_id) ?? '';
          case 'estado': return ESTADOS.indexOf(estadoEfectivo(c) as (typeof ESTADOS)[number]);
          case 'emitida': return c.fecha_emision;
          case 'vence': return c.vence_el;
          case 'mensual': return c.neto_mensual * (1 + c.iva_pct / 100);
          case 'unico': return c.neto_unico * (1 + c.iva_pct / 100);
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtradas, sortKey, sortDir, nombres]
  );

  const pendientes = filas.filter((f) => {
    const e = estadoEfectivo(f);
    return e === 'borrador' || e === 'enviada';
  }).length;

  // Tarjetas resumen: sólo CLP (UF no se suma; la factura se emite en CLP).
  const kpis = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const clp = filas.filter((f) => f.moneda === 'CLP');
    const conIva = (f: Fila, campo: 'neto_mensual' | 'neto_unico') => redondear(f[campo] * (1 + f.iva_pct / 100), 'CLP');
    const aceptadas = clp.filter((f) => estadoEfectivo(f) === 'aceptada');
    const enviadas = clp.filter((f) => estadoEfectivo(f) === 'enviada');
    const rechazadas = clp.filter((f) => estadoEfectivo(f) === 'rechazada');
    const cerradas = aceptadas.length + rechazadas.length;
    // Un cliente = una aceptada vigente: si tiene varias aceptadas, cuenta solo la más reciente (evita doble MRR)
    const vigentePorEmpresa = new Map<string, Fila>();
    for (const f of aceptadas) {
      const previa = vigentePorEmpresa.get(f.empresa_id);
      if (!previa || f.numero > previa.numero) vigentePorEmpresa.set(f.empresa_id, f);
    }
    const vigentes = [...vigentePorEmpresa.values()];
    const mensualAceptado = vigentes.reduce((a, f) => a + conIva(f, 'neto_mensual'), 0);
    const unicoAceptado = vigentes.reduce((a, f) => a + conIva(f, 'neto_unico'), 0);
    const enEspera = enviadas.reduce((a, f) => a + conIva(f, 'neto_mensual') + conIva(f, 'neto_unico'), 0);
    const venceEn7 = enviadas.filter((f) => {
      const dias = Math.round((new Date(`${f.vence_el.slice(0, 10)}T00:00:00`).getTime() - hoy.getTime()) / 86400000);
      return dias >= 0 && dias <= 7;
    }).length;
    return {
      clientesAceptados: vigentes.length,
      mensualAceptado,
      unicoAceptado,
      enviadas: enviadas.length,
      enEspera,
      tasa: cerradas > 0 ? Math.round((aceptadas.length / cerradas) * 100) : null,
      aceptadas: aceptadas.length,
      cerradas,
      venceEn7,
      otraMoneda: filas.length - clp.length,
    };
  }, [filas]);

  const cabecera = (clave: ClaveOrden, etiqueta: string, alinear: 'left' | 'right' = 'left') => (
    <ThOrdenable
      key={clave}
      etiqueta={etiqueta}
      activa={sortKey === clave}
      dir={sortDir}
      onClick={() => alternarOrden(clave)}
      alinear={alinear}
      className={`py-2.5 px-3 font-medium ${clave === 'numero' ? 'px-4' : ''}`}
    />
  );

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      {/* Título y acción principal (mismo patrón que Clientes) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-sans text-[var(--c-text)]">Cotizaciones</h1>
          <p className="text-xs text-[var(--c-muted)] mt-0.5">
            {filas.length} cotizaciones · {pendientes} en borrador o enviadas · totales con IVA
          </p>
        </div>
        <button
          onClick={() => setMostrarNueva(true)}
          className="bg-[var(--c-accent)] hover:bg-[var(--c-accent-hover)] active:scale-[0.98] text-[var(--c-on-accent)] font-semibold text-xs py-2 px-3.5 rounded flex items-center gap-1.5 transition-all shadow-sm font-sans"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Nueva cotización</span>
        </button>
      </div>

      {/* Resumen (mismo lenguaje visual que Clientes y Pipeline) */}
      {!cargando && filas.length > 0 && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi
              etiqueta="Aceptado mensual"
              valor={formatMoneda(kpis.mensualAceptado, 'CLP')}
              nota={`${kpis.clientesAceptados} clientes · único ${formatMoneda(kpis.unicoAceptado, 'CLP')}`}
            />
            <Kpi
              etiqueta="En espera"
              valor={kpis.enviadas}
              nota={`${formatMoneda(kpis.enEspera, 'CLP')} potencial c/IVA`}
            />
            <Kpi
              etiqueta="Tasa de aceptación"
              valor={kpis.tasa != null ? `${kpis.tasa}%` : '—'}
              progreso={kpis.tasa}
              nota={`${kpis.aceptadas} de ${kpis.cerradas} cerradas`}
            />
            <Kpi
              etiqueta="Vencen en 7 días"
              valor={kpis.venceEn7}
              tono={kpis.venceEn7 > 0 ? 'aviso' : 'normal'}
              nota="Enviadas sin respuesta"
            />
          </div>
          {kpis.otraMoneda > 0 && (
            <p className="text-[10px] text-[var(--c-muted)]">
              {kpis.otraMoneda} cotización(es) en UF no se suman en estas tarjetas.
            </p>
          )}
        </div>
      )}

      {/* Barra de búsqueda y filtros */}
      <div className="flex flex-wrap items-center gap-3 bg-[var(--c-surface)] p-3 rounded-lg border border-[var(--c-line)]">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-[var(--c-muted)] absolute left-3 top-2.5" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por N°, título o cliente..."
            className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded pl-8 pr-3 py-1.5 text-xs text-[var(--c-text)] placeholder:text-[var(--c-muted-2)] focus:outline-none focus:border-[var(--c-accent)]"
          />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[var(--c-muted)]">
          <Filter className="w-3.5 h-3.5" />
          <select className={selectClase} value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Filtrar por estado">
            <option value="todos">Todos los estados</option>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {ESTILO_ESTADO[e].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla densa (mismo estilo que Clientes) */}
      <div className="bg-[var(--c-surface)] border border-[var(--c-line)] rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--c-surface-2)] border-b border-[var(--c-line)] text-[var(--c-muted)] uppercase font-mono text-[11px]">
              <tr>
                {cabecera('numero', 'N°')}
                {cabecera('titulo', 'Cotización')}
                {cabecera('cliente', 'Cliente')}
                {cabecera('estado', 'Estado')}
                {cabecera('emitida', 'Emitida')}
                {cabecera('vence', 'Vence')}
                {cabecera('mensual', 'Mensual c/IVA', 'right')}
                {cabecera('unico', 'Único c/IVA', 'right')}
                <th className="py-2.5 px-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--c-line)]">
              {cargando ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[var(--c-muted)]">Cargando…</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[var(--c-danger)]">{error}</td>
                </tr>
              ) : visibles.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[var(--c-muted)]">
                    {filas.length === 0
                      ? 'Aún no hay cotizaciones. Pulsa «Nueva cotización» para empezar.'
                      : 'No hay cotizaciones con esos filtros.'}
                  </td>
                </tr>
              ) : (
                visibles.map((c) => {
                  const f = 1 + c.iva_pct / 100;
                  const estadoActual = estadoEfectivo(c);
                  const est = ESTILO_ESTADO[estadoActual] ?? { label: estadoActual, color: 'text-[var(--c-muted)]' };
                  return (
                    <tr
                      key={c.id}
                      onClick={() => onAbrirFicha(c.empresa_id)}
                      className="hover:bg-[var(--c-surface-2)] cursor-pointer transition-colors group"
                    >
                      <td className="py-2.5 px-4 font-mono text-[var(--c-text-2)]">{formatCorrelativo('COT', c.numero)}</td>
                      <td className="py-2.5 px-3 text-[var(--c-text)] font-medium max-w-[260px] truncate">{c.titulo}</td>
                      <td className="py-2.5 px-3 text-[var(--c-text-2)]">{nombres.get(c.empresa_id) ?? '—'}</td>
                      <td className={`py-2.5 px-3 font-mono text-[11px] uppercase ${est.color}`}>{est.label}</td>
                      <td className="py-2.5 px-3 font-mono text-[var(--c-muted)]">{formatFecha(c.fecha_emision)}</td>
                      <td className="py-2.5 px-3 font-mono text-[var(--c-muted)]">{formatFecha(c.vence_el)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-[var(--c-text)]">
                        {c.neto_mensual > 0 ? formatMoneda(redondear(c.neto_mensual * f, c.moneda), c.moneda) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[var(--c-text-2)]">
                        {c.neto_unico > 0 ? formatMoneda(redondear(c.neto_unico * f, c.moneda), c.moneda) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <ChevronRight className="w-4 h-4 text-[var(--c-muted-2)] group-hover:text-[var(--c-text)] inline" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {mostrarNueva && (
        <SelectorCliente
          titulo="Nueva cotización · elige el cliente"
          etiquetaBoton="Continuar"
          clientes={clientesActivos}
          onCrear={async (nombre) => {
            const creada = await crearEmpresa({ nombre, estado: 'prospecto' });
            return creada?.id ?? null;
          }}
          onCerrar={() => setMostrarNueva(false)}
          onElegir={(id) => {
            setMostrarNueva(false);
            onAbrirFicha(id, true);
          }}
        />
      )}
    </div>
  );
};
