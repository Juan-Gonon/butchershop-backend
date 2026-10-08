import { prisma } from '../../data/postgres/index.js';
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
}