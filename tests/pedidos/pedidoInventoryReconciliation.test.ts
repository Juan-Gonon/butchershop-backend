import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  reconcilePedidoInventoryReturns,
  type PedidoInventoryMovementEvidence
} from '../../src/domain/types/pedidoInventoryReconciliation.js';

const scope = {
  tenantId: '2',
  orderId: '3',
  orderUuid: '550e8400-e29b-41d4-a716-446655440000'
};

const posSale = (overrides: Partial<PedidoInventoryMovementEvidence> = {}): PedidoInventoryMovementEvidence => ({
  id: '9', id_carniceria: scope.tenantId, id_pedido: scope.orderId,
  id_producto_carniceria: '10', id_detalle_pedido: null,
  id_movimiento_origen: null, id_operacion_edicion: null,
  tipo: 'SALIDA', sentido: 'SALIDA', cantidad: '2.35', motivo: 'VENTA_POS',
  referencia_operacion: `PEDIDO_POS:${scope.orderUuid}`,
  clave_idempotencia: `PEDIDO_POS:${scope.orderUuid}:SALIDA:10`,
  ...overrides
});

const editReturn = (overrides: Partial<PedidoInventoryMovementEvidence> = {}): PedidoInventoryMovementEvidence => ({
  id: '10', id_carniceria: scope.tenantId, id_pedido: scope.orderId,
  id_producto_carniceria: '10', id_detalle_pedido: '100',
  id_movimiento_origen: '9', id_operacion_edicion: '20',
  tipo: 'DEVOLUCION', sentido: 'ENTRADA', cantidad: '0.35', motivo: 'EDICION_PEDIDO',
  referencia_operacion: 'PEDIDO_EDICION:20',
  clave_idempotencia: 'PEDIDO_EDICION:20:DEVOLUCION:9:100',
  operacion_pedido: scope.orderId,
  operacion_tenant: scope.tenantId,
  ...overrides
});

describe('reconcilePedidoInventoryReturns', () => {
  it('calcula exactamente la salida pendiente después de devoluciones previas', () => {
    const result = reconcilePedidoInventoryReturns([posSale(), editReturn()], scope);
    assert.deepEqual(result, {
      safe: true,
      returns: [{ id_movimiento_origen: '9', id_producto_carniceria: '10', cantidad: '2.00' }]
    });
  });

  it('no planifica devoluciones duplicadas cuando la salida ya se devolvió completa', () => {
    const firstReturn = editReturn({ id: '10', cantidad: '1.00', clave_idempotencia: 'PEDIDO_EDICION:20:DEVOLUCION:9:100' });
    const secondReturn = editReturn({ id: '11', cantidad: '1.35', clave_idempotencia: 'PEDIDO_EDICION:21:DEVOLUCION:9:101', id_operacion_edicion: '21', referencia_operacion: 'PEDIDO_EDICION:21', id_detalle_pedido: '101' });
    const result = reconcilePedidoInventoryReturns([posSale(), firstReturn, secondReturn], scope);
    assert.deepEqual(result, { safe: true, returns: [] });
  });

  it('devuelve cero de forma segura si no hay salidas registradas', () => {
    assert.deepEqual(reconcilePedidoInventoryReturns([], scope), { safe: true, returns: [] });
  });

  it('devuelve cero si una devolución supera la salida original', () => {
    const result = reconcilePedidoInventoryReturns([
      posSale(), editReturn({ cantidad: '2.36' })
    ], scope);
    assert.deepEqual(result, { safe: false, returns: [] });
  });

  it('devuelve cero si la evidencia de origen es ambigua o inconsistente', () => {
    const wrongSource = editReturn({ id_movimiento_origen: '404' });
    const wrongTenant = posSale({ id_carniceria: '99' });
    assert.deepEqual(reconcilePedidoInventoryReturns([posSale(), wrongSource], scope), { safe: false, returns: [] });
    assert.deepEqual(reconcilePedidoInventoryReturns([wrongTenant], scope), { safe: false, returns: [] });
  });
});
