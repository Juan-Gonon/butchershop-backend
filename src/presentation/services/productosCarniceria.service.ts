import { prisma } from '../../data/postgres/index.js';
import { CustomError } from '../../domain/errors/custom.error.js';
import { ListProductosCarniceriaDto } from '../../domain/Dtos/productosCarniceria/getProductosCarniceria.dto.js';

export class ProductosCarniceriaService {
  public async listar(idCarniceria: number, dto: ListProductosCarniceriaDto) {
    const where = {
      id_carniceria: BigInt(idCarniceria),
      ...(dto.disponible !== undefined ? { disponible: dto.disponible } : {}),
      ...(dto.maneja_inventario !== undefined ? { maneja_inventario: dto.maneja_inventario } : {}),
      ...(dto.tipo_carne || dto.categoria ? {
        productos_catalogo: {
          categorias: {
            ...(dto.tipo_carne ? {
              tipos_carne: {
                nombre: { equals: dto.tipo_carne, mode: 'insensitive' as const }
              }
            } : {}),
            ...(dto.categoria ? {
              nombre: { equals: dto.categoria, mode: 'insensitive' as const }
            } : {})
          }
        }
      } : {})
    };

    try {
      const [productos, total, totalStockCritico] = await Promise.all([
        prisma.productos_carniceria.findMany({
          where,
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
          orderBy: [
            { productos_catalogo: { nombre: 'asc' } },
            { id: 'asc' }
          ],
          skip: (dto.page - 1) * dto.pageSize,
          take: dto.pageSize
        }),
        prisma.productos_carniceria.count({ where }),
        prisma.productos_carniceria.count({
          where: {
            ...where,
            maneja_inventario: true,
            stock_actual: { lt: dto.stock_critico }
          }
        })
      ]);

      return {
        data: productos.map((producto) => ({
          uuid: producto.uuid,
          precio: producto.precio.toString(),
          disponible: producto.disponible,
          maneja_inventario: producto.maneja_inventario,
          stock_actual: producto.stock_actual === null ? null : producto.stock_actual.toString(),
          producto_catalogo: {
            uuid: producto.productos_catalogo.uuid,
            nombre: producto.productos_catalogo.nombre,
            descripcion_general: producto.productos_catalogo.descripcion_general,
            imagen_url: producto.productos_catalogo.imagen_url,
            categoria: {
              id: producto.productos_catalogo.categorias.id.toString(),
              nombre: producto.productos_catalogo.categorias.nombre,
              tipo_carne: {
                id: producto.productos_catalogo.categorias.tipos_carne.id.toString(),
                nombre: producto.productos_catalogo.categorias.tipos_carne.nombre
              }
            }
          },
          unidad_venta: {
            id: producto.unidades_venta.id.toString(),
            nombre: producto.unidades_venta.nombre,
            abreviatura: producto.unidades_venta.abreviatura
          }
        })),
        pagination: {
          page: dto.page,
          pageSize: dto.pageSize,
          total,
          totalPages: Math.ceil(total / dto.pageSize)
        },
        metrics: {
          stock_critico_umbral: dto.stock_critico,
          total_productos_stock_critico: totalStockCritico
        }
      };
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw CustomError.internalServer();
    }
  }
}