import { useState } from 'react';

export type DirOrden = 'asc' | 'desc';

// Orden de tablas por columna. Primer clic: mayor a menor (desc); segundo clic: menor a mayor (asc).
export function useOrden<K extends string>(claveInicial: K, dirInicial: DirOrden = 'desc') {
  const [clave, setClave] = useState<K>(claveInicial);
  const [dir, setDir] = useState<DirOrden>(dirInicial);

  const alternar = (k: K) => {
    if (k === clave) setDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else { setClave(k); setDir('desc'); }
  };

  // Devuelve una copia ordenada. Nulos y vacíos van al inicio en asc.
  const ordenar = <T,>(items: T[], valor: (item: T, clave: K) => string | number | null | undefined): T[] => {
    const signo = dir === 'asc' ? 1 : -1;
    return [...items].sort((a, b) => {
      const va = valor(a, clave) ?? '';
      const vb = valor(b, clave) ?? '';
      const r = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb), 'es', { numeric: true, sensitivity: 'base' });
      return r * signo;
    });
  };

  return { clave, dir, alternar, ordenar };
}
