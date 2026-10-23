import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CancelPedidoDto } from '../../src/domain/Dtos/pedidos/cancelPedido.dto.js';

describe('CancelPedidoDto', () => {
  it('acepta una solicitud sin body', () => {
    const [error, dto] = CancelPedidoDto.create(undefined);
    assert.equal(error, undefined);
    assert.ok(dto);
  });

  it('acepta un objeto vacío cuando Express representa así un body vacío', () => {
    const [error, dto] = CancelPedidoDto.create({});
    assert.equal(error, undefined);
    assert.ok(dto);
  });

  it('rechaza propiedades extra y otros tipos de body', () => {
    assert.ok(CancelPedidoDto.create({ motivo: 'duplicado' })[0]);
    assert.ok(CancelPedidoDto.create('cancelar')[0]);
  });
});
