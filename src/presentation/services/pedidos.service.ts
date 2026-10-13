import { prisma } from '../../data/postgres/index.js';
import { CustomError } from '../../domain/errors/custom.error.js';
import { VolumenPorUnidad } from '../../domain/interfaces/pedidos.interface.js';

export class PedidoService {

  private calculateDate(filtro: string) {

    const filtroLimpio = ['hoy', 'ayer'].includes(filtro) ? filtro : 'hoy';

    const ahora = new Date();
    const fechaInicio = new Date();
    let fechaFin: Date;

    if (filtroLimpio === 'ayer') {
      fechaInicio.setDate(ahora.getDate() - 1);
      fechaInicio.setHours(0, 0, 0, 0);
        
      fechaFin = new Date(fechaInicio);
      fechaFin.setHours(23, 59, 59, 999);
    } else {
      fechaInicio.setHours(0, 0, 0, 0);
        
      fechaFin = new Date();
      fechaFin.setHours(23, 59, 59, 999);
    }

    return {
      fechaInicio,
      fechaFin
    };
  }

  private async getVolumenDesp(fechaInicio:Date, fechaFin:Date, id_carniceria:number){
    return await prisma.$queryRaw<VolumenPorUnidad[]>`
        SELECT 
            u.nombre AS unidad_venta,
            u.abreviatura,
            SUM(dp.cantidad) AS total_volumen_o_cantidad
        FROM pedidos p
        INNER JOIN detalle_pedidos dp ON p.id = dp.id_pedido
        INNER JOIN productos_carniceria pc ON dp.id_producto_carniceria = pc.id
        INNER JOIN unidades_venta u ON pc.id_unidad_venta = u.id
        WHERE p.id_carniceria = ${id_carniceria}
          AND p.id_estado = 5
          AND p.fecha >= ${fechaInicio}
          AND p.fecha <= ${fechaFin}
        GROUP BY u.id, u.nombre, u.abreviatura;
      `;

  }

  private async getTotalBilling(fechaInicio:Date, fechaFin:Date, id_carniceria:number){
    const resultado = await prisma.pedidos.aggregate({
      _sum: {
        total: true // Suma el campo total de los pedidos
      },
      where: {
        id_carniceria: id_carniceria,
        id_estado: 5, // Entregado
        fecha: {
          gte: fechaInicio,
          lte: fechaFin
        }
      }
    });

    return resultado._sum.total || 0;
  }

  private async getQuantityPreparation(fechaInicio:Date, fechaFin:Date, id_carniceria:number){
    const resultado = await prisma.pedidos.aggregate({
      _count: {
        id: true
      },
      where: {
        id_carniceria: id_carniceria,
        id_estado: 3,
        fecha: {
          gte: fechaInicio,
          lte: fechaFin
        }
      }
    });

    return resultado._count.id || 0;
  }

  public async getMetrics(uuid: string, id_carniceria: number, filtro: string){
    try {

      const {fechaInicio, fechaFin } = this.calculateDate(filtro);

      const [volume, total, quantity ] = await Promise.all([
        this.getVolumenDesp(fechaInicio, fechaFin, id_carniceria),
        this.getTotalBilling(fechaInicio, fechaFin, id_carniceria),
        this.getQuantityPreparation(fechaInicio, fechaFin, id_carniceria)
      ]);

      return {
        id_carniceria,
        filtro_aplicado: filtro,
        desde: fechaInicio,
        hasta: fechaFin,
        volume,
        total,
        quantity
      };
      
    } catch (error) {
      if(error instanceof CustomError) throw error;
      
      CustomError.internalServer();
    }
  }

}