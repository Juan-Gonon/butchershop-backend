import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { UpdatePedidoDetailsDto } from '../../src/domain/Dtos/pedidos/updatePedidoDetails.dto.js';
import { CustomError } from '../../src/domain/errors/custom.error.js';
import {
  assertMatchingIdempotency,
  groupRequestedLines,
  requestHash,
  validateInventoryLedger
} from '../../src/presentation/services/pedidoDetailsEditor.service.js';
import type { Prisma } from '../../src/generated/prisma/client.js';

const dto = (detalles: unknown[]) => {
  const [error, value] = UpdatePedidoDetailsDto.create({ versionEsperada: 4, detalles });
  assert.equal(error, undefined);
  assert.ok(value);
  return value;
};

describe('pedido details edit rules', () => {
  it('consolidates equivalent requested lines while preserving detail IDs', () => {
    const value = dto([
      { id_detalle_pedido: '10', id_producto_carniceria: '20', id_tipo_preparacion: '3', cantidad: 1.25, observaciones: '  grueso ' },
      { id_detalle_pedido: '11', id_producto_carniceria: '20', id_tipo_preparacion: '3', cantidad: 0.75, observaciones: 'grueso' }
    ]);

    const groups = groupRequestedLines(value.detalles);
    assert.equal(groups.length, 1);
    assert.deepEqual(groups[0]?.detailIds, ['10', '11']);
    assert.equal(groups[0]?.quantity.toFixed(2), '2.00');
    assert.equal(groups[0]?.observations, 'grueso');
  });

  it('keeps case-sensitive observation variants as separate lines', () => {
    const value = dto([
      { id_producto_carniceria: '20', cantidad: 1, observaciones: 'Fino' },
      { id_producto_carniceria: '20', cantidad: 1, observaciones: 'fino' }
    ]);
    assert.equal(groupRequestedLines(value.detalles).length, 2);
  });

  it('hashes equivalent line order identically and detects changed content', () => {
    const first = dto([
      { id_producto_carniceria: '20', cantidad: 1, observaciones: 'A' },
      { id_producto_carniceria: '21', cantidad: 2 }
    ]);
    const reordered = dto([
      { id_producto_carniceria: '21', cantidad: 2 },
      { id_producto_carniceria: '20', cantidad: 1, observaciones: 'A' }
    ]);
    const changed = dto([
      { id_producto_carniceria: '20', cantidad: 1.5, observaciones: 'A' },
      { id_producto_carniceria: '21', cantidad: 2 }
    ]);

    assert.equal(requestHash(first, groupRequestedLines(first.detalles)), requestHash(reordered, groupRequestedLines(reordered.detalles)));
    assert.notEqual(requestHash(first, groupRequestedLines(first.detalles)), requestHash(changed, groupRequestedLines(changed.detalles)));
  });

  it('returns the stored idempotent result and rejects a changed body', () => {
    const stored = { hash_solicitud: `${'a'.repeat(64)} `, resultado: { version: 5 } };
    assert.deepEqual(assertMatchingIdempotency(stored, 'a'.repeat(64)), { version: 5 });
    assert.throws(() => assertMatchingIdempotency(stored, 'b'.repeat(64)), (error: unknown) =>
      error instanceof CustomError && error.statusCode === 409
    );
  });

  it('accepts a complete POS ledger and rejects a missing or unclassified movement', async () => {
    const tenantId = 2n;
    const orderId = 3n;
    const orderUuid = '550e8400-e29b-41d4-a716-446655440000';
    const details = [{
      id: 100n, id_producto_carniceria: 10n, id_tipo_preparacion: null,
      cantidad: '2.00', precio_unitario: '5.00', subtotal: '10.00',
      observaciones: null, maneja_inventario_en_base: true, eliminado_en: null
    }];
    const sale = {
      id: 9n, id_carniceria: tenantId, id_pedido: orderId,
      id_producto_carniceria: 10n, id_detalle_pedido: null,
      id_movimiento_origen: null, id_operacion_edicion: null,
      tipo: 'SALIDA', sentido: 'SALIDA', cantidad: '2.00', motivo: 'VENTA_POS',
      referencia_operacion: `PEDIDO_POS:${orderUuid}`,
      clave_idempotencia: `PEDIDO_POS:${orderUuid}:SALIDA:10`,
      producto_tenant: tenantId, operacion_pedido: null, operacion_tenant: null
    };
    const fakeDb = (rows: unknown[]) => ({ $queryRaw: async () => rows }) as unknown as Prisma.TransactionClient;

    await validateInventoryLedger(fakeDb([sale]), tenantId, orderId, orderUuid, details);
    await assert.rejects(
      validateInventoryLedger(fakeDb([]), tenantId, orderId, orderUuid, details),
      (error: unknown) => error instanceof CustomError && error.statusCode === 409
    );
    await assert.rejects(
      validateInventoryLedger(fakeDb([{ ...sale, tipo: 'AJUSTE', motivo: 'nota libre' }]), tenantId, orderId, orderUuid, details),
      (error: unknown) => error instanceof CustomError && error.statusCode === 409
    );
  });
});
