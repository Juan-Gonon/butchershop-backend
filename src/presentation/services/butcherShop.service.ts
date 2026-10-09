import { prisma } from '../../data/postgres/index.js';
import { CreateButcherShop } from '../../domain/Dtos/butcherShop/createButcherShop.dto.js';
import { UpdateButcherShop } from '../../domain/Dtos/butcherShop/updateButcherShop.dto.js';
import { CustomError } from '../../domain/errors/custom.error.js';

export class ButcherShopService{
  // constructor(){}

  public async getAllBucherShop(){
    try {

      const butcherShop = await prisma.carnicerias.findMany({
        select: {
          uuid: true, 
          nombre: true,
          telefono_whatsapp: true,
          direccion: true,
          activo: true,
          fecha_creacion: true,
          usuarios: {
            select: {
              uuid: true, 
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

      throw CustomError.internalServer();
    }

  }

  public async findByIdButcherShop(uuid: string){
    return await prisma.carnicerias.findUnique({
      where: { uuid }
    });
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
          direccion: direccion || null,
          activo: true
        }
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const {id, ...carniceriaEntity} = newCarniceria;

      return carniceriaEntity;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw CustomError.internalServer();
    }
  }

  public async updateButcherShop(updateDto: UpdateButcherShop) {
    const { id: uuid, ...dataToUpdate } = updateDto;

    try {
      // Verificar si existe la carnicería
      const existCarniceria = await this.findByIdButcherShop(uuid);

      if (!existCarniceria) {
        throw CustomError.notFound(`Carnicería con ID ${uuid} no encontrada`);
      }

      // Si intenta actualizar el nombre, verificar que no duplique a otra
      if (dataToUpdate.nombre) {
        const duplicate = await prisma.carnicerias.findFirst({
          where: {
            nombre: { equals: dataToUpdate.nombre, mode: 'insensitive' },
            NOT: { uuid }
          }
        });

        if (duplicate) {
          throw CustomError.badRequest(`Ya existe otra carnicería con el nombre '${dataToUpdate.nombre}'`);
        }
      }

      // 3. Actualizar registro en la BD
      const updatedCarniceria = await prisma.carnicerias.update({
        where: { uuid },
        data: {
          ...dataToUpdate
        }
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...carniceriaEntity } = updatedCarniceria;

      return carniceriaEntity;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw CustomError.internalServer();
    }
  }
}