import { prisma } from '../../data/postgres/index.js';
import { CustomError } from '../../domain/errors/custom.error.js';

export class PreparationsService {

  public async getActivePreparations() {
    try {
      const preparations = await prisma.tipos_preparacion.findMany({
        where: {
          activo: true
        },
        orderBy: {
          id: 'asc'
        }
      });

      return preparations.map((p) => ({
        id: p.id.toString(),
        nombre: p.nombre,
        descripcion: p.descripcion
      }));

    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw CustomError.internalServer();
    }
  }

}