import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { prisma } from '../../src/data/postgres/index.js';
import { ListCatalogoProductosDto } from '../../src/domain/Dtos/catalogoProductos/listCatalogoProductos.dto.js';
import { CatalogoProductosService } from '../../src/presentation/services/catalogoProductos.service.js';

const producto = {
  uuid: 'producto-uuid',
  nombre: 'Bistec',
  descripcion_general: 'Corte de res',
  imagen_url: null,
  categorias: {
    id: 10n,
    nombre: 'Cortes',
    tipos_carne: { id: 20n, nombre: 'Res' }
  },
  unidades_venta: { id: 30n, nombre: 'Libra', abreviatura: 'lb' }
};

interface CatalogoDelegate {
  findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
  count: (args: Record<string, unknown>) => Promise<number>;
}

const delegate = prisma.productos_catalogo as unknown as CatalogoDelegate;

const makeDto = (query: Record<string, unknown>) => {
  const [error, dto] = ListCatalogoProductosDto.create(query);
  assert.equal(error, undefined);
  assert.ok(dto);
  return dto!;
};

describe('CatalogoProductosService', () => {
  it('filtra por tipo sin distinguir mayúsculas, ordena y pagina; serializa los BigInt', async (t) => {
    let findArgs: Record<string, unknown> = {};
    let countArgs: Record<string, unknown> = {};
    t.mock.method(delegate, 'findMany', async (args: Record<string, unknown>) => {
      findArgs = args;
      return [producto];
    });
    t.mock.method(delegate, 'count', async (args: Record<string, unknown>) => {
      countArgs = args;
      return 21;
    });

    const result = await new CatalogoProductosService().listar(makeDto({
      page: '2', pageSize: '10', tipo_carne: 'rEs'
    }));

    assert.deepEqual(findArgs.where, {
      categorias: { tipos_carne: { nombre: { equals: 'rEs', mode: 'insensitive' } } }
    });
    assert.deepEqual(countArgs, { where: findArgs.where });
    assert.deepEqual(findArgs.orderBy, { nombre: 'asc' });
    assert.equal(findArgs.skip, 10);
    assert.equal(findArgs.take, 10);
    assert.deepEqual(findArgs.include, {
      categorias: { include: { tipos_carne: true } },
      unidades_venta: true
    });
    assert.deepEqual(result.data[0], {
      uuid: 'producto-uuid',
      nombre: 'Bistec',
      descripcion_general: 'Corte de res',
      imagen_url: null,
      categoria: {
        id: '10',
        nombre: 'Cortes',
        tipo_carne: { id: '20', nombre: 'Res' }
      },
      unidad_venta_defecto: { id: '30', nombre: 'Libra', abreviatura: 'lb' }
    });
    assert.deepEqual(result.pagination, { page: 2, pageSize: 10, total: 21, totalPages: 3 });
    assert.doesNotThrow(() => JSON.stringify(result));
  });

  it('omite límites cuando todos=true y retorna pagination null', async (t) => {
    let findArgs: Record<string, unknown> = {};
    t.mock.method(delegate, 'findMany', async (args: Record<string, unknown>) => {
      findArgs = args;
      return [];
    });
    t.mock.method(delegate, 'count', async () => 0);

    const result = await new CatalogoProductosService().listar(makeDto({ todos: 'true' }));

    assert.deepEqual(findArgs.where, {});
    assert.equal(findArgs.skip, undefined);
    assert.equal(findArgs.take, undefined);
    assert.equal(result.pagination, null);
    assert.deepEqual(result.data, []);
  });
});