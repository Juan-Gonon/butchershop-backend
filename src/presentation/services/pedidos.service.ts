import { prisma } from '../../data/postgres/index.js';
import { CustomError } from '../../domain/errors/custom.error.js';
import { VolumenPorTipoCarne, VolumenPorUnidad } from '../../domain/interfaces/pedidos.interface.js';
import { StatePedido } from '../../domain/types/statePedidos.enum.js';

export class PedidoService {

  private calculateDateRange(periodo: string) {
    const periodoLimpio = ['hoy', 'ayer', 'semana', 'mes'].includes(periodo) ? periodo : 'hoy';

    const ahora = new Date();
    const fechaInicio = new Date();
    let fechaFin = new Date();

    fechaFin.setHours(23, 59, 59, 999); // El fin siempre es el final del día actual

    if (periodoLimpio === 'ayer') {
      fechaInicio.setDate(ahora.getDate() - 1);
      fechaInicio.setHours(0, 0, 0, 0);
      
      fechaFin = new Date(fechaInicio);
      fechaFin.setHours(23, 59, 59, 999);
    } else if (periodoLimpio === 'semana') {
      // Últimos 7 días incluyendo hoy
      fechaInicio.setDate(ahora.getDate() - 6);
      fechaInicio.setHours(0, 0, 0, 0);
    } else if (periodoLimpio === 'mes') {
      // Primer día del mes actual o últimos 30 días (aquí usamos el primer día del mes actual)
      fechaInicio.setDate(1);
      fechaInicio.setHours(0, 0, 0, 0);
    } else {
      // Por defecto 'hoy'
      fechaInicio.setHours(0, 0, 0, 0);
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
          AND p.id_estado = ${StatePedido.ENTREGADO}
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
        id_estado: StatePedido.ENTREGADO, // Entregado
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
        id_estado: StatePedido.EN_PREPARACION,
        fecha: {
          gte: fechaInicio,
          lte: fechaFin
        }
      }
    });

    return resultado._count.id || 0;
  }

  private async getQuantityConfirmed(fechaInicio:Date, fechaFin:Date, id_carniceria:number){
    const resultado = await prisma.pedidos.aggregate({
      _count: {
        id: true
      },
      where: {
        id_carniceria: id_carniceria,
        id_estado: StatePedido.CONFIRMADO,
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

      const {fechaInicio, fechaFin } = this.calculateDateRange(filtro);

      const [volume, total, quantityPreparation, quantityConfirmed ] = await Promise.all([
        this.getVolumenDesp(fechaInicio, fechaFin, id_carniceria),
        this.getTotalBilling(fechaInicio, fechaFin, id_carniceria),
        this.getQuantityPreparation(fechaInicio, fechaFin, id_carniceria),
        this.getQuantityConfirmed(fechaInicio, fechaFin, id_carniceria)
      ]);

      return {
        id_carniceria,
        filtro_aplicado: filtro,
        desde: fechaInicio,
        hasta: fechaFin,
        volume,
        total,
        quantityPreparation,
        quantityConfirmed
      };
      
    } catch (error) {
      if(error instanceof CustomError) throw error;
      
      CustomError.internalServer();
    }
  }
  public async getVolumenDespachoPorTipoCarne(id_carniceria: number, periodo: string, unidad: string) {
    try {
      const { fechaInicio, fechaFin } = this.calculateDateRange(periodo);

      // Ejecutar consulta SQL agrupada por Tipo de Carne
      const resultado = await prisma.$queryRaw<VolumenPorTipoCarne[]>`
        SELECT 
            tc.id AS tipo_carne_id,
            tc.nombre AS tipo_carne_nombre,
            SUM(dp.cantidad) AS total_libras
        FROM pedidos p
        INNER JOIN detalle_pedidos dp ON p.id = dp.id_pedido
        INNER JOIN productos_carniceria pc ON dp.id_producto_carniceria = pc.id
        INNER JOIN productos_catalogo cat ON pc.id_producto_catalogo = cat.id
        INNER JOIN categorias c ON cat.id_categoria = c.id
        INNER JOIN tipos_carne tc ON c.id_tipo_carne = tc.id
        WHERE p.id_carniceria = ${id_carniceria}
          AND p.id_estado = ${StatePedido.ENTREGADO}
          AND p.fecha >= ${fechaInicio}
          AND p.fecha <= ${fechaFin}
        GROUP BY tc.id, tc.nombre;
      `;

      // Calcular el volumen global para sacar los porcentajes
      let volumenGlobal = 0;
      const datosProcesados = resultado.map(item => {
        let cantidad = Number(item.total_libras) || 0;
        
        // libras a kg (1 kg = 2.20462 lb)
        if (unidad === 'kg') {
          cantidad = cantidad / 2.20462;
        }

        volumenGlobal += cantidad;
        return {
          tipo_carne_id: item.tipo_carne_id,
          tipo_carne_nombre: item.tipo_carne_nombre,
          cantidad: Number(cantidad.toFixed(2))
        };
      });

      // Agregar el porcentaje exacto a cada tipo de carne para la barra de progreso
      const desgloseConPorcentaje = datosProcesados.map(item => {
        const porcentaje = volumenGlobal > 0 ? (item.cantidad / volumenGlobal) * 100 : 0;
        return {
          ...item,
          porcentaje: Number(porcentaje.toFixed(1)) // Ej. 75.5%
        };
      });

      return {
        id_carniceria,
        periodo_aplicado: periodo,
        unidad_medida: unidad,
        desde: fechaInicio,
        hasta: fechaFin,
        volumen_total_general: Number(volumenGlobal.toFixed(2)),
        desglose: desgloseConPorcentaje
      };

    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw CustomError.internalServer();
    }
  }

}