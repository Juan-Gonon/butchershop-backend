import { CustomError } from '../../domain/errors/custom.error.js';
import { getPedidoCancellationDecision } from '../../domain/types/pedidoCancellationRules.js';
import { reconcilePedidoInventoryReturns } from '../../domain/types/pedidoInventoryReconciliation.js';
import { StatePedido } from '../../domain/types/statePedidos.enum.js';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';

export const cancelPedidoTransactional = async (
  client: PrismaClient,
  tenantNumber: number,
  orderUuid: string,
  actorUuid: string,
  expectedVersion: number
) => {
  const tenantId = BigInt(tenantNumber);

  return client.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT set_config('app.tenant_id', ${tenantId.toString()}, TRUE)`;

    const orderRows = await tx.$queryRaw<{
      id: bigint;
      estado_id: bigint;
      version: number;
    }[]>`
      SELECT p.id, p.id_estado AS estado_id, p.version
      FROM public.pedidos p
      WHERE p.uuid = ${orderUuid}::uuid AND p.id_carniceria = ${tenantId}
      FOR UPDATE OF p
    `;
    const order = orderRows[0];
    if (!order) throw CustomError.notFound('Pedido no encontrado');

    const actorRows = await tx.$queryRaw<{ id: bigint }[]>`
      SELECT id FROM public.usuarios
      WHERE uuid = ${actorUuid}::uuid AND id_carniceria = ${tenantId} AND activo = TRUE
    `;
    if (!actorRows[0]) throw CustomError.forbidden('El usuario no pertenece a esta carnicería');

    const decision = getPedidoCancellationDecision(Number(order.estado_id) as StatePedido);
    if (!decision.eligible) {
      if (decision.reason === 'already_cancelled') {
        throw CustomError.conflict('El pedido ya está cancelado');
      }
      throw CustomError.conflict('El estado actual del pedido no permite cancelarlo');
    }
    if (order.version !== expectedVersion) {
      throw CustomError.conflict('La versión del pedido cambió; vuelve a consultarlo');
    }

    const movementRows = await tx.$queryRaw<{
      id: string;
      id_carniceria: string;
      id_pedido: string;
      id_producto_carniceria: string;
      id_detalle_pedido: string | null;
      id_movimiento_origen: string | null;
      id_operacion_edicion: string | null;
      tipo: string;
      sentido: string;
      cantidad: string;
      motivo: string;
      referencia_operacion: string;
      clave_idempotencia: string;
      producto_tenant: string | null;
      operacion_pedido: string | null;
      operacion_tenant: string | null;
    }[]>`
      SELECT m.id::text AS id, m.id_carniceria::text AS id_carniceria,
        m.id_pedido::text AS id_pedido, m.id_producto_carniceria::text AS id_producto_carniceria,
        m.id_detalle_pedido::text AS id_detalle_pedido,
        m.id_movimiento_origen::text AS id_movimiento_origen,
        m.id_operacion_edicion::text AS id_operacion_edicion,
        m.tipo::text AS tipo, m.sentido::text AS sentido, m.cantidad::text AS cantidad,
        m.motivo, m.referencia_operacion, m.clave_idempotencia,
        pc.id_carniceria::text AS producto_tenant,
        oe.id_pedido::text AS operacion_pedido, oe.id_carniceria::text AS operacion_tenant
      FROM public.movimientos_inventario m
      LEFT JOIN public.productos_carniceria pc ON pc.id = m.id_producto_carniceria
      LEFT JOIN public.operaciones_edicion_pedido oe ON oe.id = m.id_operacion_edicion
      WHERE m.id_pedido = ${order.id} AND m.id_carniceria = ${tenantId}
      ORDER BY m.id
    `;

    const reconciliation = reconcilePedidoInventoryReturns(movementRows, {
      tenantId: tenantId.toString(),
      orderId: order.id.toString(),
      orderUuid
    });
    if (!reconciliation.safe) {
      throw CustomError.conflict('El historial de inventario no puede reconciliarse de forma segura');
    }

    const cancellationReference = `PEDIDO_CANCELACION:${orderUuid}`;
    for (const item of reconciliation.returns) {
      const stockUpdate = await tx.productos_carniceria.updateMany({
        where: {
          id: BigInt(item.id_producto_carniceria),
          id_carniceria: tenantId,
          stock_actual: { gte: 0 }
        },
        data: { stock_actual: { increment: new Prisma.Decimal(item.cantidad) } }
      });
      if (stockUpdate.count !== 1) {
        throw CustomError.conflict('No se pudo devolver el inventario de forma segura');
      }

      await tx.$executeRaw`
        INSERT INTO public.movimientos_inventario
          (id_carniceria, id_producto_carniceria, id_pedido, id_detalle_pedido,
           id_movimiento_origen, tipo, sentido, cantidad, motivo,
           referencia_operacion, clave_idempotencia)
        VALUES (${tenantId}, ${BigInt(item.id_producto_carniceria)}, ${order.id},
          (SELECT m.id_detalle_pedido FROM public.movimientos_inventario m
           WHERE m.id = ${BigInt(item.id_movimiento_origen)}),
          ${BigInt(item.id_movimiento_origen)},
          'DEVOLUCION'::"TipoMovimientoInventario", 'ENTRADA'::"SentidoMovimientoInventario",
          ${new Prisma.Decimal(item.cantidad)}, 'CANCELACION_PEDIDO', ${cancellationReference},
          ${`${cancellationReference}:DEVOLUCION:${item.id_movimiento_origen}`})
      `;
    }

    const orderUpdate = await tx.$queryRaw<{ version: number }[]>`
      UPDATE public.pedidos
      SET id_estado = ${BigInt(StatePedido.CANCELADO)}, version = version + 1
      WHERE id = ${order.id} AND id_carniceria = ${tenantId}
        AND id_estado = ${order.estado_id} AND version = ${expectedVersion}
      RETURNING version
    `;
    if (orderUpdate.length !== 1) {
      throw CustomError.conflict('El pedido cambió concurrentemente; vuelve a consultarlo');
    }

    return {
      uuid: orderUuid,
      estado: 'Cancelado',
      version: orderUpdate[0]!.version,
      devoluciones: reconciliation.returns.map((item) => ({
        id_producto_carniceria: item.id_producto_carniceria,
        cantidad: item.cantidad
      }))
    };
  });
};
