import assert from 'node:assert/strict';
import { describe, it, type TestContext } from 'node:test';
import { prisma } from '../../src/data/postgres/index.js';
import { CustomError } from '../../src/domain/errors/custom.error.js';
import { ListClientsDto } from '../../src/domain/Dtos/clients/listClients.dto.js';
import { CreateClientDto } from '../../src/domain/Dtos/clients/createClient.dto.js';
import { UpdateClientDto } from '../../src/domain/Dtos/clients/updateClient.dto.js';
import { ClientsService } from '../../src/presentation/services/clients.service.js';

interface ClientsDelegate {
  findMany(args: Record<string, unknown>): Promise<unknown[]>;
  count(args: Record<string, unknown>): Promise<number>;
  create(args: Record<string, unknown>): Promise<unknown>;
  update(args: Record<string, unknown>): Promise<unknown>;
}

const clients = prisma.clientes as unknown as ClientsDelegate;
const service = new ClientsService();
const clientUuid = '550e8400-e29b-41d4-a716-446655440000';

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

const clientRecord = (overrides: Record<string, unknown> = {}) => ({
  id: 7n,
  uuid: clientUuid,
  nombre: 'Ana Pérez',
  telefono: '5555-1234',
  direccion_defecto: 'Zona 1',
  es_generico: false,
  fecha_registro: new Date('2026-01-15T12:00:00.000Z'),
  ...overrides
});

const makeDto = <T>(create: (value: unknown) => [string?, T?], value: unknown): T => {
  const [error, dto] = create(value);
  assert.equal(error, undefined);
  return dto!;
};

const makeListDto = (value: unknown = {}) => makeDto(ListClientsDto.create, value);
const makeCreateDto = (value: unknown = { nombre: 'Ana' }) => makeDto(CreateClientDto.create, value);
const makeUpdateDto = (value: unknown = { uuid: clientUuid, nombre: 'Ana María' }) =>
  makeDto(UpdateClientDto.create, value);

const hasStatus = (statusCode: number, message?: string) => (error: unknown) =>
  error instanceof CustomError
  && error.statusCode === statusCode
  && (message === undefined || error.message === message);

describe('ClientsService.listar', () => {
  it('aísla por tenant, aplica filtros, orden estable, paginación y métricas', async (t) => {
    let findArgs: Record<string, unknown> = {};
    let countArgs: Record<string, unknown> = {};
    stubMethod(t, clients, 'findMany', async (args: Record<string, unknown>) => {
      findArgs = args;
      return [clientRecord()];
    });
    stubMethod(t, clients, 'count', async (args: Record<string, unknown>) => {
      countArgs = args;
      return 11;
    });

    const result = await service.listar(42, makeListDto({
      page: '2', pageSize: '5', nombre: 'ana', telefono: '555'
    }));

    assert.deepEqual(findArgs.where, {
      id_carniceria: 42n,
      nombre: { contains: 'ana', mode: 'insensitive' },
      telefono: { contains: '555' }
    });
    assert.deepEqual(countArgs, { where: findArgs.where });
    assert.deepEqual(findArgs.orderBy, [
      { es_generico: 'desc' }, { nombre: 'asc' }, { id: 'asc' }
    ]);
    assert.equal(findArgs.skip, 5);
    assert.equal(findArgs.take, 5);
    assert.deepEqual(result.pagination, { page: 2, pageSize: 5, total: 11, totalPages: 3 });
    assert.deepEqual(result.metrics, { total_clientes: 11 });
    assert.equal(result.data[0]?.id, '7');
    assert.doesNotThrow(() => JSON.stringify(result));
  });
});

describe('ClientsService.crear', () => {
  it('asigna el tenant del argumento, persiste campos del DTO y devuelve genérico por omisión', async (t) => {
    let createArgs: Record<string, unknown> = {};
    stubMethod(t, clients, 'create', async (args: Record<string, unknown>) => {
      createArgs = args;
      return clientRecord({ telefono: null, direccion_defecto: null });
    });

    const result = await service.crear(42, makeCreateDto({
      nombre: 'Ana', telefono: '', direccion_defecto: ''
    }));

    assert.deepEqual(createArgs.data, {
      id_carniceria: 42n,
      nombre: 'Ana',
      telefono: null,
      direccion_defecto: null,
      es_generico: false
    });
    assert.equal(result.id, '7');
    assert.equal(result.es_generico, false);
  });

  it('persiste el valor explícito de es_generico', async (t) => {
    let createArgs: Record<string, unknown> = {};
    stubMethod(t, clients, 'create', async (args: Record<string, unknown>) => {
      createArgs = args;
      return clientRecord({ es_generico: true });
    });

    await service.crear(42, makeCreateDto({ nombre: 'Genérico', es_generico: true }));
    assert.equal((createArgs.data as Record<string, unknown>).es_generico, true);
  });

  it('traduce P2002 a 409 Conflict', async (t) => {
    stubMethod(t, clients, 'create', async () => {
      throw Object.assign(new Error('unique'), { code: 'P2002' });
    });
    await assert.rejects(
      service.crear(42, makeCreateDto()),
      hasStatus(409, 'El teléfono ya se encuentra registrado para otro cliente en esta sucursal')
    );
  });
});

describe('ClientsService.actualizar', () => {
  it('actualiza con UUID y tenant y escribe solo los campos enviados', async (t) => {
    let updateArgs: Record<string, unknown> = {};
    stubMethod(t, clients, 'update', async (args: Record<string, unknown>) => {
      updateArgs = args;
      return clientRecord({ nombre: 'Ana María', telefono: null, direccion_defecto: null, es_generico: true });
    });

    const result = await service.actualizar(42, clientUuid, makeUpdateDto({
      uuid: clientUuid, nombre: 'Ana María', telefono: '', direccion_defecto: '', es_generico: true
    }));

    assert.deepEqual(updateArgs.where, { uuid: clientUuid, id_carniceria: 42n });
    assert.deepEqual(updateArgs.data, {
      nombre: 'Ana María', telefono: null, direccion_defecto: null, es_generico: true
    });
    assert.equal(result.id, '7');
    assert.equal(result.es_generico, true);
    assert.doesNotThrow(() => JSON.stringify(result));
  });

  it('traduce P2025 a 404 Not Found para cliente ausente o fuera del tenant', async (t) => {
    let updateArgs: Record<string, unknown> = {};
    stubMethod(t, clients, 'update', async (args: Record<string, unknown>) => {
      updateArgs = args;
      throw Object.assign(new Error('missing'), { code: 'P2025' });
    });

    await assert.rejects(
      service.actualizar(42, clientUuid, makeUpdateDto()),
      hasStatus(404, 'El cliente no existe en tu tienda')
    );
    assert.deepEqual(updateArgs.where, { uuid: clientUuid, id_carniceria: 42n });
  });

  it('traduce teléfono duplicado a 409 Conflict', async (t) => {
    stubMethod(t, clients, 'update', async () => {
      throw Object.assign(new Error('unique'), { code: 'P2002' });
    });
    await assert.rejects(
      service.actualizar(42, clientUuid, makeUpdateDto({ uuid: clientUuid, telefono: '5555-9999' })),
      hasStatus(409, 'El teléfono ya se encuentra registrado para otro cliente en esta sucursal')
    );
  });
});
