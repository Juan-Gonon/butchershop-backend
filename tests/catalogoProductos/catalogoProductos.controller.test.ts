import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../src/domain/interfaces/authenticatesRequest.interface.js';
import { CatalogoProductosController } from '../../src/presentation/features/catalogoProductos/controller.js';
import type { CatalogoProductosService } from '../../src/presentation/services/catalogoProductos.service.js';

const invokeController = async (
  serviceMethod: (...args: unknown[]) => Promise<unknown>,
  request: Partial<AuthenticatedRequest>
) => {
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
  const service = { listar: serviceMethod } as unknown as CatalogoProductosService;
  const controller = new CatalogoProductosController(service);

  await controller.listar(request as AuthenticatedRequest, response);
  return { statusCode, body };
};

describe('CatalogoProductosController.listar', () => {
  it('rechaza solicitudes sin usuario autenticado y no llama al servicio', async () => {
    let called = false;
    const response = await invokeController(async () => {
      called = true;
      return {};
    }, { query: {} } as Partial<AuthenticatedRequest>);

    assert.equal(response.statusCode, 401);
    assert.equal(called, false);
  });

  it('rechaza query inválida y no llama al servicio', async () => {
    let called = false;
    const response = await invokeController(async () => {
      called = true;
      return {};
    }, {
      user: { uuid: 'usuario-uuid', id_carniceria: 1, id_rol: 1 },
      query: { page: '0' }
    } as Partial<AuthenticatedRequest>);

    assert.equal(response.statusCode, 400);
    assert.equal(called, false);
  });

  it('pasa el DTO validado al servicio y devuelve data y pagination', async () => {
    let receivedDto: { page: number; tipo_carne?: string } | undefined;
    const result = { data: [{ uuid: 'producto-uuid' }], pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 } };
    const response = await invokeController(async (dto) => {
      receivedDto = dto as { page: number; tipo_carne?: string };
      return result;
    }, {
      user: { uuid: 'usuario-uuid', id_carniceria: 1, id_rol: 1 },
      query: { page: '1', tipo_carne: 'Res' }
    } as Partial<AuthenticatedRequest>);

    assert.equal(response.statusCode, 200);
    assert.equal(receivedDto.page, 1);
    assert.equal(receivedDto.tipo_carne, 'Res');
    assert.deepEqual(response.body, { ok: true, ...result });
  });

  it('convierte errores inesperados del servicio en respuesta 500', async () => {
    const response = await invokeController(async () => {
      throw new Error('fallo interno');
    }, {
      user: { uuid: 'usuario-uuid', id_carniceria: 1, id_rol: 1 },
      query: {}
    } as Partial<AuthenticatedRequest>);

    assert.equal(response.statusCode, 500);
    assert.deepEqual(response.body, { ok: false, error: 'Internal server error' });
  });
});