import { prisma } from '../../data/postgres/index.js';
import { CreateShippingAddressDto } from '../../domain/Dtos/shippingAddress/createShippingAddress.dto.js';
import { CustomError } from '../../domain/errors/custom.error.js';

export class ShippingAddressesService {

  public async getActiveShippingAddresses(id_carniceria: number) {
    try {
      const addresses = await prisma.direcciones_envio_carniceria.findMany({
        where: {
          id_carniceria: BigInt(id_carniceria),
          activo: true
        },
        orderBy: {
          nombre_sector: 'asc'
        }
      });

      return addresses.map((addr) => ({
        id: addr.id.toString(),
        nombre_sector: addr.nombre_sector,
        costo_envio: addr.costo_envio.toString()
      }));

    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw CustomError.internalServer();
    }
  }

  public async createAddress(id_carniceria: number, dto: CreateShippingAddressDto) {
    try {
      const newAddress = await prisma.direcciones_envio_carniceria.create({
        data: {
          id_carniceria: BigInt(id_carniceria),
          nombre_sector: dto.nombre_sector,
          costo_envio: dto.costo_envio,
          activo: dto.activo ?? true
        }
      });

      return {
        id: newAddress.id.toString(),
        nombre_sector: newAddress.nombre_sector,
        costo_envio: newAddress.costo_envio.toString(),
        activo: newAddress.activo
      };
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw CustomError.internalServer();
    }
  }

}