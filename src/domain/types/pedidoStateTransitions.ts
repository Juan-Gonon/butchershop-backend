import type { EstadoPedidoNombre } from './pedidoStates.js';

export const isPedidoStateTransitionAllowed = (
  current: EstadoPedidoNombre,
  target: EstadoPedidoNombre,
  tipoEntregaNombre: string | null | undefined
): boolean => {
  const esDomicilio = tipoEntregaNombre === 'A domicilio';
  const esRecogidaEnTienda = tipoEntregaNombre === 'Recoger en tienda';

  if (current === 'Confirmado' && target === 'En preparación') return true;
  if (current === 'En preparación' && target === 'Confirmado') return true;
  if (current === 'En preparación' && target === 'En camino') return esDomicilio;
  if (current === 'En preparación' && target === 'Entregado') return esRecogidaEnTienda;
  if (current === 'En camino' && target === 'Entregado') return esDomicilio;

  return false;
};
