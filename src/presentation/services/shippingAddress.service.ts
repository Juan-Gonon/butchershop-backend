import { prisma } from '../../data/postgres/index.js';
import { CreateShippingAddressDto } from '../../domain/Dtos/shippingAddress/createShippingAddress.dto.js';
import { UpdateShippingAddressDto } from '../../domain/Dtos/shippingAddress/updateShippingAddress.dto.js';
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

  public async updateAddress(id_carniceria: number, addressId: number, dto: UpdateShippingAddressDto) {
    try {
      // Verificamos que la dirección exista y pertenezca estrictamente a este tenant
      const existingAddress = await prisma.direcciones_envio_carniceria.findFirst({
        where: {
          id: BigInt(addressId),
          id_carniceria: BigInt(id_carniceria)
        }
      });

      if (!existingAddress) {
        throw CustomError.notFound('La dirección de envío no existe o no pertenece a esta carnicería');
      }

      // Realizamos la actualización
      const updatedAddress = await prisma.direcciones_envio_carniceria.update({
        where: { id: BigInt(addressId) },
        data: {
          ...(dto.nombre_sector !== undefined && { nombre_sector: dto.nombre_sector }),
          ...(dto.costo_envio !== undefined && { costo_envio: dto.costo_envio }),
          ...(dto.activo !== undefined && { activo: dto.activo })
        }
      });

      return {
        id: updatedAddress.id.toString(),
        nombre_sector: updatedAddress.nombre_sector,
        costo_envio: updatedAddress.costo_envio.toString(),
        activo: updatedAddress.activo
      };

    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw CustomError.internalServer();
    }
  }

  public async deleteAddress(id_carniceria: number, addressId: number) {
    try {
      // Verificar que la dirección exista y pertenezca al tenant actual
      const existingAddress = await prisma.direcciones_envio_carniceria.findFirst({
        where: {
          id: BigInt(addressId),
          id_carniceria: BigInt(id_carniceria)
        }
      });

      if (!existingAddress) {
        throw CustomError.notFound('La dirección de envío no existe o no pertenece a esta carnicería');
      }

      // Realizamos la desactivación lógica (Soft Delete)
      const deactivatedAddress = await prisma.direcciones_envio_carniceria.update({
        where: { id: BigInt(addressId) },
        data: { activo: false }
      });

      return {
        message: 'Dirección de envío desactivada exitosamente',
        id: deactivatedAddress.id.toString(),
        activo: deactivatedAddress.activo
      };

    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw CustomError.internalServer();
    }
  }

}