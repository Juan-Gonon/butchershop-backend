import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../src/domain/interfaces/authenticatesRequest.interface.js';
import { ProductosCarniceriaController } from '../../src/presentation/features/productosCarniceria/controller.js';
import type { ProductosCarniceriaService } from '../../src/presentation/services/productosCarniceria.service.js';

const makeResponse = () => {
  let statusCode = 200;
  let body: unknown;
  const response = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(value: unknown) {
      body = value;
      return this;
    }
  } as Response;
  return { response, result: () => ({ statusCode, body }) };
};

const authenticatedUser = { uuid: 'user-uuid', id_carniceria: 42, id_rol: 1 };

describe('ProductosCarniceriaController tenant handling', () => {
  it('toma el tenant de la sesión autenticada al listar', async () => {
    let tenantId: number | undefined;
    const service = {
      listar: async (id: number) => {
        tenantId = id;
        return { data: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 }, metrics: {} };
      }
    } as unknown as ProductosCarniceriaService;
    const controller = new ProductosCarniceriaController(service);
    const { response, result } = makeResponse();

    await controller.listar({ user: authenticatedUser, query: {} } as AuthenticatedRequest, response);
    assert.equal(tenantId, 42);
    assert.equal(result().statusCode, 200);
  });

  it('rechaza id_carniceria en el body de creación antes de llamar al service', async () => {
    let called = false;
    const service = {
      crear: async () => {
        called = true;
        return {};
      }
    } as unknown as ProductosCarniceriaService;
    const controller = new ProductosCarniceriaController(service);
    const { response, result } = makeResponse();

    await controller.crear({
      user: authenticatedUser,
      body: {
        producto_catalogo_uuid: '650e8400-e29b-41d4-a716-446655440000',
        id_unidad_venta: '4', precio: 10, maneja_inventario: false, id_carniceria: 999
      }
    } as AuthenticatedRequest, response);

    assert.equal(result().statusCode, 400);
    assert.equal(called, false);
  });
});