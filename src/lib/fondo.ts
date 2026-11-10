import type { MouseEvent } from 'react';

// Fondo de un modal que se cierra al pinchar fuera del panel.
// Solo cuenta si el puntero también empezó fuera: así no se cierra al seleccionar texto
// dentro del panel y soltar el mouse sobre el fondo.
export const fondoCerrable = (onClose: () => void) => ({
  onMouseDown: (e: MouseEvent<HTMLDivElement>) => {
    e.currentTarget.dataset.inicioFuera = String(e.target === e.currentTarget);
  },
  onClick: (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && e.currentTarget.dataset.inicioFuera === 'true') onClose();
  },
});
