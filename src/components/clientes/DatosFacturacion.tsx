import { formatRUTInput } from '../../lib/formatters';
import React, { useEffect, useState } from 'react';
import { Receipt } from 'lucide-react';
import { Empresa } from '../../types/crm';

interface Props {
  empresa: Empresa;
  onGuardar: (cambios: Partial<Empresa>) => void;
}

const input = 'w-full bg-[var(--c-surface)] border border-[var(--c-line)] rounded px-2.5 py-1.5 text-xs text-[var(--c-text)]';
const label = 'block text-[11px] text-[var(--c-muted)] mb-1';

// Datos que necesita una cotización o factura. Se guarda al salir de cada campo.
export const DatosFacturacion: React.FC<Props> = ({ empresa, onGuardar }) => {
  const [f, setF] = useState({
    razon_social: empresa.razon_social ?? '',
    rut: empresa.rut ?? '',
    giro: empresa.giro ?? '',
    direccion_facturacion: empresa.direccion_facturacion ?? '',
    email_facturacion: empresa.email_facturacion ?? '',
    dias_pago: String(empresa.dias_pago ?? 30),
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setF({
      razon_social: empresa.razon_social ?? '',
      rut: empresa.rut ?? '',
      giro: empresa.giro ?? '',
      direccion_facturacion: empresa.direccion_facturacion ?? '',
      email_facturacion: empresa.email_facturacion ?? '',
      dias_pago: String(empresa.dias_pago ?? 30),
    });
    setError(null);
  }, [empresa.id, empresa.razon_social, empresa.rut, empresa.giro, empresa.direccion_facturacion, empresa.email_facturacion, empresa.dias_pago]);

  const guardarTexto = (campo: 'razon_social' | 'rut' | 'giro' | 'direccion_facturacion') => {
    const nuevo = f[campo].trim();
    if (nuevo === (empresa[campo] ?? '')) return;
    onGuardar({ [campo]: nuevo || null });
  };

  const guardarEmail = () => {
    const nuevo = f.email_facturacion.trim().toLowerCase();
    if (nuevo === (empresa.email_facturacion ?? '')) return;
    if (nuevo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nuevo)) {
      setError('Correo de facturación inválido');
      return;
    }
    setError(null);
    onGuardar({ email_facturacion: nuevo || null });
  };

  const guardarDias = () => {
    const n = Number(f.dias_pago);
    if (!Number.isInteger(n) || n < 0 || n > 365) {
      setError('Días de pago entre 0 y 365');
      return;
    }
    setError(null);
    if (n !== (empresa.dias_pago ?? 30)) onGuardar({ dias_pago: n });
  };

  return (
    <div className="surface p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Receipt className="w-4 h-4 text-[var(--c-muted)]" />
        <h3 className="text-xs font-semibold text-[var(--c-text)]">Datos legales y tributarios</h3>
        <span className="ml-auto text-[10px] text-[var(--c-muted)]">Necesarios para cotizar y facturar</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div>
          <label className={label}>Razón social *</label>
          <input className={input} value={f.razon_social} onChange={(e) => setF({ ...f, razon_social: e.target.value })} onBlur={() => guardarTexto('razon_social')} />
        </div>
        <div>
          <label className={label}>RUT *</label>
          <input className={`${input} font-mono`} placeholder="76.123.456-7" value={f.rut} onChange={(e) => setF({ ...f, rut: formatRUTInput(e.target.value) })} onBlur={() => guardarTexto('rut')} />
        </div>
        <div>
          <label className={label}>Giro *</label>
          <input className={input} value={f.giro} onChange={(e) => setF({ ...f, giro: e.target.value })} onBlur={() => guardarTexto('giro')} />
        </div>
        <div>
          <label className={label}>Dirección (calle, comuna, ciudad) *</label>
          <input className={input} value={f.direccion_facturacion} onChange={(e) => setF({ ...f, direccion_facturacion: e.target.value })} onBlur={() => guardarTexto('direccion_facturacion')} />
        </div>
        <div>
          <label className={label}>Correo para facturas</label>
          <input type="email" className={input} value={f.email_facturacion} onChange={(e) => setF({ ...f, email_facturacion: e.target.value })} onBlur={guardarEmail} />
        </div>
        <div>
          <label className={label}>Condición de pago (días)</label>
          <input type="number" min={0} max={365} className={`${input} font-mono`} value={f.dias_pago} onChange={(e) => setF({ ...f, dias_pago: e.target.value })} onBlur={guardarDias} />
        </div>
      </div>
      {(!empresa.razon_social || !empresa.rut || !empresa.giro || !empresa.direccion_facturacion) && (
        <p className="text-[11px] text-[var(--c-warn)]">Faltan datos obligatorios (*) para emitir cotización o factura.</p>
      )}
      {error && <p className="text-[11px] text-[var(--c-danger)]">{error}</p>}
    </div>
  );
};
