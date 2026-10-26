import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ListProductosCarniceriaDto } from '../../src/domain/Dtos/productosCarniceria/getProductosCarniceria.dto.js';
import { CreateProductoCarniceriaDto } from '../../src/domain/Dtos/productosCarniceria/createProductoCarniceria.dto.js';
import { UpdateProductoCarniceriaDto } from '../../src/domain/Dtos/productosCarniceria/updateProductoCarniceria.dto.js';
import { ToggleDisponibilidadProductoCarniceriaDto } from '../../src/domain/Dtos/productosCarniceria/toggleDisponibilidadProductoCarniceria.dto.js';

const uuid = '550e8400-e29b-41d4-a716-446655440000';

describe('ProductosCarniceria DTOs', () => {
  it('valida filtros, convierte query booleans y aplica defaults de listado', () => {
    const [defaultError, defaults] = ListProductosCarniceriaDto.create({});
    assert.equal(defaultError, undefined);
    assert.equal(defaults?.page, 1);
    assert.equal(defaults?.pageSize, 20);
    assert.equal(defaults?.stock_critico, 3);

    const [error, dto] = ListProductosCarniceriaDto.create({
      page: '2', pageSize: '10', tipo_carne: ' Res ', categoria: ' Cortes ',
      disponible: 'false', maneja_inventario: 'true', stock_critico: '2.5'
    });
    assert.equal(error, undefined);
    assert.equal(dto?.page, 2);
    assert.equal(dto?.pageSize, 10);
    assert.equal(dto?.tipo_carne, 'Res');
    assert.equal(dto?.categoria, 'Cortes');
    assert.equal(dto?.disponible, false);
    assert.equal(dto?.maneja_inventario, true);
    assert.equal(dto?.stock_critico, 2.5);
  });

  it('rechaza filtros inválidos y tenant desconocido en query', () => {
    assert.ok(ListProductosCarniceriaDto.create({ page: '0' })[0]);
    assert.ok(ListProductosCarniceriaDto.create({ pageSize: '101' })[0]);
    assert.ok(ListProductosCarniceriaDto.create({ stock_critico: '-1' })[0]);
    assert.ok(ListProductosCarniceriaDto.create({ disponible: 'si' })[0]);
    assert.ok(ListProductosCarniceriaDto.create({ id_carniceria: '99' })[0]);
  });

  it('valida creación y fuerza stock null cuando no maneja inventario', () => {
    const [error, dto] = CreateProductoCarniceriaDto.create({
      producto_catalogo_uuid: uuid,
      id_unidad_venta: '4',
      precio: 12.5,
      maneja_inventario: false,
      stock_inicial: 9
    });
    assert.equal(error, undefined);
    assert.equal(dto?.id_unidad_venta, '4');
    assert.equal(dto?.stock_inicial, null);

    const [inventoryError, inventoryDto] = CreateProductoCarniceriaDto.create({
      producto_catalogo_uuid: uuid,
      id_unidad_venta: 4,
      precio: 12.5,
      maneja_inventario: true,
      stock_inicial: 3.25
    });
    assert.equal(inventoryError, undefined);
    assert.equal(inventoryDto?.stock_inicial, 3.25);
  });

  it('rechaza creación inválida y cualquier tenant en el body', () => {
    const valid = {
      producto_catalogo_uuid: uuid,
      id_unidad_venta: '4',
      precio: 12.5,
      maneja_inventario: true
    };
    assert.ok(CreateProductoCarniceriaDto.create({ ...valid, id_carniceria: 8 })[0]);
    assert.ok(CreateProductoCarniceriaDto.create({ ...valid, producto_catalogo_uuid: 'bad' })[0]);
    assert.ok(CreateProductoCarniceriaDto.create({ ...valid, id_unidad_venta: '0' })[0]);
    assert.ok(CreateProductoCarniceriaDto.create({ ...valid, precio: -1 })[0]);
    assert.ok(CreateProductoCarniceriaDto.create({ ...valid, precio: 1.234 })[0]);
  });

  it('valida uuid y campos opcionales de actualización; rechaza PATCH vacío', () => {
    const [error, dto] = UpdateProductoCarniceriaDto.create({
      uuid,
      id_unidad_venta: '7',
      precio: 15.75,
      maneja_inventario: true,
      stock_actual: 2.5
    });
    assert.equal(error, undefined);
    assert.equal(dto?.uuid, uuid);
    assert.equal(dto?.id_unidad_venta, '7');
    assert.equal(dto?.precio, 15.75);
    assert.equal(dto?.stock_actual, 2.5);

    assert.ok(UpdateProductoCarniceriaDto.create({ uuid })[0]);
    assert.ok(UpdateProductoCarniceriaDto.create({ uuid: 'invalid', precio: 10 })[0]);
    assert.ok(UpdateProductoCarniceriaDto.create({ uuid, id_carniceria: 8, precio: 10 })[0]);
  });

  it('normaliza stock a null al desactivar inventario en PATCH', () => {
    const [error, dto] = UpdateProductoCarniceriaDto.create({
      uuid, maneja_inventario: false, stock_actual: 9
    });
    assert.equal(error, undefined);
    assert.equal(dto?.stock_actual, null);
  });

  it('valida toggle con UUID y booleano explícito', () => {
    const [error, dto] = ToggleDisponibilidadProductoCarniceriaDto.create({ uuid, disponible: false });
    assert.equal(error, undefined);
    assert.equal(dto?.uuid, uuid);
    assert.equal(dto?.disponible, false);
    assert.ok(ToggleDisponibilidadProductoCarniceriaDto.create({ uuid, disponible: 'false' })[0]);
    assert.ok(ToggleDisponibilidadProductoCarniceriaDto.create({ uuid: 'invalid', disponible: true })[0]);
    assert.ok(ToggleDisponibilidadProductoCarniceriaDto.create({ uuid, disponible: true, id_carniceria: 8 })[0]);
  });
});