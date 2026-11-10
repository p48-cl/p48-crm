import React from 'react';
import { DirOrden } from '../../lib/orden';

interface ThOrdenableProps {
  etiqueta: React.ReactNode;
  activa: boolean;
  dir: DirOrden;
  onClick: () => void;
  alinear?: 'left' | 'right' | 'center';
  className?: string;
}

// Encabezado de columna con orden. Mantiene las clases de celda de la tabla donde se usa.
export const ThOrdenable: React.FC<ThOrdenableProps> = ({ etiqueta, activa, dir, onClick, alinear = 'left', className = '' }) => {
  const alineacion = alinear === 'right' ? 'text-right' : alinear === 'center' ? 'text-center' : 'text-left';
  const flex = alinear === 'right' ? 'justify-end' : alinear === 'center' ? 'justify-center' : 'justify-start';
  return (
    <th className={`${className} ${alineacion}`} aria-sort={activa ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 ${flex} hover:text-[var(--c-text)] ${activa ? 'text-[var(--c-text)]' : ''}`}
      >
        {etiqueta}
        <span aria-hidden="true" className="text-[9px]">{activa ? (dir === 'asc' ? '▲' : '▼') : ''}</span>
      </button>
    </th>
  );
};
