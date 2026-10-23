import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../src/domain/interfaces/authenticatesRequest.interface.js';
import { PedidosController } from '../../src/presentation/features/pedidos/controller.js';
import type { PedidoService } from '../../src/presentation/services/pedidos.service.js';

const validUuid = '550e8400-e29b-41d4-a716-446655440000';

const invokeCancelController = async (
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
  const service = { cancelPedido: serviceMethod } as unknown as PedidoService;
  const controller = new PedidosController(service);

  await controller.cancelPedido(request as AuthenticatedRequest, response);
  return { statusCode, body };
};

describe('PedidosController.cancelPedido', () => {
  it('rechaza una solicitud sin usuario autenticado', async () => {
    let called = false;
    const response = await invokeCancelController(async () => {
      called = true;
      return {};
    }, { params: { uuid: validUuid }, body: { versionEsperada: 0 } });

    assert.equal(response.statusCode, 401);
    assert.equal(called, false);
  });

  it('valida UUID y body antes de llamar al servicio', async () => {
    let called = false;
    const invalidUuid = await invokeCancelController(async () => {
      called = true;
      return {};
    }, {
      user: { uuid: 'user-uuid', id_carniceria: 12, id_rol: 1 },
      params: { uuid: 'no-es-uuid' },
      body: { versionEsperada: 0 }
    } as Partial<AuthenticatedRequest>);
    const unexpectedBody = await invokeCancelController(async () => {
      called = true;
      return {};
    }, {
      user: { uuid: 'user-uuid', id_carniceria: 12, id_rol: 1 },
      params: { uuid: validUuid },
      body: { id_carniceria: 99 }
    } as Partial<AuthenticatedRequest>);

    assert.equal(invalidUuid.statusCode, 400);
    assert.equal(unexpectedBody.statusCode, 400);
    assert.equal(called, false);
  });

  it('pasa el tenant y actor autenticados al servicio', async () => {
    let callArgs: unknown[] | undefined;
    const response = await invokeCancelController(async (...args) => {
      callArgs = args;
      return { accepted: true };
    }, {
      user: { uuid: 'user-uuid', id_carniceria: 12, id_rol: 1 },
      params: { uuid: validUuid },
      body: { versionEsperada: 7 }
    } as Partial<AuthenticatedRequest>);

    assert.deepEqual(callArgs, [12, validUuid, 'user-uuid', 7]);
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, { ok: true, data: { accepted: true } });
  });
});
