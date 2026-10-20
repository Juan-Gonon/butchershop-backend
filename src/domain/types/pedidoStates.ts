export const PEDIDO_ESTADOS = [
  'Pendiente',
  'Confirmado',
  'En preparación',
  'En camino',
  'Entregado',
  'Cancelado'
] as const;

export type EstadoPedidoNombre = (typeof PEDIDO_ESTADOS)[number];
