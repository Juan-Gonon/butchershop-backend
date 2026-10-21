import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Response } from 'express';
import { CustomError } from '../../src/domain/errors/custom.error.js';
import type { AuthenticatedRequest } from '../../src/domain/interfaces/authenticatesRequest.interface.js';
import { PedidosController } from '../../src/presentation/features/pedidos/controller.js';
import type { PedidoService } from '../../src/presentation/services/pedidos.service.js';

const validBody = {
  versionEsperada: 0,
  detalles: [{ id_producto_carniceria: '10', cantidad: 1 }]
};

const invokeController = async (
  serviceMethod: (...args: unknown[]) => Promise<never>,
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
  const service = { updatePedidoDetails: serviceMethod } as unknown as PedidoService;
  const controller = new PedidosController(service);

  await controller.updatePedidoDetails(request as AuthenticatedRequest, response);
  return { statusCode, body };
};

describe('PedidosController.updatePedidoDetails', () => {
  it('rechaza solicitudes sin usuario autenticado', async () => {
    let called = false;
    const response = await invokeController(async () => {
      called = true;
      throw new Error('No debe invocarse');
    }, { params: { uuid: '550e8400-e29b-41d4-a716-446655440000' }, body: validBody });

    assert.equal(response.statusCode, 401);
    assert.equal(called, false);
  });

  it('rechaza UUID inválido y no invoca el servicio', async () => {
    let called = false;
    const response = await invokeController(async () => {
      called = true;
      throw new Error('No debe invocarse');
    }, {
      user: { uuid: 'user-uuid', id_carniceria: 12, id_rol: 1 },
      params: { uuid: 'invalid' },
      body: validBody
    } as Partial<AuthenticatedRequest>);

    assert.equal(response.statusCode, 400);
    assert.equal(called, false);
  });

  it('rechaza cuerpo inválido y propiedades desconocidas', async () => {
    let called = false;
    const response = await invokeController(async () => {
      called = true;
      throw new Error('No debe invocarse');
    }, {
      user: { uuid: 'user-uuid', id_carniceria: 12, id_rol: 1 },
      params: { uuid: '550e8400-e29b-41d4-a716-446655440000' },
      body: { ...validBody, id_carniceria: 99 }
    } as Partial<AuthenticatedRequest>);

    assert.equal(response.statusCode, 400);
    assert.equal(called, false);
  });

  it('pasa UUID, tenant autenticado y DTO validado al servicio; responde 501 mientras no haya implementación', async () => {
    let callArgs: unknown[] | undefined;
    const response = await invokeController(async (...args) => {
      callArgs = args;
      throw CustomError.notImplemented('Pendiente');
    }, {
      user: { uuid: 'user-uuid', id_carniceria: 12, id_rol: 1 },
      params: { uuid: '550e8400-e29b-41d4-a716-446655440000' },
      body: validBody
    } as Partial<AuthenticatedRequest>);

    assert.equal(response.statusCode, 501);
    assert.deepEqual(callArgs?.slice(0, 2), [12, '550e8400-e29b-41d4-a716-446655440000']);
    assert.equal((callArgs?.[2] as { versionEsperada: number }).versionEsperada, 0);
  });
});
