import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ListClientsDto } from '../../src/domain/Dtos/clients/listClients.dto.js';
import { CreateClientDto } from '../../src/domain/Dtos/clients/createClient.dto.js';
import { UpdateClientDto } from '../../src/domain/Dtos/clients/updateClient.dto.js';

const uuid = '550e8400-e29b-41d4-a716-446655440000';

describe('Clients DTOs', () => {
  it('aplica defaults de listado y normaliza filtros', () => {
    const [defaultError, defaults] = ListClientsDto.create({});
    assert.equal(defaultError, undefined);
    assert.equal(defaults?.page, 1);
    assert.equal(defaults?.pageSize, 10);

    const [error, dto] = ListClientsDto.create({
      page: '2', pageSize: '25', nombre: '  Ana  ', telefono: '  555-1234  '
    });
    assert.equal(error, undefined);
    assert.equal(dto?.page, 2);
    assert.equal(dto?.pageSize, 25);
    assert.equal(dto?.nombre, 'Ana');
    assert.equal(dto?.telefono, '555-1234');
  });

  it('rechaza paginación y propiedades de tenant inválidas en listado', () => {
    assert.ok(ListClientsDto.create({ page: '0' })[0]);
    assert.ok(ListClientsDto.create({ pageSize: '101' })[0]);
    assert.ok(ListClientsDto.create({ id_carniceria: '99' })[0]);
  });

  it('normaliza teléfono y dirección vacíos a null y usa es_generico false por omisión', () => {
    const [error, dto] = CreateClientDto.create({ nombre: ' Ana ', telefono: '', direccion_defecto: '' });
    assert.equal(error, undefined);
    assert.equal(dto?.nombre, 'Ana');
    assert.equal(dto?.telefono, null);
    assert.equal(dto?.direccion_defecto, null);
    assert.equal(dto?.es_generico, false);
  });

  it('acepta de 7 a 15 dígitos con formato permitido y conserva es_generico explícito', () => {
    const [error, dto] = CreateClientDto.create({
      nombre: 'Ana', telefono: '+502 5555-1234', direccion_defecto: 'Zona 1', es_generico: true
    });
    assert.equal(error, undefined);
    assert.equal(dto?.telefono, '+502 5555-1234');
    assert.equal(dto?.es_generico, true);
  });

  it('rechaza teléfonos con texto o fuera del rango de dígitos y rechaza tenant en body', () => {
    const valid = { nombre: 'Ana' };
    assert.ok(CreateClientDto.create({ ...valid, telefono: '555-ABCD' })[0]);
    assert.ok(CreateClientDto.create({ ...valid, telefono: '123456' })[0]);
    assert.ok(CreateClientDto.create({ ...valid, telefono: '1234567890123456' })[0]);
    assert.ok(CreateClientDto.create({ ...valid, id_carniceria: 99 })[0]);
  });

  it('valida edición parcial y normaliza los campos de texto vacíos', () => {
    const [error, dto] = UpdateClientDto.create({
      uuid, telefono: '', direccion_defecto: '', es_generico: true
    });
    assert.equal(error, undefined);
    assert.equal(dto?.uuid, uuid);
    assert.equal(dto?.telefono, null);
    assert.equal(dto?.direccion_defecto, null);
    assert.equal(dto?.es_generico, true);

    assert.ok(UpdateClientDto.create({ uuid })[0]);
    assert.ok(UpdateClientDto.create({ uuid, nombre: 'Ana', id_carniceria: 99 })[0]);
  });
});
