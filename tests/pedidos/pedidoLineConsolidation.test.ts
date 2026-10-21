import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { consolidatePedidoLines, sumDecimalValues } from '../../src/domain/types/pedidoLineConsolidation.js';

describe('consolidatePedidoLines', () => {
  it('consolida producto, preparación y observaciones equivalentes con suma decimal exacta', () => {
    const result = consolidatePedidoLines([
      { id_producto_carniceria: 10, id_tipo_preparacion: 2, cantidad: 0.1, observaciones: '  grueso ' },
      { id_producto_carniceria: 10, id_tipo_preparacion: 2, cantidad: 0.2, observaciones: 'grueso' }
    ]);

    assert.equal(result.length, 1);
    assert.equal(result[0]?.cantidad, 0.3);
    assert.equal(result[0]?.observaciones, 'grueso');
    assert.equal(sumDecimalValues([0.1, 0.2]), 0.3);
  });

  it('trata preparación ausente como null y observaciones vacías como equivalentes', () => {
    const result = consolidatePedidoLines([
      { id_producto_carniceria: 10, cantidad: 1, observaciones: null },
      { id_producto_carniceria: 10, id_tipo_preparacion: null, cantidad: 2, observaciones: '  ' }
    ]);

    assert.equal(result.length, 1);
    assert.equal(result[0]?.cantidad, 3);
    assert.equal(result[0]?.id_tipo_preparacion, null);
    assert.equal(result[0]?.observaciones, null);
  });

  it('mantiene separadas observaciones distintas, incluyendo diferencias de mayúsculas', () => {
    const result = consolidatePedidoLines([
      { id_producto_carniceria: 10, id_tipo_preparacion: 2, cantidad: 1, observaciones: 'Fino' },
      { id_producto_carniceria: 10, id_tipo_preparacion: 2, cantidad: 1, observaciones: 'fino' },
      { id_producto_carniceria: 10, id_tipo_preparacion: 2, cantidad: 1, observaciones: 'Fino y limpio' }
    ]);

    assert.equal(result.length, 3);
  });

  it('no consolida productos o preparaciones diferentes', () => {
    const result = consolidatePedidoLines([
      { id_producto_carniceria: 10, id_tipo_preparacion: 2, cantidad: 1 },
      { id_producto_carniceria: 11, id_tipo_preparacion: 2, cantidad: 1 },
      { id_producto_carniceria: 10, id_tipo_preparacion: 3, cantidad: 1 }
    ]);

    assert.equal(result.length, 3);
  });
});
