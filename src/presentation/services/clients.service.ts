import { prisma } from '../../data/postgres/index.js';
import { CustomError } from '../../domain/errors/custom.error.js';
import { ListClientsDto } from '../../domain/Dtos/clients/listClients.dto.js';
import { CreateClientDto } from '../../domain/Dtos/clients/createClient.dto.js';
import { UpdateClientDto } from '../../domain/Dtos/clients/updateClient.dto.js';

const serializeClient = (client: {
  id: bigint;
  uuid: string;
  nombre: string;
  telefono: string | null;
  direccion_defecto: string | null;
  es_generico: boolean;
  fecha_registro: Date;
}) => ({
  id: client.id.toString(),
  uuid: client.uuid,
  nombre: client.nombre,
  telefono: client.telefono,
  direccion_defecto: client.direccion_defecto,
  es_generico: client.es_generico,
  fecha_registro: client.fecha_registro.toISOString()
});

const hasPrismaCode = (error: unknown, code: string): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === code;

export class ClientsService {

  public async listar(idCarniceria: number, dto: ListClientsDto) {
    const where = {
      id_carniceria: BigInt(idCarniceria),
      ...(dto.nombre ? { nombre: { contains: dto.nombre, mode: 'insensitive' as const } } : {}),
      ...(dto.telefono ? { telefono: { contains: dto.telefono } } : {})
    };

    try {
      const [clientes, total] = await Promise.all([
        prisma.clientes.findMany({
          where,
          orderBy: [
            { es_generico: 'desc' },
            { nombre: 'asc' },
            { id: 'asc' }
          ],
          skip: (dto.page - 1) * dto.pageSize,
          take: dto.pageSize
        }),
        prisma.clientes.count({ where })
      ]);

      return {
        data: clientes.map(serializeClient),
        pagination: {
          page: dto.page,
          pageSize: dto.pageSize,
          total,
          totalPages: Math.ceil(total / dto.pageSize)
        },
        metrics: { total_clientes: total }
      };
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw CustomError.internalServer();
    }
  }

  public async crear(idCarniceria: number, dto: CreateClientDto) {
    try {
      const cliente = await prisma.clientes.create({
        data: {
          id_carniceria: BigInt(idCarniceria),
          nombre: dto.nombre,
          telefono: dto.telefono,
          direccion_defecto: dto.direccion_defecto,
          es_generico: dto.es_generico ?? false
        }
      });

      return serializeClient(cliente);
    } catch (error) {
      if (error instanceof CustomError) throw error;
      if (hasPrismaCode(error, 'P2002')) {
        throw CustomError.conflict('El teléfono ya se encuentra registrado para otro cliente en esta sucursal');
      }
      throw CustomError.internalServer();
    }
  }

  public async actualizar(idCarniceria: number, uuid: string, dto: UpdateClientDto) {
    try {
      const cliente = await prisma.clientes.update({
        where: {
          uuid,
          id_carniceria: BigInt(idCarniceria)
        },
        data: {
          ...(dto.nombre !== undefined ? { nombre: dto.nombre } : {}),
          ...(dto.telefono !== undefined ? { telefono: dto.telefono } : {}),
          ...(dto.direccion_defecto !== undefined ? { direccion_defecto: dto.direccion_defecto } : {}),
          ...(dto.es_generico !== undefined ? { es_generico: dto.es_generico } : {})
        }
      });

      return serializeClient(cliente);
    } catch (error) {
      if (error instanceof CustomError) throw error;
      if (hasPrismaCode(error, 'P2025')) {
        throw CustomError.notFound('El cliente no existe en tu tienda');
      }
      if (hasPrismaCode(error, 'P2002')) {
        throw CustomError.conflict('El teléfono ya se encuentra registrado para otro cliente en esta sucursal');
      }
      throw CustomError.internalServer();
    }
  }

  public async searchClients(id_carniceria: number, query: string) {
    try {
      const termino = query.trim();

      if (!termino) {
        const clienteDefault = await prisma.clientes.findFirst({
          where: {
            id_carniceria: BigInt(id_carniceria),
            es_generico: true 
          }
        });

        // Si por alguna razón no existiera el genérico, traemos los primeros clientes recientes
        const otrosClientes = await prisma.clientes.findMany({
          where: {
            id_carniceria: BigInt(id_carniceria),
            es_generico: false
          },
          take: 5,
          orderBy: { id: 'asc' }
        });

        const lista = clienteDefault ? [clienteDefault, ...otrosClientes] : otrosClientes;

        return lista.map((c) => ({
          id: c.id.toString(),
          uuid: c.uuid,
          nombre: c.nombre,
          telefono: c.telefono,
          direccion_defecto: c.direccion_defecto,
          es_generico: c.es_generico
        }));
      }

      // Si el cajero está escribiendo 
      const clients = await prisma.clientes.findMany({
        where: {
          id_carniceria: BigInt(id_carniceria),
          OR: [
            { nombre: { contains: termino, mode: 'insensitive' } },
            { telefono: { contains: termino, mode: 'insensitive' } }
          ]
        },
        take: 10, // Límite para autocompletado rápido
        orderBy: {
          es_generico: 'desc' // El genérico o las coincidencias exactas arriba
        }
      });

      return clients.map((c) => ({
        id: c.id.toString(),
        uuid: c.uuid,
        nombre: c.nombre,
        telefono: c.telefono,
        direccion_defecto: c.direccion_defecto,
        es_generico: c.es_generico
      }));

    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw CustomError.internalServer();
    }
  }

}