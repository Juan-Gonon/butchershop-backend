import { StatePedido } from './statePedidos.enum.js';

const cancellableStates: ReadonlySet<StatePedido> = new Set([
  StatePedido.PENDIENTE,
  StatePedido.CONFIRMADO
]);

export type PedidoCancellationDecision =
  | { eligible: true }
  | { eligible: false; reason: 'already_cancelled' | 'state_not_cancellable' };

export const getPedidoCancellationDecision = (
  currentState: StatePedido
): PedidoCancellationDecision => {
  if (currentState === StatePedido.CANCELADO) {
    return { eligible: false, reason: 'already_cancelled' };
  }

  if (!cancellableStates.has(currentState)) {
    return { eligible: false, reason: 'state_not_cancellable' };
  }

  return { eligible: true };
};
