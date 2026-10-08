import { prisma } from '../../data/postgres/index.js';
import { CreateButcherShop } from '../../domain/Dtos/butcherShop/createButcherShop.dto.js';
import { CustomError } from '../../domain/errors/custom.error.js';

export class ButcherShopService{
  // constructor(){}

  public async getAllBucherShop(){
    try {

      const butcherShop = await prisma.carnicerias.findMany({
        include: {
          usuarios: {
            select: {
              id: true,
              nombre: true,
              usuario: true,
              id_rol: true
            }
          }
        }
      });

      return butcherShop;
      
    } catch (error) {
      if(error instanceof CustomError) throw error;

      CustomError.internalServer();
    }

  }

  public async createButcherShop(createDto: CreateButcherShop) {
    const { nombre, telefono_whatsapp, direccion } = createDto;

    try {
      // Validar que no exista otra carnicería con el mismo nombre
      const existCarniceria = await prisma.carnicerias.findFirst({
        where: { nombre: { equals: nombre, mode: 'insensitive' } }
      });

      if (existCarniceria) {
        throw CustomError.badRequest(`Ya existe una carnicería registrada con el nombre '${nombre}'`);
      }

      // Crear la carnicería
      const newCarniceria = await prisma.carnicerias.create({
        data: {
          nombre,
          telefono_whatsapp,
          direccion,
          activo: true
        }
      });

      return newCarniceria;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw CustomError.internalServer();
    }
  }
}