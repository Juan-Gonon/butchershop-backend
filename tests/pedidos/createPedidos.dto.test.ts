import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CreatePedidoDto } from '../../src/domain/Dtos/pedidos/createPedidos.dto.js';

describe('CreatePedidoDto observation normalization', () => {
  it('trims only U+0020 spaces so POS grouping matches the PostgreSQL BTRIM indexes', () => {
    const [error, dto] = CreatePedidoDto.create({
      cliente_uuid: '550e8400-e29b-41d4-a716-446655440000',
      id_tipo_entrega: 1,
      canal_origen: 'pos',
      productos: [
        { id_producto_carniceria: 10, cantidad: 1, observaciones: '  grueso  ' },
        { id_producto_carniceria: 11, cantidad: 1, observaciones: '\tgrueso\t' }
      ]
    });

    assert.equal(error, undefined);
    assert.equal(dto?.productos[0]?.observaciones, 'grueso');
    assert.equal(dto?.productos[1]?.observaciones, '\tgrueso\t');
  });
});
