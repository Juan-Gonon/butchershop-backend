import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ListPedidosDto, PedidoUuidDto } from '../../src/domain/Dtos/pedidos/getPedidos.dto.js';

describe('ListPedidosDto', () => {
  it('aplica paginación por defecto', () => {
    const [error, dto] = ListPedidosDto.create({});

    assert.equal(error, undefined);
    assert.equal(dto?.page, 1);
    assert.equal(dto?.pageSize, 20);
  });

  it('valida filtros y convierte parámetros de paginación', () => {
    const [error, dto] = ListPedidosDto.create({
      page: '2',
      pageSize: '50',
      estado: 'Confirmado',
      desde: '2026-01-01T00:00:00Z',
      hasta: '2026-01-31T23:59:59Z'
    });

    assert.equal(error, undefined);
    assert.equal(dto?.page, 2);
    assert.equal(dto?.pageSize, 50);
    assert.equal(dto?.estado, 'Confirmado');
    assert.ok(dto?.desde instanceof Date);
    assert.ok(dto?.hasta instanceof Date);
  });

  it('rechaza límites de página fuera del rango permitido', () => {
    const [error] = ListPedidosDto.create({ page: '0', pageSize: '101' });

    assert.ok(error);
  });

  it('acepta los seis nombres canónicos de estado', () => {
    const estados = [
      'Pendiente',
      'Confirmado',
      'En preparación',
      'En camino',
      'Entregado',
      'Cancelado'
    ] as const;

    for (const estado of estados) {
      const [error, dto] = ListPedidosDto.create({ estado });
      assert.equal(error, undefined);
      assert.equal(dto?.estado, estado);
    }
  });

  it('rechaza los nombres de estado con guion bajo', () => {
    assert.ok(ListPedidosDto.create({ estado: 'En_preparacion' })[0]);
    assert.ok(ListPedidosDto.create({ estado: 'En_camino' })[0]);
  });
  it('rechaza estados y rangos de fecha inválidos', () => {
    const [invalidState] = ListPedidosDto.create({ estado: 'DESCONOCIDO' });
    const [invalidRange] = ListPedidosDto.create({
      desde: '2026-02-01T00:00:00Z',
      hasta: '2026-01-01T00:00:00Z'
    });

    assert.ok(invalidState);
    assert.equal(invalidRange, 'La fecha hasta debe ser posterior o igual a desde');
  });
});

describe('PedidoUuidDto', () => {
  it('rechaza UUID inválido', () => {
    const [error] = PedidoUuidDto.create({ uuid: 'no-es-uuid' });

    assert.ok(error);
  });
});
