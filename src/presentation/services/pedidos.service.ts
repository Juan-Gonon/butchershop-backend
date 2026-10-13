import { prisma } from '../../data/postgres/index.js';
import { CustomError } from '../../domain/errors/custom.error.js';
import { VolumenPorUnidad } from '../../domain/interfaces/pedidos.interface.js';

export class PedidoService {

  public async getMetrics(uuid: string, id_carniceria: number, filtro: string){
    try {
      // fechas de inicio y fin basadas en el filtro
      const ahora = new Date();
      const fechaInicio = new Date();
      let fechaFin = null;

      if (filtro === 'ayer') {
        // Restamos 1 día de forma segura
        fechaInicio.setDate(ahora.getDate() - 1);
        fechaInicio.setHours(0, 0, 0, 0);
        
        fechaFin = new Date(fechaInicio);
        fechaFin.setHours(23, 59, 59, 999);
      } else {
        // Por defecto es 'hoy'
        fechaInicio.setHours(0, 0, 0, 0);
        
        fechaFin = new Date();
        fechaFin.setHours(23, 59, 59, 999);
      }

      const resultado = await prisma.$queryRaw<VolumenPorUnidad[]>`
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

      return {
        id_carniceria,
        filtro_aplicado: filtro,
        desde: fechaInicio,
        hasta: fechaFin,
        result: resultado
      };
      
    } catch (error) {
      if(error instanceof CustomError) throw error;
      
      CustomError.internalServer();
    }
  }

}