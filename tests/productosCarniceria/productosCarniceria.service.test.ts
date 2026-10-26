import assert from 'node:assert/strict';
import { describe, it, type TestContext } from 'node:test';
import { prisma } from '../../src/data/postgres/index.js';
import { CustomError } from '../../src/domain/errors/custom.error.js';
import { ListProductosCarniceriaDto } from '../../src/domain/Dtos/productosCarniceria/getProductosCarniceria.dto.js';
import { CreateProductoCarniceriaDto } from '../../src/domain/Dtos/productosCarniceria/createProductoCarniceria.dto.js';
import { UpdateProductoCarniceriaDto } from '../../src/domain/Dtos/productosCarniceria/updateProductoCarniceria.dto.js';
import { ToggleDisponibilidadProductoCarniceriaDto } from '../../src/domain/Dtos/productosCarniceria/toggleDisponibilidadProductoCarniceria.dto.js';
import { ProductosCarniceriaService } from '../../src/presentation/services/productosCarniceria.service.js';

interface ProductoDelegate {
  findMany(args: Record<string, unknown>): Promise<unknown[]>;
  count(args: Record<string, unknown>): Promise<number>;
  create(args: Record<string, unknown>): Promise<unknown>;
  findFirst(args: Record<string, unknown>): Promise<unknown>;
  update(args: Record<string, unknown>): Promise<unknown>;
}

interface FindUniqueDelegate {
  findUnique(args: Record<string, unknown>): Promise<unknown>;
}

const productoUuid = '550e8400-e29b-41d4-a716-446655440000';
const productos = prisma.productos_carniceria as unknown as ProductoDelegate;
const catalogo = prisma.productos_catalogo as unknown as FindUniqueDelegate;
const unidades = prisma.unidades_venta as unknown as FindUniqueDelegate;
const service = new ProductosCarniceriaService();

const stubMethod = <T extends object, K extends keyof T>(
  t: TestContext,
  target: T,
  methodName: K,
  implementation: T[K]
) => {
  const original = Reflect.get(target, methodName) as T[K];
  Object.defineProperty(target, methodName, { value: implementation, writable: true, configurable: true });
  t.after(() => {
    Object.defineProperty(target, methodName, { value: original, writable: true, configurable: true });
  });
};
const productRecord = (disponible = true) => ({
  uuid: productoUuid,
  precio: { toString: () => '12.50' },
  disponible,
  maneja_inventario: true,
  stock_actual: { toString: () => '2.00' },
  productos_catalogo: {
    uuid: '650e8400-e29b-41d4-a716-446655440000',
    nombre: 'Bistec',
    descripcion_general: 'Corte de res',
    imagen_url: null,
    categorias: {
      id: 10n,
      nombre: 'Cortes',
      tipos_carne: { id: 20n, nombre: 'Res' }
    }
  },
  unidades_venta: { id: 4n, nombre: 'Libra', abreviatura: 'lb' }
});

const makeListDto = (query: Record<string, unknown>) => {
  const [error, dto] = ListProductosCarniceriaDto.create(query);
  assert.equal(error, undefined);
  return dto!;
};
const makeCreateDto = (overrides: Record<string, unknown> = {}) => {
  const [error, dto] = CreateProductoCarniceriaDto.create({
    producto_catalogo_uuid: '650e8400-e29b-41d4-a716-446655440000',
    id_unidad_venta: '4', precio: 12.5, maneja_inventario: true, stock_inicial: 5,
    ...overrides
  });
  assert.equal(error, undefined);
  return dto!;
};
const makeUpdateDto = (body: Record<string, unknown>) => {
  const [error, dto] = UpdateProductoCarniceriaDto.create({ uuid: productoUuid, ...body });
  assert.equal(error, undefined);
  return dto!;
};
const makeToggleDto = (disponible: boolean) => {
  const [error, dto] = ToggleDisponibilidadProductoCarniceriaDto.create({ uuid: productoUuid, disponible });
  assert.equal(error, undefined);
  return dto!;
};

const hasStatus = (statusCode: number, message?: string) => (error: unknown) =>
  error instanceof CustomError
  && error.statusCode === statusCode
  && (message === undefined || error.message === message);

describe('ProductosCarniceriaService.listar', () => {
  it('aísla por tenant, aplica todos los filtros, pagina y calcula stock crítico', async (t) => {
    let findArgs: Record<string, unknown> = {};
    const countArgs: Record<string, unknown>[] = [];
    stubMethod(t, productos, 'findMany', async (args) => {
      findArgs = args;
      return [productRecord()];
    });
    stubMethod(t, productos, 'count', async (args) => {
      countArgs.push(args);
      return countArgs.length === 1 ? 8 : 2;
    });

    const result = await service.listar(42, makeListDto({
      page: '2', pageSize: '3', tipo_carne: 'res', categoria: 'cortes',
      disponible: 'false', maneja_inventario: 'true', stock_critico: '3'
    }));

    assert.deepEqual(findArgs.where, {
      id_carniceria: 42n,
      disponible: false,
      maneja_inventario: true,
      productos_catalogo: {
        categorias: {
          tipos_carne: { nombre: { equals: 'res', mode: 'insensitive' } },
          nombre: { equals: 'cortes', mode: 'insensitive' }
        }
      }
    });
    assert.deepEqual(findArgs.orderBy, [
      { productos_catalogo: { nombre: 'asc' } }, { id: 'asc' }
    ]);
    assert.equal(findArgs.skip, 3);
    assert.equal(findArgs.take, 3);
    assert.deepEqual(countArgs[0], { where: findArgs.where });
    assert.deepEqual(countArgs[1], {
      where: {
        ...findArgs.where as Record<string, unknown>,
        maneja_inventario: true,
        stock_actual: { lt: 3 }
      }
    });
    assert.equal(result.pagination.total, 8);
    assert.equal(result.metrics.total_productos_stock_critico, 2);
    assert.equal(result.data[0]?.stock_actual, '2.00');
    assert.equal(result.data[0]?.producto_catalogo.categoria.tipo_carne.nombre, 'Res');
    assert.equal(result.data[0]?.unidad_venta.id, '4');
  });
});

describe('ProductosCarniceriaService.crear', () => {
  it('valida catálogo y unidad y crea con tenant y stock del DTO', async (t) => {
    let createArgs: Record<string, unknown> = {};
    stubMethod(t, catalogo, 'findUnique', async () => ({ id: 100n }));
    stubMethod(t, unidades, 'findUnique', async () => ({ id: 4n }));
    stubMethod(t, productos, 'create', async (args) => {
      createArgs = args;
      return productRecord();
    });

    const result = await service.crear(42, makeCreateDto());
    assert.deepEqual(createArgs.data, {
      id_carniceria: 42n,
      id_producto_catalogo: 100n,
      id_unidad_venta: 4n,
      precio: 12.5,
      maneja_inventario: true,
      stock_actual: 5
    });
    assert.equal(result.uuid, productoUuid);
  });

  it('devuelve 404 si falta el producto del catálogo', async (t) => {
    stubMethod(t, catalogo, 'findUnique', async () => null);
    stubMethod(t, unidades, 'findUnique', async () => ({ id: 4n }));
    await assert.rejects(service.crear(42, makeCreateDto()), hasStatus(404, 'El producto del catálogo no existe'));
  });

  it('devuelve 404 si falta la unidad de venta', async (t) => {
    stubMethod(t, catalogo, 'findUnique', async () => ({ id: 100n }));
    stubMethod(t, unidades, 'findUnique', async () => null);
    await assert.rejects(service.crear(42, makeCreateDto()), hasStatus(404, 'La unidad de venta no existe'));
  });
  it('traduce P2002 a 409 sin intentar auto-reactivar', async (t) => {
    let updateCalled = false;
    stubMethod(t, catalogo, 'findUnique', async () => ({ id: 100n }));
    stubMethod(t, unidades, 'findUnique', async () => ({ id: 4n }));
    stubMethod(t, productos, 'create', async () => {
      throw Object.assign(new Error('unique'), { code: 'P2002' });
    });
    stubMethod(t, productos, 'update', async () => {
      updateCalled = true;
      return productRecord();
    });

    await assert.rejects(
      service.crear(42, makeCreateDto()),
      hasStatus(409, 'El producto ya se encuentra registrado en tu tienda')
    );
    assert.equal(updateCalled, false);
  });
});

describe('ProductosCarniceriaService.actualizar', () => {
  it('actualiza solo el tenant objetivo y limpia stock al desactivar inventario', async (t) => {
    let updateArgs: Record<string, unknown> = {};
    stubMethod(t, productos, 'findFirst', async () => ({ maneja_inventario: true }));
    stubMethod(t, unidades, 'findUnique', async () => ({ id: 7n }));
    stubMethod(t, productos, 'update', async (args) => {
      updateArgs = args;
      return productRecord();
    });

    await service.actualizar(42, productoUuid, makeUpdateDto({
      id_unidad_venta: '7', maneja_inventario: false, stock_actual: 9
    }));

    assert.deepEqual(updateArgs.where, { uuid: productoUuid, id_carniceria: 42n });
    assert.deepEqual(updateArgs.data, {
      id_unidad_venta: 7n,
      maneja_inventario: false,
      stock_actual: null
    });
  });

  it('no permite escribir stock si el producto ya tiene inventario desactivado', async (t) => {
    let updateArgs: Record<string, unknown> = {};
    stubMethod(t, productos, 'findFirst', async () => ({ maneja_inventario: false }));
    stubMethod(t, productos, 'update', async (args) => {
      updateArgs = args;
      return productRecord();
    });

    await service.actualizar(42, productoUuid, makeUpdateDto({ stock_actual: 7 }));
    assert.equal((updateArgs.data as Record<string, unknown>).stock_actual, null);
  });

  it('devuelve 404 cuando el producto no pertenece al tenant', async (t) => {
    stubMethod(t, productos, 'findFirst', async () => null);
    await assert.rejects(service.actualizar(42, productoUuid, makeUpdateDto({ precio: 9 })), hasStatus(404));
    t.mock.reset();
  });

  it('traduce conflicto de unicidad al cambiar la unidad', async (t) => {
    stubMethod(t, productos, 'findFirst', async () => ({ maneja_inventario: true }));
    stubMethod(t, unidades, 'findUnique', async () => ({ id: 7n }));
    stubMethod(t, productos, 'update', async () => {
      throw Object.assign(new Error('unique'), { code: 'P2002' });
    });
    await assert.rejects(
      service.actualizar(42, productoUuid, makeUpdateDto({ id_unidad_venta: '7' })),
      hasStatus(409, 'El producto ya se encuentra registrado en tu tienda')
    );
  });

  it('traduce P2025 de Prisma a 404', async (t) => {
    stubMethod(t, productos, 'findFirst', async () => ({ maneja_inventario: true }));
    stubMethod(t, productos, 'update', async () => {
      throw Object.assign(new Error('missing'), { code: 'P2025' });
    });
    await assert.rejects(service.actualizar(42, productoUuid, makeUpdateDto({ precio: 9 })), hasStatus(404));
  });
});

describe('ProductosCarniceriaService.toggleDisponibilidad', () => {
  it('escribe el valor explícito con tenant y uuid y devuelve el producto', async (t) => {
    let updateArgs: Record<string, unknown> = {};
    stubMethod(t, productos, 'update', async (args) => {
      updateArgs = args;
      return productRecord(false);
    });

    const result = await service.toggleDisponibilidad(42, productoUuid, makeToggleDto(false));
    assert.deepEqual(updateArgs.where, { uuid: productoUuid, id_carniceria: 42n });
    assert.deepEqual(updateArgs.data, { disponible: false });
    assert.equal(result.disponible, false);
    assert.equal(result.precio, '12.50');
  });

  it('devuelve 404 cuando no encuentra el UUID dentro del tenant', async (t) => {
    stubMethod(t, productos, 'update', async () => {
      throw Object.assign(new Error('missing'), { code: 'P2025' });
    });
    await assert.rejects(
      service.toggleDisponibilidad(42, productoUuid, makeToggleDto(true)),
      hasStatus(404, 'El producto no existe en tu tienda')
    );
  });
});