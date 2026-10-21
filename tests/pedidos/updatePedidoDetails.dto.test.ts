import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { UpdatePedidoDetailsDto } from '../../src/domain/Dtos/pedidos/updatePedidoDetails.dto.js';

const validPayload = {
  versionEsperada: 1,
  detalles: [{
    id_detalle_pedido: '9007199254740993',
    id_producto_carniceria: '123',
    id_tipo_preparacion: null,
    cantidad: 2.5,
    observaciones: '  corte grueso  '
  }]
};

describe('UpdatePedidoDetailsDto', () => {
  it('acepta una lista válida y preserva IDs BigInt como strings', () => {
    const [error, dto] = UpdatePedidoDetailsDto.create(validPayload);

    assert.equal(error, undefined);
    assert.equal(dto?.versionEsperada, 1);
    assert.equal(dto?.detalles[0]?.id_detalle_pedido, '9007199254740993');
    assert.equal(dto?.detalles[0]?.id_producto_carniceria, '123');
    assert.equal(dto?.detalles[0]?.observaciones, 'corte grueso');
  });

  it('acepta líneas nuevas sin ID y campos opcionales omitidos', () => {
    const [error, dto] = UpdatePedidoDetailsDto.create({
      versionEsperada: 2,
      detalles: [{ id_producto_carniceria: '7', cantidad: 1 }]
    });

    assert.equal(error, undefined);
    assert.equal(dto?.detalles[0]?.id_detalle_pedido, undefined);
  });

  it('rechaza versiones ausentes, no enteras o no positivas', () => {
    for (const versionEsperada of [undefined, 0, -1, 1.5, '1']) {
      const [error] = UpdatePedidoDetailsDto.create({ ...validPayload, versionEsperada });
      assert.ok(error, `versionEsperada=${String(versionEsperada)} debía rechazarse`);
    }
  });

  it('exige entre 1 y 50 detalles', () => {
    assert.ok(UpdatePedidoDetailsDto.create({ versionEsperada: 1, detalles: [] })[0]);
    assert.ok(UpdatePedidoDetailsDto.create({
      versionEsperada: 1,
      detalles: Array.from({ length: 51 }, () => ({ id_producto_carniceria: '1', cantidad: 1 }))
    })[0]);
  });

  it('rechaza IDs repetidos, cero, negativos, fuera del rango BigInt, no numéricos y números JSON', () => {
    const repeated = {
      versionEsperada: 1,
      detalles: [
        { ...validPayload.detalles[0] },
        { ...validPayload.detalles[0], id_producto_carniceria: '456' }
      ]
    };
    assert.ok(UpdatePedidoDetailsDto.create(repeated)[0]);

    for (const id of ['0', '-1', 'abc', '9223372036854775808', 123]) {
      assert.ok(UpdatePedidoDetailsDto.create({
        versionEsperada: 1,
        detalles: [{ id_producto_carniceria: id, cantidad: 1 }]
      })[0]);
    }
  });

  it('rechaza cantidades no válidas y observaciones demasiado largas', () => {
    for (const cantidad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, 1.234, 301]) {
      assert.ok(UpdatePedidoDetailsDto.create({
        versionEsperada: 1,
        detalles: [{ id_producto_carniceria: '1', cantidad }]
      })[0]);
    }

    assert.ok(UpdatePedidoDetailsDto.create({
      versionEsperada: 1,
      detalles: [{ id_producto_carniceria: '1', cantidad: 1, observaciones: 'x'.repeat(256) }]
    })[0]);

    assert.equal(UpdatePedidoDetailsDto.create({
      versionEsperada: 1,
      detalles: [{ id_producto_carniceria: '1', cantidad: 1.23 }]
    })[0], undefined);
  });

  it('rechaza propiedades no permitidas en el objeto raíz y en cada detalle', () => {
    assert.ok(UpdatePedidoDetailsDto.create({ ...validPayload, id_carniceria: 1 })[0]);

    for (const forbiddenField of [
      'precio_unitario', 'subtotal', 'total', 'id_cliente', 'id_tipo_entrega',
      'id_direccion_envio', 'costo_envio', 'id_carniceria'
    ]) {
      const [error] = UpdatePedidoDetailsDto.create({
        versionEsperada: 1,
        detalles: [{ id_producto_carniceria: '1', cantidad: 1, [forbiddenField]: 10 }]
      });
      assert.ok(error, `${forbiddenField} debía rechazarse`);
    }
  });
});
