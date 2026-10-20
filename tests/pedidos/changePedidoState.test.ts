import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ChangePedidoStateDto } from '../../src/domain/Dtos/pedidos/changePedidoState.dto.js';
import { isPedidoStateTransitionAllowed } from '../../src/domain/types/pedidoStateTransitions.js';

describe('ChangePedidoStateDto', () => {
  it('acepta los estados reales con origen esperado y destino', () => {
    const [error, dto] = ChangePedidoStateDto.create({
      estado_actual_esperado: 'Confirmado',
      estado_destino: 'En preparación'
    });

    assert.equal(error, undefined);
    assert.equal(dto?.estado_actual_esperado, 'Confirmado');
    assert.equal(dto?.estado_destino, 'En preparación');
  });

  it('rechaza estados que no existen', () => {
    const [error] = ChangePedidoStateDto.create({
      estado_actual_esperado: 'CONFIRMADO',
      estado_destino: 'EN_PREPARACION'
    });

    assert.ok(error);
  });
});

describe('isPedidoStateTransitionAllowed', () => {
  const allowedTransitions = [
    ['Confirmado', 'En preparación', 'Recoger en tienda'],
    ['Confirmado', 'En preparación', 'A domicilio'],
    ['En preparación', 'Confirmado', 'Recoger en tienda'],
    ['En preparación', 'Confirmado', 'A domicilio'],
    ['En preparación', 'En camino', 'A domicilio'],
    ['En preparación', 'Entregado', 'Recoger en tienda'],
    ['En camino', 'Entregado', 'A domicilio']
  ] as const;

  for (const [current, target, deliveryType] of allowedTransitions) {
    it(`permite ${current} → ${target} (${deliveryType})`, () => {
      assert.equal(isPedidoStateTransitionAllowed(current, target, deliveryType), true);
    });
  }

  it('rechaza transiciones fuera de la matriz', () => {
    assert.equal(isPedidoStateTransitionAllowed('Confirmado', 'Entregado', 'Domicilio'), false);
    assert.equal(isPedidoStateTransitionAllowed('Pendiente', 'Confirmado', 'Domicilio'), false);
    assert.equal(isPedidoStateTransitionAllowed('Cancelado', 'Confirmado', 'Recoger en tienda'), false);
  });

  it('rechaza transiciones de entrega incompatibles con la modalidad', () => {
    assert.equal(isPedidoStateTransitionAllowed('En preparación', 'En camino', 'Recoger en tienda'), false);
    assert.equal(isPedidoStateTransitionAllowed('En preparación', 'Entregado', 'A domicilio'), false);
    assert.equal(isPedidoStateTransitionAllowed('En camino', 'Entregado', 'Recoger en tienda'), false);
  });

  it('rechaza modalidades desconocidas, nulas o ausentes cuando la transición depende de ellas', () => {
    for (const deliveryType of ['Domicilio', 'Entrega especial', null, undefined]) {
      assert.equal(isPedidoStateTransitionAllowed('En preparación', 'En camino', deliveryType), false);
      assert.equal(isPedidoStateTransitionAllowed('En preparación', 'Entregado', deliveryType), false);
      assert.equal(isPedidoStateTransitionAllowed('En camino', 'Entregado', deliveryType), false);
    }
  });

  it('permite transiciones independientes de la modalidad aunque sea desconocida', () => {
    assert.equal(isPedidoStateTransitionAllowed('Confirmado', 'En preparación', null), true);
    assert.equal(isPedidoStateTransitionAllowed('En preparación', 'Confirmado', 'Entrega especial'), true);
  });
});
