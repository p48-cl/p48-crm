import React, { useMemo, useState } from 'react';
import { Filter, Search, Check, ArchiveRestore } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useCRM } from '../context/CRMContext';
import { formatCLP, formatFecha } from '../lib/formatters';
import { Kpi } from '../components/dashboard/ui';
import { ThOrdenable } from '../components/common/ThOrdenable';
import { useOrden } from '../lib/orden';
import { estaVencida } from '../components/clientes/FacturasCliente';
import { FacturaFormulario } from '../components/clientes/FacturaFormulario';
import type { Factura } from '../types/crm';

type ClaveOrden = 'folio' | 'cliente' | 'estado' | 'emision' | 'vence' | 'total';

const selectClase =
  'bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded px-2 py-1.5 text-xs text-[var(--c-text)] focus:outline-none focus:border-[var(--c-accent)]';

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Estado visible: una factura pendiente con vencimiento pasado se muestra como vencida
const estadoVisible = (f: Factura) => (estaVencida(f) ? 'vencida' : f.estado_pago);
const ETIQUETA: Record<string, { texto: string; clase: string }> = {
  pendiente: { texto: 'Pendiente', clase: 'text-[var(--c-warn)]' },
  vencida: { texto: 'Vencida', clase: 'text-[var(--c-danger)]' },
  pagada: { texto: 'Pagada', clase: 'text-[var(--c-ok)]' },
  anulada: { texto: 'Anulada', clase: 'text-[var(--c-danger)]' },
};

interface FacturasViewProps {
  // Abre la ficha del cliente en la pestaña Facturación
  onAbrirFicha: (empresaId: string) => void;
}

// Vista global de facturas de todos los clientes. El registro se hace dentro de la ficha de cada cliente.
export const FacturasView: React.FC<FacturasViewProps> = ({ onAbrirFicha }) => {
  const { facturas, empresas, empresasTodas, agencia, actualizarFactura } = useCRM();
  const [abiertaId, setAbiertaId] = useState<string | null>(null);
  const [nueva, setNueva] = useState(false);
  const [verArchivadas, setVerArchivadas] = useState(false);
  const [archivadas, setArchivadas] = useState<Factura[]>([]);
  const clientesDisponibles = useMemo(() => empresasTodas.filter((e) => e.id !== agencia?.id && !e.archivado).sort((a, b) => a.nombre.localeCompare(b.nombre)), [empresasTodas, agencia]);
  const [busqueda, setBusqueda] = useState('');
  const [estado, setEstado] = useState('todos');
  const { clave, dir, alternar, ordenar } = useOrden<ClaveOrden>('emision', 'desc');

  const nombres = useMemo(() => new Map(empresas.map((e) => [e.id, e.nombre])), [empresas]);
  const abierta = abiertaId ? facturas.find((f) => f.id === abiertaId) ?? null : null;
  const filas = useMemo(() => facturas.filter((f) => f.empresa_id !== agencia?.id), [facturas, agencia]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const base = filas.filter((f) => {
      if (estado !== 'todos' && estadoVisible(f) !== estado) return false;
      if (!q) return true;
      return `${f.tipo_documento}-${f.folio} ${nombres.get(f.empresa_id) ?? ''}`.toLowerCase().includes(q);
    });
    return ordenar(base, (f, k) => {
      switch (k) {
        case 'folio': return f.folio;
        case 'cliente': return nombres.get(f.empresa_id) ?? '';
        case 'estado': return estadoVisible(f);
        case 'emision': return f.fecha_emision;
        case 'vence': return f.fecha_vencimiento ?? '';
        case 'total': return Number(f.monto_total);
      }
    });
  }, [filas, busqueda, estado, nombres, ordenar]);

  const kpis = useMemo(() => {
    const suma = (xs: Factura[]) => xs.reduce((a, f) => a + Number(f.monto_total), 0);
    const vivas = filas.filter((f) => f.estado_pago !== 'anulada');
    const pendientes = filas.filter((f) => f.estado_pago === 'pendiente');
    const vencidas = pendientes.filter(estaVencida);
    const mes = hoyISO().slice(0, 7);
    const pagadasMes = filas.filter((f) => f.estado_pago === 'pagada' && (f.fecha_pago ?? '').startsWith(mes));
    return {
      porCobrar: suma(pendientes), nPendientes: pendientes.length,
      vencido: suma(vencidas), nVencidas: vencidas.length,
      cobradoMes: suma(pagadasMes), nPagadasMes: pagadasMes.length,
      facturado: suma(vivas), nVivas: vivas.length,
    };
  }, [filas]);

  const cabecera = (k: ClaveOrden, etiqueta: string, alinear: 'left' | 'right' = 'left') => (
    <ThOrdenable key={k} etiqueta={etiqueta} activa={clave === k} dir={dir} onClick={() => alternar(k)} alinear={alinear} className={`py-2.5 px-3 font-medium ${k === 'folio' ? 'px-4' : ''}`} />
  );

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold font-sans text-[var(--c-text)]">Facturas</h1>
          <p className="text-xs text-[var(--c-muted)] mt-0.5">{filas.length} facturas · registradas desde el SII</p>
        </div>
        <button onClick={() => setNueva(true)} className="px-3.5 py-2 text-xs font-semibold rounded bg-[var(--c-accent)] text-[var(--c-on-accent)]">+ Registrar factura</button>
      </div>

      {nueva && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && setNueva(false)}>
          <div className="bg-[var(--c-surface)] border border-[var(--c-line)] rounded-xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl max-h-[92dvh] overflow-y-auto" role="dialog" aria-label="Registrar factura">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-[var(--c-text)]">Registrar factura</h2>
              <button onClick={() => setNueva(false)} className="text-xs text-[var(--c-muted)] hover:text-[var(--c-text)]">Cerrar</button>
            </div>
            <FacturaFormulario empresasDisponibles={clientesDisponibles} onGuardado={() => setNueva(false)} onCancelar={() => setNueva(false)} />
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={async () => {
            const nuevo = !verArchivadas;
            setVerArchivadas(nuevo);
            if (nuevo && isSupabaseConfigured && supabase) {
              const { data } = await supabase.from('facturas').select('*').eq('archivado', true).order('fecha_emision', { ascending: false });
              setArchivadas((data ?? []) as Factura[]);
            }
          }}
          className="text-xs text-[var(--c-muted)] hover:text-[var(--c-text)] font-mono"
        >
          {verArchivadas ? 'Ocultar archivadas' : 'Ver archivadas'}
        </button>
      </div>

      {verArchivadas && (
        <div className="bg-[var(--c-surface)] border border-[var(--c-line)] rounded-lg overflow-hidden">
          <div className="px-4 py-2 border-b border-[var(--c-line)] text-[11px] font-mono uppercase text-[var(--c-muted)]">Facturas archivadas</div>
          {archivadas.length === 0 ? (
            <p className="p-4 text-xs text-[var(--c-muted)]">No hay facturas archivadas.</p>
          ) : (
            <ul className="divide-y divide-[var(--c-line)]">
              {archivadas.map((f) => (
                <li key={f.id} className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
                  <span className="font-mono text-[var(--c-text)]">{f.tipo_documento}-{String(f.folio).padStart(6, '0')}</span>
                  <span className="text-[var(--c-muted)] font-mono">{formatCLP(Number(f.monto_total))} · {formatFecha(f.fecha_emision)}</span>
                  <button
                    onClick={async () => {
                      await actualizarFactura(f.id, { archivado: false });
                      setArchivadas((prev) => prev.filter((x) => x.id !== f.id));
                    }}
                    className="flex items-center gap-1 text-[var(--c-accent)] hover:underline"
                  >
                    <ArchiveRestore className="w-3.5 h-3.5" /> Restaurar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi etiqueta="Por cobrar" acento="var(--c-warn)" valor={formatCLP(kpis.porCobrar)} nota={`${kpis.nPendientes} factura(s) pendientes`} />
        <Kpi etiqueta="Vencido" acento="var(--c-danger)" valor={formatCLP(kpis.vencido)} tono={kpis.nVencidas > 0 ? 'peligro' : 'normal'} nota={`${kpis.nVencidas} factura(s)`} />
        <Kpi etiqueta="Cobrado este mes" acento="var(--c-ok)" valor={formatCLP(kpis.cobradoMes)} nota={`${kpis.nPagadasMes} factura(s)`} />
        <Kpi etiqueta="Total facturado" valor={formatCLP(kpis.facturado)} nota={`${kpis.nVivas} factura(s) sin anuladas`} />
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-[var(--c-surface)] p-3 rounded-lg border border-[var(--c-line)]">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-[var(--c-muted)] absolute left-3 top-2.5" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por folio o cliente..."
            className="w-full bg-[var(--c-surface-2)] border border-[var(--c-line)] rounded pl-8 pr-3 py-1.5 text-xs text-[var(--c-text)] placeholder:text-[var(--c-muted-2)] focus:outline-none focus:border-[var(--c-accent)]"
          />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[var(--c-muted)]">
          <Filter className="w-3.5 h-3.5" />
          <select className={selectClase} value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Filtrar por estado">
            <option value="todos">Todos los estados</option>
            {Object.entries(ETIQUETA).map(([k, v]) => <option key={k} value={k}>{v.texto}</option>)}
          </select>
        </div>
      </div>

      {abierta && (() => {
        const emp = empresasTodas.find((e) => e.id === abierta.empresa_id);
        if (!emp) return null;
        const ev = estadoVisible(abierta);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && setAbiertaId(null)}>
            <div className="bg-[var(--c-surface)] border border-[var(--c-line)] rounded-xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl max-h-[92dvh] overflow-y-auto space-y-4" role="dialog" aria-label="Factura">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-sm font-semibold text-[var(--c-text)]">{abierta.tipo_documento}-{String(abierta.folio).padStart(6, '0')}</p>
                  <p className="text-xs text-[var(--c-muted)]">{emp.nombre} · <span className={ETIQUETA[ev].clase}>{ETIQUETA[ev].texto}</span></p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <button onClick={() => { setAbiertaId(null); onAbrirFicha(abierta.empresa_id); }} className="text-[var(--c-accent)] hover:underline">Ver cliente</button>
                  <button onClick={() => setAbiertaId(null)} className="text-[var(--c-muted)] hover:text-[var(--c-text)]">Cerrar</button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div><p className="text-[10px] font-mono uppercase text-[var(--c-muted)]">Total</p><p className="font-mono text-[var(--c-text)]">{formatCLP(Number(abierta.monto_total))}</p></div>
                <div><p className="text-[10px] font-mono uppercase text-[var(--c-muted)]">Emisión</p><p className="font-mono text-[var(--c-text-2)]">{formatFecha(abierta.fecha_emision)}</p></div>
                <div><p className="text-[10px] font-mono uppercase text-[var(--c-muted)]">Vence</p><p className="font-mono text-[var(--c-text-2)]">{abierta.fecha_vencimiento ? formatFecha(abierta.fecha_vencimiento) : '—'}</p></div>
                <div><p className="text-[10px] font-mono uppercase text-[var(--c-muted)]">Pagada</p><p className="font-mono text-[var(--c-text-2)]">{abierta.fecha_pago ? formatFecha(abierta.fecha_pago) : '—'}</p></div>
              </div>
              <FacturaFormulario empresa={emp} inicial={abierta} onGuardado={() => setAbiertaId(null)} onCancelar={() => setAbiertaId(null)} />
            </div>
          </div>
        );
      })()}

      <div className="bg-[var(--c-surface)] rounded-lg border border-[var(--c-line)] overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[var(--c-surface-2)] border-b border-[var(--c-line)] text-[var(--c-muted)] uppercase font-mono text-[11px]">
            <tr>
              {cabecera('folio', 'Folio')}
              {cabecera('cliente', 'Cliente')}
              {cabecera('estado', 'Estado')}
              {cabecera('emision', 'Emisión')}
              {cabecera('vence', 'Vence')}
              {cabecera('total', 'Total', 'right')}
              <th className="py-2.5 px-3 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--c-line)]">
            {visibles.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[var(--c-muted)]">
                  {filas.length === 0 ? 'Aún no hay facturas registradas.' : 'No hay facturas con esos filtros.'}
                </td>
              </tr>
            ) : (
              visibles.map((f) => {
                const ev = estadoVisible(f);
                const et = ETIQUETA[ev];
                return (
                  <tr key={f.id} onClick={() => setAbiertaId(f.id)} className="hover:bg-[var(--c-surface-2)] cursor-pointer transition-colors">
                    <td className="py-2.5 px-4 font-mono text-[var(--c-text)]">{f.tipo_documento}-{String(f.folio).padStart(6, '0')}</td>
                    <td className="py-2.5 px-3 text-[var(--c-text-2)]">{nombres.get(f.empresa_id) ?? '—'}</td>
                    <td className={`py-2.5 px-3 font-mono text-[11px] uppercase ${et.clase}`}>{et.texto}</td>
                    <td className="py-2.5 px-3 font-mono text-[var(--c-muted)]">{formatFecha(f.fecha_emision)}</td>
                    <td className={`py-2.5 px-3 font-mono ${ev === 'vencida' ? 'text-[var(--c-danger)]' : 'text-[var(--c-muted)]'}`}>{f.fecha_vencimiento ? formatFecha(f.fecha_vencimiento) : '—'}</td>
                    <td className="py-2.5 px-3 font-mono text-right text-[var(--c-text)]">{formatCLP(Number(f.monto_total))}</td>
                    <td className="py-2.5 px-3 text-right">
                      {f.estado_pago === 'pendiente' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); actualizarFactura(f.id, { estado_pago: 'pagada', fecha_pago: hoyISO() }); }}
                          title="Marcar como pagada"
                          className="p-1.5 text-[var(--c-muted)] hover:text-[var(--c-ok)]"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
