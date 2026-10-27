import { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../data/postgres/index.js';
import { ReportDateRangeDto } from '../../domain/Dtos/reports/reportDateRange.dto.js';
import { CustomError } from '../../domain/errors/custom.error.js';

interface VolumeRow {
  unidad_venta: string;
  abreviatura: string;
  volumen_vendido: string;
}

interface StarProductRow {
  id_producto_catalogo: bigint;
  producto: string;
  categoria: string;
  tipo_carne: string;
  unidad_venta: string;
  abreviatura: string;
  ingreso: string;
  cantidad: string;
}

export class ReportsService {
  public async getSummary(idCarniceria: number, dto: ReportDateRangeDto) {
    try {
      const tenantId = BigInt(idCarniceria);
      const desde = new Date(`${dto.desde}T00:00:00.000`);
      const hasta = new Date(`${dto.hasta}T23:59:59.999`);

      const estadoEntregado = await prisma.estados_pedido.findUnique({
        where: { nombre: 'Entregado' },
        select: { id: true }
      });
      if (!estadoEntregado) {
        throw CustomError.internalServer('El estado Entregado no está configurado');
      }

      const filtroPedidos: Prisma.pedidosWhereInput = {
        id_carniceria: tenantId,
        id_estado: estadoEntregado.id,
        fecha: { gte: desde, lte: hasta }
      };

      const [totales, envios, volumen, productoEstrella] = await Promise.all([
        prisma.pedidos.aggregate({
          where: filtroPedidos,
          _sum: { total: true },
          _count: { id: true }
        }),
        prisma.pedidos.aggregate({
          where: {
            ...filtroPedidos,
            tipos_entrega: {
              is: { nombre: { contains: 'domicilio', mode: 'insensitive' } }
            }
          },
          _sum: { costo_envio: true }
        }),
        prisma.$queryRaw<VolumeRow[]>`
          SELECT u.nombre AS unidad_venta,
                 u.abreviatura,
                 COALESCE(SUM(dp.cantidad), 0)::text AS volumen_vendido
          FROM public.pedidos p
          JOIN public.detalle_pedidos dp ON dp.id_pedido = p.id AND dp.eliminado_en IS NULL
          JOIN public.productos_carniceria pc ON pc.id = dp.id_producto_carniceria
          JOIN public.unidades_venta u ON u.id = pc.id_unidad_venta
          WHERE p.id_carniceria = ${tenantId}
            AND p.id_estado = ${estadoEntregado.id}
            AND p.fecha >= ${desde}
            AND p.fecha <= ${hasta}
          GROUP BY u.id, u.nombre, u.abreviatura
          ORDER BY u.nombre ASC
        `,
        prisma.$queryRaw<StarProductRow[]>`
          SELECT cat.id AS id_producto_catalogo,
                 cat.nombre AS producto,
                 c.nombre AS categoria,
                 tc.nombre AS tipo_carne,
                 u.nombre AS unidad_venta,
                 u.abreviatura,
                 SUM(dp.subtotal)::text AS ingreso,
                 SUM(dp.cantidad)::text AS cantidad
          FROM public.pedidos p
          JOIN public.detalle_pedidos dp ON dp.id_pedido = p.id AND dp.eliminado_en IS NULL
          JOIN public.productos_carniceria pc ON pc.id = dp.id_producto_carniceria
          JOIN public.unidades_venta u ON u.id = pc.id_unidad_venta
          JOIN public.productos_catalogo cat ON cat.id = pc.id_producto_catalogo
          JOIN public.categorias c ON c.id = cat.id_categoria
          JOIN public.tipos_carne tc ON tc.id = c.id_tipo_carne
          WHERE p.id_carniceria = ${tenantId}
            AND p.id_estado = ${estadoEntregado.id}
            AND p.fecha >= ${desde}
            AND p.fecha <= ${hasta}
          GROUP BY cat.id, cat.nombre, c.id, c.nombre, tc.id, tc.nombre, u.id, u.nombre, u.abreviatura
          ORDER BY SUM(dp.subtotal) DESC, cat.nombre ASC
          LIMIT 1
        `
      ]);

      const totalVendido = totales._sum.total ?? new Prisma.Decimal(0);
      const pedidosEntregados = totales._count.id;
      const ticketPromedio = pedidosEntregados > 0
        ? totalVendido.div(pedidosEntregados).toFixed(2)
        : '0.00';
      const estrella = productoEstrella[0];

      return {
        total_vendido: totalVendido.toFixed(2),
        pedidos_entregados: pedidosEntregados.toString(),
        ticket_promedio: ticketPromedio,
        total_envios: (envios._sum.costo_envio ?? new Prisma.Decimal(0)).toFixed(2),
        volumen_vendido: volumen.map((row) => ({
          unidad_venta: row.unidad_venta,
          abreviatura: row.abreviatura,
          cantidad: new Prisma.Decimal(row.volumen_vendido).toString()
        })),
        producto_estrella: estrella ? {
          id_producto_catalogo: estrella.id_producto_catalogo.toString(),
          producto: estrella.producto,
          categoria: estrella.categoria,
          tipo_carne: estrella.tipo_carne,
          unidad_venta: estrella.unidad_venta,
          abreviatura: estrella.abreviatura,
          ingreso: new Prisma.Decimal(estrella.ingreso).toFixed(2),
          cantidad: new Prisma.Decimal(estrella.cantidad).toString()
        } : null
      };
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw CustomError.internalServer();
    }
  }
}
