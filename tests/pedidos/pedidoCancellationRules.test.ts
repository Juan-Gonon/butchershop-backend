import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getPedidoCancellationDecision } from '../../src/domain/types/pedidoCancellationRules.js';
import { StatePedido } from '../../src/domain/types/statePedidos.enum.js';

describe('getPedidoCancellationDecision', () => {
  it('permite cancelar pedidos pendientes y confirmados', () => {
    for (const state of [StatePedido.PENDIENTE, StatePedido.CONFIRMADO]) {
      assert.deepEqual(getPedidoCancellationDecision(state), { eligible: true });
    }
  });

  it('bloquea pedidos en preparación, en camino y entregados', () => {
    for (const state of [
      StatePedido.EN_PREPARACION,
      StatePedido.EN_CAMINO,
      StatePedido.ENTREGADO
    ]) {
      assert.deepEqual(getPedidoCancellationDecision(state), {
        eligible: false,
        reason: 'state_not_cancellable'
      });
    }
  });

  it('identifica por separado un pedido ya cancelado', () => {
    assert.deepEqual(getPedidoCancellationDecision(StatePedido.CANCELADO), {
      eligible: false,
      reason: 'already_cancelled'
    });
  });
});
