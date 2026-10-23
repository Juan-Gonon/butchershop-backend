import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CancelPedidoDto } from '../../src/domain/Dtos/pedidos/cancelPedido.dto.js';

describe('CancelPedidoDto', () => {
  it('acepta una versión esperada no negativa', () => {
    const [error, dto] = CancelPedidoDto.create({ versionEsperada: 0 });
    assert.equal(error, undefined);
    assert.equal(dto?.versionEsperada, 0);
  });

  it('rechaza una versión ausente, negativa o no entera', () => {
    for (const versionEsperada of [undefined, -1, 1.5, '2']) {
      assert.ok(CancelPedidoDto.create({ versionEsperada })[0]);
    }
  });

  it('rechaza propiedades extra y otros tipos de body', () => {
    assert.ok(CancelPedidoDto.create({ motivo: 'duplicado' })[0]);
    assert.ok(CancelPedidoDto.create('cancelar')[0]);
  });
});
