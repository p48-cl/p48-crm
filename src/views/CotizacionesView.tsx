import React, { useEffect, useMemo, useState } from 'react';
import { Archive, ArchiveRestore, ChevronRight, Filter, Plus, Search } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { parseSupabaseError } from '../lib/errorHandler';
import { formatFecha, formatMoneda, formatCorrelativo } from '../lib/formatters';
import { estadoEfectivo, redondear, MonedaCotizacion, estiloEstado, ESTADOS_COTIZACION } from '../lib/cotizaciones';
import { useConfiguracionCRM } from '../lib/configuracion';
import { useCRM } from '../context/CRMContext';
import { SelectorCliente } from '../components/common/SelectorCliente';
import { Kpi } from '../components/dashboard/ui';
import { ThOrdenable } from '../components/common/ThOrdenable';
import { useOrden } from '../lib/orden';
import { CotizacionDetalle } from '../components/clientes/CotizacionesCliente';

// Factura derivada de una cotización (facturas.cotizacion_id). Si hay varias, se muestra la más reciente.
interface FacturaDerivada {
  tipo_documento: 33 | 34;
  folio: number;
  estado_pago: string;
}

const etiquetaFactura = (f: FacturaDerivada) => `${f.tipo_documento}-${String(f.folio).padStart(6, '0')}`;

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

const ESTADOS = ESTADOS_COTIZACION;


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
  const { config: cfgCRM } = useConfiguracionCRM();
  const estilo = (e: string) => { const x = estiloEstado(cfgCRM.estados_cotizacion, e); return { label: x.etiqueta, color: x.clase }; };
  const [filasTodas, setFilas] = useState<Fila[]>([]);
  // Las cotizaciones de la cuenta interna de la agencia se ven solo en Agencia.
  const [archivadasIds, setArchivadasIds] = useState<Set<string>>(new Set());
  const [verArchivadas, setVerArchivadas] = useState(false);
  // Activas o archivadas según el toggle; la agencia interna no aparece aquí
  const filas = useMemo(
    () => filasTodas.filter((f) => f.empresa_id !== agencia?.id && archivadasIds.has(f.id) === verArchivadas),
    [filasTodas, agencia, archivadasIds, verArchivadas]
  );
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState<string>('todos');
  const [mostrarNueva, setMostrarNueva] = useState(false);
  const [abierta, setAbierta] = useState<string | null>(null);
  const [recarga, setRecarga] = useState(0);
  const [facturas, setFacturas] = useState<Record<string, FacturaDerivada>>({});
  const { clave: sortKey, dir: sortDir, alternar: alternarOrden, ordenar } = useOrden<ClaveOrden>('numero', 'desc');

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setCargando(false);
      return;
    }
    supabase
      .from('cotizaciones')
      .select('id')
      .eq('archivado', true)
      .then(({ data }) => setArchivadasIds(new Set(((data ?? []) as { id: string }[]).map((c) => c.id))));
    supabase
      .from('facturas')
      .select('cotizacion_id, tipo_documento, folio, estado_pago, fecha_emision')
      .not('cotizacion_id', 'is', null)
      .order('fecha_emision', { ascending: false })
      .then(({ data }) => {
        const mapa: Record<string, FacturaDerivada> = {};
        for (const f of (data ?? []) as (FacturaDerivada & { cotizacion_id: string })[]) {
          if (!mapa[f.cotizacion_id]) mapa[f.cotizacion_id] = f;
        }
        setFacturas(mapa);
      });
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
  }, [version, recarga]);

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
    const vencidas = clp.filter((f) => estadoEfectivo(f) === 'vencida');
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
      rechazadas: rechazadas.length,
      montoRechazadas: rechazadas.reduce((a, f) => a + conIva(f, 'neto_mensual') + conIva(f, 'neto_unico'), 0),
      vencidas: vencidas.length,
      montoVencidas: vencidas.reduce((a, f) => a + conIva(f, 'neto_mensual') + conIva(f, 'neto_unico'), 0),
      montoAceptadas: aceptadas.reduce((a, f) => a + conIva(f, 'neto_mensual') + conIva(f, 'neto_unico'), 0),
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
              etiqueta={estilo('aceptada').label}
              acento={estiloEstado(cfgCRM.estados_cotizacion, 'aceptada').color}
              valor={`${formatMoneda(kpis.mensualAceptado, 'CLP')}/mes`}
              nota={`${kpis.aceptadas} cotizaciones · ${kpis.clientesAceptados} clientes · único ${formatMoneda(kpis.unicoAceptado, 'CLP')} · ${kpis.tasa != null ? `${kpis.tasa}% de cerradas` : 'sin cerradas'}`}
            />
            <Kpi
              etiqueta={estilo('enviada').label}
              acento={estiloEstado(cfgCRM.estados_cotizacion, 'enviada').color}
              valor={formatMoneda(kpis.enEspera, 'CLP')}
              tono={kpis.venceEn7 > 0 ? 'aviso' : 'normal'}
              nota={`${kpis.enviadas} cotizaciones potenciales c/IVA · ${kpis.venceEn7} vencen en 7 días`}
            />
            <Kpi
              etiqueta={estilo('rechazada').label}
              acento={estiloEstado(cfgCRM.estados_cotizacion, 'rechazada').color}
              valor={formatMoneda(kpis.montoRechazadas, 'CLP')}
              nota={`${kpis.rechazadas} cotizaciones c/IVA`}
            />
            <Kpi
              etiqueta={estilo('vencida').label}
              acento={estiloEstado(cfgCRM.estados_cotizacion, 'vencida').color}
              tono={kpis.vencidas > 0 ? 'peligro' : 'normal'}
              valor={formatMoneda(kpis.montoVencidas, 'CLP')}
              nota={`${kpis.vencidas} cotizaciones c/IVA`}
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
          <button
            onClick={() => setVerArchivadas((v) => !v)}
            className="ml-2 font-mono text-[11px] text-[var(--c-muted)] hover:text-[var(--c-text)]"
          >
            {verArchivadas ? 'Ver activas' : 'Ver archivadas'}
          </button>
          <Filter className="w-3.5 h-3.5" />
          <select className={selectClase} value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Filtrar por estado">
            <option value="todos">Todos los estados</option>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {estilo(e).label}
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
                <th className="py-2.5 px-3 text-left">Factura</th>
                <th className="py-2.5 px-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--c-line)]">
              {cargando ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-[var(--c-muted)]">Cargando…</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-[var(--c-danger)]">{error}</td>
                </tr>
              ) : visibles.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-[var(--c-muted)]">
                    {filas.length === 0
                      ? 'Aún no hay cotizaciones. Pulsa «Nueva cotización» para empezar.'
                      : 'No hay cotizaciones con esos filtros.'}
                  </td>
                </tr>
              ) : (
                visibles.map((c) => {
                  const f = 1 + c.iva_pct / 100;
                  const estadoActual = estadoEfectivo(c);
                  const est = estilo(estadoActual);
                  return (
                    <tr
                      key={c.id}
                      onClick={() => setAbierta(c.id)}
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
                      <td className="py-2.5 px-3 font-mono text-[11px] text-[var(--c-text-2)] whitespace-nowrap">
                        {facturas[c.id] ? (
                          <span className={facturas[c.id].estado_pago === 'anulada' ? 'line-through text-[var(--c-muted)]' : ''}>
                            {etiquetaFactura(facturas[c.id])}
                          </span>
                        ) : (
                          <span className="text-[var(--c-muted-2)]">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!supabase) return;
                            const archivar = !archivadasIds.has(c.id);
                            if (archivar && !window.confirm(`¿Archivar la cotización ${formatCorrelativo('COT', c.numero)}?`)) return;
                            await supabase.from('cotizaciones').update({ archivado: archivar }).eq('id', c.id);
                            setArchivadasIds((prev) => {
                              const nuevo = new Set(prev);
                              if (archivar) nuevo.add(c.id); else nuevo.delete(c.id);
                              return nuevo;
                            });
                          }}
                          title={verArchivadas ? 'Restaurar' : 'Archivar'}
                          className="p-1 mr-1 text-[var(--c-muted)] hover:text-[var(--c-text)] opacity-0 group-hover:opacity-100"
                        >
                          {verArchivadas ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                        </button>
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

      {abierta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && setAbierta(null)}>
          <div className="bg-[var(--c-surface)] border border-[var(--c-line)] rounded-xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl max-h-[92dvh] overflow-y-auto" role="dialog" aria-label="Cotización">
            {facturas[abierta] && (
              <p className="mb-3 text-xs text-[var(--c-text-2)]">
                Factura emitida: <span className="font-mono text-[var(--c-text)]">{etiquetaFactura(facturas[abierta])}</span>
                {' · '}
                <span className="font-mono uppercase text-[11px]">{facturas[abierta].estado_pago}</span>
              </p>
            )}
            <CotizacionDetalle cotizacionId={abierta} onCerrar={() => setAbierta(null)} onCambio={() => setRecarga((n) => n + 1)} />
          </div>
        </div>
      )}

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
