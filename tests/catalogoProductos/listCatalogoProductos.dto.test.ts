import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ListCatalogoProductosDto } from '../../src/domain/Dtos/catalogoProductos/listCatalogoProductos.dto.js';

describe('ListCatalogoProductosDto', () => {
  it('aplica los valores por defecto', () => {
    const [error, dto] = ListCatalogoProductosDto.create({});

    assert.equal(error, undefined);
    assert.equal(dto?.page, 1);
    assert.equal(dto?.pageSize, 20);
    assert.equal(dto?.todos, false);
    assert.equal(dto?.tipo_carne, undefined);
  });

  it('convierte los parámetros de query y recorta tipo_carne', () => {
    const [error, dto] = ListCatalogoProductosDto.create({
      page: '2',
      pageSize: '50',
      tipo_carne: ' Res ',
      todos: 'true'
    });

    assert.equal(error, undefined);
    assert.equal(dto?.page, 2);
    assert.equal(dto?.pageSize, 50);
    assert.equal(dto?.tipo_carne, 'Res');
    assert.equal(dto?.todos, true);
  });

  it('acepta todos=false y rechaza valores o límites inválidos', () => {
    const [falseError, falseDto] = ListCatalogoProductosDto.create({ todos: 'false' });
    assert.equal(falseError, undefined);
    assert.equal(falseDto?.todos, false);

    assert.ok(ListCatalogoProductosDto.create({ page: '0' })[0]);
    assert.ok(ListCatalogoProductosDto.create({ pageSize: '101' })[0]);
    assert.ok(ListCatalogoProductosDto.create({ tipo_carne: '   ' })[0]);
    assert.ok(ListCatalogoProductosDto.create({ todos: 'yes' })[0]);
  });
});