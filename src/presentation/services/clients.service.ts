import { prisma } from '../../data/postgres/index.js';
import { CustomError } from '../../domain/errors/custom.error.js';

export class ClientsService {

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