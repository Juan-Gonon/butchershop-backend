import { prisma } from '../../data/postgres/index.js';
import { CustomError } from '../../domain/errors/custom.error.js';

export class ProductsService {

  public async getAllProducts(id_carniceria: number) {
    try {
      const products = await prisma.productos_carniceria.findMany({
        where: {
          id_carniceria: BigInt(id_carniceria),
          disponible: true
        },
        include: {
          productos_catalogo: {
            include: {
              categorias: {
                include: {
                  tipos_carne: true
                }
              }
            }
          },
          unidades_venta: true
        },
        orderBy: {
          id: 'asc'
        }
      });

      return products.map((p) => ({
        uuid: p.uuid,
        precio: p.precio.toString(),
        disponible: p.disponible,
        maneja_inventario: p.maneja_inventario,
        stock_actual: p.stock_actual ? p.stock_actual.toString() : null,
        nombre_producto: p.productos_catalogo?.nombre || 'Sin nombre',
        imagen_url: p.productos_catalogo?.imagen_url || null, 
        tipo_carne: p.productos_catalogo?.categorias?.tipos_carne?.nombre || 'General',
        tipo_carne_id: p.productos_catalogo?.categorias?.tipos_carne?.id.toString() || '',
        unidad_venta: p.unidades_venta?.abreviatura || 'unid'
      }));

    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw CustomError.internalServer();
    }
  }
}