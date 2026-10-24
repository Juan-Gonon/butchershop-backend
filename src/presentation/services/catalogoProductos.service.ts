import { prisma } from '../../data/postgres/index.js';
import { CustomError } from '../../domain/errors/custom.error.js';
import { ListCatalogoProductosDto } from '../../domain/Dtos/catalogoProductos/listCatalogoProductos.dto.js';

export class CatalogoProductosService {
  public async listar(dto: ListCatalogoProductosDto) {
    const where = dto.tipo_carne
      ? {
        categorias: {
          tipos_carne: {
            nombre: { equals: dto.tipo_carne, mode: 'insensitive' as const }
          }
        }
      }
      : {};

    try {
      const [productos, total] = await Promise.all([
        prisma.productos_catalogo.findMany({
          where,
          include: {
            categorias: {
              include: {
                tipos_carne: true
              }
            },
            unidades_venta: true
          },
          orderBy: { nombre: 'asc' },
          ...(dto.todos ? {} : {
            skip: (dto.page - 1) * dto.pageSize,
            take: dto.pageSize
          })
        }),
        prisma.productos_catalogo.count({ where })
      ]);

      return {
        data: productos.map((producto) => ({
          uuid: producto.uuid,
          nombre: producto.nombre,
          descripcion_general: producto.descripcion_general,
          imagen_url: producto.imagen_url,
          categoria: {
            id: producto.categorias.id.toString(),
            nombre: producto.categorias.nombre,
            tipo_carne: {
              id: producto.categorias.tipos_carne.id.toString(),
              nombre: producto.categorias.tipos_carne.nombre
            }
          },
          unidad_venta_defecto: {
            id: producto.unidades_venta.id.toString(),
            nombre: producto.unidades_venta.nombre,
            abreviatura: producto.unidades_venta.abreviatura
          }
        })),
        pagination: dto.todos
          ? null
          : {
            page: dto.page,
            pageSize: dto.pageSize,
            total,
            totalPages: Math.ceil(total / dto.pageSize)
          }
      };
    } catch {
      throw CustomError.internalServer();
    }
  }
}
