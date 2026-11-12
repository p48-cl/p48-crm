import React, { useEffect, useMemo, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { Trash2, Pencil, Check } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { useAuth } from '../../context/AuthContext';
import { formatCLP, formatFecha } from '../../lib/formatters';
import { EncabezadoDoc, FilaKpis, TablaDoc, COLUMNAS_DOC, celda, filaClase } from './DocumentosUI';
import { FacturaFormulario, ESTADOS_FACTURA } from './FacturaFormulario';
import type { Empresa, Factura } from '../../types/crm';

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const soloFecha = (v?: string | null) => (v ? v.slice(0, 10) : '');

export const estaVencida = (f: Factura) => f.estado_pago === 'pendiente' && !!f.fecha_vencimiento && soloFecha(f.fecha_vencimiento) < hoyISO();

export const FacturasCliente: React.FC<{ empresa: Empresa }> = ({ empresa }) => {
  const { facturas, actualizarFactura, eliminarFactura } = useCRM();
  const { isAdmin } = useAuth();
  // undefined = sin formulario; null = nueva; Factura = editando
  const [formulario, setFormulario] = useState<Factura | null | undefined>(undefined);
  const [cotizaciones, setCotizaciones] = useState<{ id: string; numero: number }[]>([]);

  const delCliente = useMemo(() => facturas.filter((f) => f.empresa_id === empresa.id), [facturas, empresa.id]);

  useEffect(() => {
    setFormulario(undefined);
    if (!isSupabaseConfigured || !supabase) return;
    let vivo = true;
    supabase
      .from('v_cotizaciones')
      .select('id,numero')
      .eq('empresa_id', empresa.id)
      .then(({ data }) => {
        if (vivo) setCotizaciones((data ?? []) as { id: string; numero: number }[]);
      });
    return () => { vivo = false; };
  }, [empresa.id]);

  const marcarPagada = (f: Factura) => actualizarFactura(f.id, { estado_pago: 'pagada', fecha_pago: hoyISO() });

  const pendientes = delCliente.filter((f) => f.estado_pago === 'pendiente');
  const vencidas = pendientes.filter(estaVencida);
  const pagadas = delCliente.filter((f) => f.estado_pago === 'pagada');
  const suma = (xs: Factura[]) => xs.reduce((acc, f) => acc + Number(f.monto_total), 0);

  return (
    <div className="space-y-4">
      <EncabezadoDoc titulo="Facturas" subtitulo="Registradas a mano desde el SII. Marca el pago cuando llegue." botonTexto={formulario !== undefined ? undefined : 'Registrar factura'} onBoton={() => setFormulario(null)} />
      <FilaKpis
        items={[
          { etiqueta: 'Pendientes', color: 'var(--c-warn)', valor: `${pendientes.length - vencidas.length} factura(s)`, sub: formatCLP(suma(pendientes.filter((f) => !estaVencida(f)))) },
          { etiqueta: 'Vencidas', color: 'var(--c-danger)', valor: `${vencidas.length} factura(s)`, sub: formatCLP(suma(vencidas)) },
          { etiqueta: 'Pagadas', color: 'var(--c-ok)', valor: `${pagadas.length} factura(s)`, sub: formatCLP(suma(pagadas)) },
          { etiqueta: 'Anuladas', color: 'var(--c-danger)', valor: `${delCliente.filter((f) => f.estado_pago === 'anulada').length} factura(s)`, sub: formatCLP(suma(delCliente.filter((f) => f.estado_pago === 'anulada'))) },
          { etiqueta: 'Total facturado', valor: `${delCliente.filter((f) => f.estado_pago !== 'anulada').length} factura(s)`, sub: formatCLP(suma(delCliente.filter((f) => f.estado_pago !== 'anulada'))) },
        ]}
      />

      {formulario !== undefined && (
        <FacturaFormulario empresa={empresa} inicial={formulario} onGuardado={() => setFormulario(undefined)} onCancelar={() => setFormulario(undefined)} />
      )}

      <TablaDoc columnas={COLUMNAS_DOC} hayFilas={delCliente.length > 0} vacio="Sin facturas registradas para este cliente.">
        {delCliente.map((f) => {
          const est = ESTADOS_FACTURA.find((s) => s.valor === f.estado_pago);
          const vencida = estaVencida(f);
          return (
            <tr key={f.id} className={filaClase}>
              <td className={`${celda} font-mono text-[var(--c-text)] whitespace-nowrap`}>
                {f.tipo_documento}-{String(f.folio).padStart(6, '0')}
                {f.url_documento && <a href={f.url_documento} target="_blank" rel="noreferrer" className="ml-2 text-[var(--c-accent)] hover:underline">PDF</a>}
              </td>
              <td className={`${celda} text-[var(--c-text-2)] max-w-[220px] truncate`}>
                {f.tipo_documento === 33 ? 'Factura afecta' : 'Factura exenta'}{f.cotizacion_id && cotizaciones.find((c) => c.id === f.cotizacion_id) ? ` · COT-${String(cotizaciones.find((c) => c.id === f.cotizacion_id)?.numero).padStart(4, '0')}` : ''}
              </td>
              <td className={`${celda} font-mono text-[var(--c-muted)]`}>{formatFecha(f.fecha_emision)}</td>
              <td className={`${celda} font-mono ${vencida ? 'text-[var(--c-danger)]' : 'text-[var(--c-muted)]'}`}>{f.fecha_vencimiento ? formatFecha(f.fecha_vencimiento) : '—'}</td>
              <td className={`${celda} font-mono text-right text-[var(--c-text)] whitespace-nowrap`}>{formatCLP(Number(f.monto_total))}</td>
              <td className={`${celda} font-medium ${vencida ? 'text-[var(--c-danger)]' : est?.clase ?? ''}`}>{vencida ? 'Vencida' : est?.texto}</td>
              <td className={celda}>
                <div className="flex items-center justify-end gap-1">
                  {f.estado_pago === 'pendiente' && (
                    <button onClick={() => marcarPagada(f)} title="Marcar como pagada" className="p-1.5 text-[var(--c-muted)] hover:text-[var(--c-ok)]"><Check className="w-3.5 h-3.5" /></button>
                  )}
                  <button onClick={() => setFormulario(f)} title="Editar" className="p-1.5 text-[var(--c-muted)] hover:text-[var(--c-text)]"><Pencil className="w-3.5 h-3.5" /></button>
                  {isAdmin && (
                    <button onClick={() => { if (window.confirm(`¿Eliminar la factura ${f.folio}? No se puede deshacer.`)) eliminarFactura(f.id); }} title="Eliminar" className="p-1.5 text-[var(--c-muted)] hover:text-[var(--c-danger)]"><Trash2 className="w-3.5 h-3.5" /></button>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </TablaDoc>
    </div>
  );
};
