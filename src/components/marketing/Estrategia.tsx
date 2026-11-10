import React, { useState } from 'react';
import { useDatosMarketing } from './comun';
import { EstrategiaEditor } from '../clientes/EstrategiaCliente';

export const Estrategia: React.FC = () => {
  const { clientes, cargando } = useDatosMarketing();
  const [clienteSel, setClienteSel] = useState('');

  const clienteId = clienteSel || clientes[0]?.id || '';
  const cliente = clientes.find((c) => c.id === clienteId);

  if (cargando) return <p className="text-sm text-[var(--c-muted)]">Cargando...</p>;
  if (clientes.length === 0) return <div className="surface p-6 text-sm text-[var(--c-muted)]">No hay clientes activos todavía.</div>;

  return (
    <div className="space-y-5">
      <select
        value={clienteId}
        onChange={(e) => setClienteSel(e.target.value)}
        className="px-2.5 py-1.5 text-xs bg-[var(--c-surface)] border border-[var(--c-line)] rounded text-[var(--c-text)]"
        aria-label="Cliente"
      >
        {clientes.map((c) => (
          <option key={c.id} value={c.id}>{c.nombre}</option>
        ))}
      </select>
      <EstrategiaEditor empresaId={clienteId} nombreCliente={cliente?.nombre} />
    </div>
  );
};
