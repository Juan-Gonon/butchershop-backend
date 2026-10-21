import { createHash } from 'node:crypto';
import { CustomError } from '../../domain/errors/custom.error.js';
import type { UpdatePedidoDetailsDto, UpdatePedidoDetailInput } from '../../domain/Dtos/pedidos/updatePedidoDetails.dto.js';
import { Prisma } from '../../generated/prisma/client.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { normalizePedidoObservations } from '../../domain/types/pedidoObservations.js';

type DbExecutor = Pick<Prisma.TransactionClient, '$queryRaw' | '$executeRaw'>;
interface DetailRow {
  id: bigint; id_producto_carniceria: bigint; id_tipo_preparacion: bigint | null;
  cantidad: string; precio_unitario: string; subtotal: string; observaciones: string | null;
  maneja_inventario_en_base: boolean | null; eliminado_en: Date | null;
}
interface MovementRow {
  id: bigint; id_carniceria: bigint; id_pedido: bigint; id_producto_carniceria: bigint; id_detalle_pedido: bigint | null;
  id_movimiento_origen: bigint | null; id_operacion_edicion: bigint | null;
  tipo: string; sentido: string; cantidad: string; motivo: string;
  referencia_operacion: string; clave_idempotencia: string;
  producto_tenant: bigint | null; operacion_pedido: bigint | null;
  operacion_tenant: bigint | null;
}
export interface RequestedGroup {
  detailIds: string[]; productId: bigint; preparationId: bigint | null;
  quantity: Prisma.Decimal; observations: string | null;
}
interface PlannedLine {
  group: RequestedGroup; source: DetailRow | null; unchangedCommercially: boolean;
  price: Prisma.Decimal; subtotal: Prisma.Decimal; inventoryManaged: boolean;
  insertedId?: bigint;
}

const decimal = (value: string | number | Prisma.Decimal) => new Prisma.Decimal(value);
const decimalText = (value: Prisma.Decimal) => value.toFixed(2);
const lineKey = (product: bigint, preparation: bigint | null, observations: string | null) =>
  JSON.stringify([product.toString(), preparation?.toString() ?? null, observations ?? null]);

export const groupRequestedLines = (details: UpdatePedidoDetailInput[]): RequestedGroup[] => {
  const groups = new Map<string, RequestedGroup>();
  for (const detail of details) {
    const productId = BigInt(detail.id_producto_carniceria);
    const preparationId = detail.id_tipo_preparacion ? BigInt(detail.id_tipo_preparacion) : null;
    const observations = normalizePedidoObservations(detail.observaciones);
    const key = lineKey(productId, preparationId, observations);
    const existing = groups.get(key);
    if (existing) {
      existing.quantity = existing.quantity.plus(detail.cantidad);
      if (detail.id_detalle_pedido) existing.detailIds.push(detail.id_detalle_pedido);
    } else {
      groups.set(key, {
        detailIds: detail.id_detalle_pedido ? [detail.id_detalle_pedido] : [],
        productId,
        preparationId,
        quantity: decimal(detail.cantidad),
        observations
      });
    }
  }
  return [...groups.values()];
};

export const requestHash = (dto: UpdatePedidoDetailsDto, groups: RequestedGroup[]) => {
  const normalized = groups.map((group) => ({
    detailIds: [...group.detailIds].sort(),
    productId: group.productId.toString(),
    preparationId: group.preparationId?.toString() ?? null,
    quantity: decimalText(group.quantity),
    observations: group.observations
  })).sort((a, b) => {
    const left = JSON.stringify(a);
    const right = JSON.stringify(b);
    return left < right ? -1 : left > right ? 1 : 0;
  });
  return createHash('sha256').update(JSON.stringify({ versionEsperada: dto.versionEsperada, detalles: normalized })).digest('hex');
};

const readStoredResult = async (db: DbExecutor, tenantId: bigint, orderId: bigint, key: string) => {
  const rows = await db.$queryRaw<{ hash_solicitud: string; resultado: unknown }[]>`
    SELECT hash_solicitud, resultado
    FROM public.operaciones_edicion_pedido
    WHERE id_carniceria = ${tenantId} AND id_pedido = ${orderId} AND clave = ${key}
  `;
  return rows[0];
};

export const assertMatchingIdempotency = (stored: { hash_solicitud: string; resultado: unknown }, hash: string) => {
  if (stored.hash_solicitud.trim() !== hash) {
    throw CustomError.conflict('La clave Idempotency-Key ya fue utilizada con un contenido diferente');
  }
  return stored.resultado;
};

const loadSerializedOrder = async (db: DbExecutor, tenantId: bigint, uuid: string) => {
  const orderRows = await db.$queryRaw<{
    id: bigint; uuid: string; canal_origen: string; fecha: Date; total: string; version: number;
    costo_envio: string; estado: string; tipo_entrega: string; cliente_uuid: string;
    cliente_nombre: string; cliente_telefono: string | null; direccion: string | null;
  }[]>`
    SELECT p.id, p.uuid::text AS uuid, p.canal_origen, p.fecha, p.total::text AS total,
      p.version, p.costo_envio::text AS costo_envio, ep.nombre AS estado,
      te.nombre AS tipo_entrega, c.uuid::text AS cliente_uuid, c.nombre AS cliente_nombre,
      c.telefono AS cliente_telefono, d.nombre_sector AS direccion
    FROM public.pedidos p
    JOIN public.estados_pedido ep ON ep.id = p.id_estado
    JOIN public.tipos_entrega te ON te.id = p.id_tipo_entrega
    JOIN public.clientes c ON c.id = p.id_cliente AND c.id_carniceria = p.id_carniceria
    LEFT JOIN public.direcciones_envio_carniceria d
      ON d.id = p.id_direccion_envio AND d.id_carniceria = p.id_carniceria
    WHERE p.uuid = ${uuid}::uuid AND p.id_carniceria = ${tenantId}
  `;
  const order = orderRows[0];
  if (!order) throw CustomError.notFound('Pedido no encontrado');

  const detailRows = await db.$queryRaw<{
    id: bigint; cantidad: string; precio_unitario: string; subtotal: string;
    observaciones: string | null; producto: string; unidad: string; preparacion: string | null;
  }[]>`
    SELECT dp.id, dp.cantidad::text AS cantidad, dp.precio_unitario::text AS precio_unitario,
      dp.subtotal::text AS subtotal, dp.observaciones, cat.nombre AS producto,
      uv.abreviatura AS unidad, tp.nombre AS preparacion
    FROM public.detalle_pedidos dp
    JOIN public.productos_carniceria pc
      ON pc.id = dp.id_producto_carniceria AND pc.id_carniceria = ${tenantId}
    JOIN public.productos_catalogo cat ON cat.id = pc.id_producto_catalogo
    JOIN public.unidades_venta uv ON uv.id = pc.id_unidad_venta
    LEFT JOIN public.tipos_preparacion tp ON tp.id = dp.id_tipo_preparacion
    WHERE dp.id_pedido = ${order.id} AND dp.eliminado_en IS NULL
    ORDER BY dp.id
  `;

  return {
    uuid: order.uuid,
    id_pedido: order.id.toString(),
    canal_origen: order.canal_origen,
    fecha: order.fecha.toISOString(),
    estado: order.estado,
    tipo_entrega: order.tipo_entrega,
    costo_envio: order.costo_envio,
    total: order.total,
    version: order.version,
    cliente: { uuid: order.cliente_uuid, nombre: order.cliente_nombre, telefono: order.cliente_telefono },
    direccion_envio: order.direccion,
    detalles: detailRows.map((detail) => ({
      id_detalle_pedido: detail.id.toString(), cantidad: detail.cantidad,
      precio_unitario: detail.precio_unitario, subtotal: detail.subtotal,
      observaciones: detail.observaciones, producto: detail.producto,
      unidad: detail.unidad, preparacion: detail.preparacion
    }))
  };
};

export const validateInventoryLedger = async (
  tx: DbExecutor,
  tenantId: bigint,
  orderId: bigint,
  orderUuid: string,
  details: DetailRow[]
) => {
  if (details.some((detail) => detail.maneja_inventario_en_base === null)) {
    throw CustomError.conflict('La trazabilidad de inventario del pedido no está completa; requiere revisión humana');
  }

  const rows = await tx.$queryRaw<MovementRow[]>`
    SELECT m.id, m.id_carniceria, m.id_pedido, m.id_producto_carniceria, m.id_detalle_pedido, m.id_movimiento_origen,
      m.id_operacion_edicion, m.tipo::text AS tipo, m.sentido::text AS sentido,
      m.cantidad::text AS cantidad, m.motivo, m.referencia_operacion,
      m.clave_idempotencia, pc.id_carniceria AS producto_tenant,
      oe.id_pedido AS operacion_pedido, oe.id_carniceria AS operacion_tenant
    FROM public.movimientos_inventario m
    LEFT JOIN public.productos_carniceria pc ON pc.id = m.id_producto_carniceria
    LEFT JOIN public.operaciones_edicion_pedido oe ON oe.id = m.id_operacion_edicion
    WHERE m.id_pedido = ${orderId} AND m.id_carniceria = ${tenantId}
    ORDER BY m.id
  `;
  const detailById = new Map(details.map((detail) => [detail.id.toString(), detail]));
  const movementById = new Map(rows.map((movement) => [movement.id.toString(), movement]));
  const returnedBySource = new Map<string, Prisma.Decimal>();
  const ledgerByProduct = new Map<string, Prisma.Decimal>();
  const baseMovementProducts = new Set<string>();

  for (const movement of rows) {
    const productKey = movement.id_producto_carniceria.toString();
    const amount = decimal(movement.cantidad);
    if (!amount.isFinite() || amount.lte(0) || movement.producto_tenant !== tenantId) {
      throw CustomError.conflict('El historial de inventario contiene movimientos inválidos');
    }
    if (movement.id_detalle_pedido !== null) {
      const detail = detailById.get(movement.id_detalle_pedido.toString());
      if (!detail || detail.id_producto_carniceria !== movement.id_producto_carniceria) {
        throw CustomError.conflict('Un movimiento no corresponde a un detalle verificable del pedido');
      }
    }

    if (movement.id_operacion_edicion === null) {
      const expectedKey = `PEDIDO_POS:${orderUuid}:SALIDA:${productKey}`;
      if (movement.tipo !== 'SALIDA' || movement.sentido !== 'SALIDA' ||
          movement.motivo !== 'VENTA_POS' || movement.referencia_operacion !== `PEDIDO_POS:${orderUuid}` ||
          movement.clave_idempotencia !== expectedKey || movement.id_detalle_pedido !== null ||
          movement.id_movimiento_origen !== null || baseMovementProducts.has(productKey)) {
        throw CustomError.conflict('El historial POS del inventario no puede reconciliarse de forma segura');
      }
      baseMovementProducts.add(productKey);
    } else {
      const operationId = movement.id_operacion_edicion.toString();
      if (movement.operacion_pedido !== orderId || movement.operacion_tenant !== tenantId ||
          movement.motivo !== 'EDICION_PEDIDO' ||
          movement.referencia_operacion !== `PEDIDO_EDICION:${operationId}` ||
          movement.id_detalle_pedido === null) {
        throw CustomError.conflict('Un movimiento de edición no tiene una referencia auditable válida');
      }
      if (movement.tipo === 'SALIDA' && movement.sentido === 'SALIDA' && movement.id_movimiento_origen === null) {
        if (!movement.clave_idempotencia.startsWith(`PEDIDO_EDICION:${operationId}:SALIDA:`)) {
          throw CustomError.conflict('La clave idempotente de un movimiento de salida es inválida');
        }
      } else if (movement.tipo === 'DEVOLUCION' && movement.sentido === 'ENTRADA' && movement.id_movimiento_origen !== null) {
        if (!movement.clave_idempotencia.startsWith(`PEDIDO_EDICION:${operationId}:DEVOLUCION:`)) {
          throw CustomError.conflict('La clave idempotente de una devolución es inválida');
        }
        const source = movementById.get(movement.id_movimiento_origen.toString());
        if (!source || source.id_producto_carniceria !== movement.id_producto_carniceria ||
            source.id_pedido !== orderId || source.id_carniceria !== tenantId ||
            source.tipo !== 'SALIDA' || source.sentido !== 'SALIDA') {
          throw CustomError.conflict('Una devolución no está asociada a una salida válida del pedido');
        }
        const prior = returnedBySource.get(source.id.toString()) ?? decimal(0);
        returnedBySource.set(source.id.toString(), prior.plus(amount));
      } else {
        throw CustomError.conflict('El historial contiene un ajuste no clasificable; requiere revisión humana');
      }
    }

    const previous = ledgerByProduct.get(productKey) ?? decimal(0);
    const signed = movement.sentido === 'SALIDA' ? amount : amount.negated();
    ledgerByProduct.set(productKey, previous.plus(signed));
  }

  for (const movement of rows) {
    if (movement.tipo !== 'SALIDA') continue;
    const returned = returnedBySource.get(movement.id.toString()) ?? decimal(0);
    if (returned.gt(movement.cantidad)) {
      throw CustomError.conflict('El historial registra devoluciones superiores a la salida original');
    }
  }

  const expectedByProduct = new Map<string, Prisma.Decimal>();
  for (const detail of details) {
    if (detail.eliminado_en !== null || detail.maneja_inventario_en_base !== true) continue;
    const key = detail.id_producto_carniceria.toString();
    expectedByProduct.set(key, (expectedByProduct.get(key) ?? decimal(0)).plus(detail.cantidad));
  }
  const products = new Set([...expectedByProduct.keys(), ...ledgerByProduct.keys()]);
  for (const key of products) {
    const expected = expectedByProduct.get(key) ?? decimal(0);
    const actual = ledgerByProduct.get(key) ?? decimal(0);
    if (!actual.eq(expected)) {
      throw CustomError.conflict('Los movimientos no coinciden con la evidencia de inventario del pedido');
    }
  }

  return { movements: rows, returnedBySource, movementById };
};

export const updatePedidoDetailsTransactional = async (
  client: PrismaClient,
  tenantNumber: number,
  orderUuid: string,
  actorUuid: string,
  idempotencyKey: string,
  dto: UpdatePedidoDetailsDto
): Promise<unknown> => {
  const tenantId = BigInt(tenantNumber);
  const groups = groupRequestedLines(dto.detalles);
  if (groups.some((group) => group.quantity.gt(300))) {
    throw CustomError.badRequest('La cantidad consolidada de una línea excede el límite permitido');
  }
  if (!idempotencyKey.trim() || idempotencyKey.length > 160) {
    throw CustomError.badRequest('Idempotency-Key es obligatorio y admite hasta 160 caracteres');
  }
  const hash = requestHash(dto, groups);

  return client.$transaction(async (tx) => {
    // The migration's RLS policies scope this table by a transaction-local tenant context.
    await tx.$queryRaw`SELECT set_config('app.tenant_id', ${tenantId.toString()}, TRUE)`;
    const orderRows = await tx.$queryRaw<{
      id: bigint; version: number; inventario_trazable: boolean | null; estado: string;
      costo_envio: string;
    }[]>`
      SELECT p.id, p.version, p.inventario_trazable, ep.nombre AS estado,
        p.costo_envio::text AS costo_envio
      FROM public.pedidos p
      JOIN public.estados_pedido ep ON ep.id = p.id_estado
      WHERE p.uuid = ${orderUuid}::uuid AND p.id_carniceria = ${tenantId}
      FOR UPDATE OF p
    `;
    const order = orderRows[0];
    if (!order) throw CustomError.notFound('Pedido no encontrado');

    const stored = await readStoredResult(tx, tenantId, order.id, idempotencyKey);
    if (stored) return assertMatchingIdempotency(stored, hash);

    if (order.estado !== 'Pendiente' && order.estado !== 'Confirmado') {
      throw CustomError.conflict('Solo se pueden editar pedidos Pendiente o Confirmado');
    }
    if (order.version !== dto.versionEsperada) {
      throw CustomError.conflict('La versión del pedido cambió; vuelve a consultarlo');
    }
    if (order.inventario_trazable !== true) {
      throw CustomError.conflict('La trazabilidad de inventario del pedido no está certificada; requiere revisión humana');
    }

    const userRows = await tx.$queryRaw<{ id: bigint }[]>`
      SELECT id FROM public.usuarios
      WHERE uuid = ${actorUuid}::uuid AND id_carniceria = ${tenantId} AND activo = TRUE
    `;
    const actor = userRows[0];
    if (!actor) throw CustomError.forbidden('El usuario no pertenece a esta carnicería');

    const allDetails = await tx.$queryRaw<(DetailRow & { producto_tenant: bigint | null })[]>`
      SELECT dp.id, dp.id_producto_carniceria, dp.id_tipo_preparacion, dp.cantidad::text AS cantidad,
        dp.precio_unitario::text AS precio_unitario, dp.subtotal::text AS subtotal, dp.observaciones,
        dp.maneja_inventario_en_base, dp.eliminado_en, pc.id_carniceria AS producto_tenant
      FROM public.detalle_pedidos dp
      LEFT JOIN public.productos_carniceria pc ON pc.id = dp.id_producto_carniceria
      WHERE dp.id_pedido = ${order.id} ORDER BY dp.id FOR UPDATE OF dp
    `;
    if (allDetails.some((detail) => detail.producto_tenant !== tenantId)) {
      throw CustomError.conflict('El pedido contiene detalles de productos fuera de la carnicería');
    }
    const activeDetails = allDetails.filter((detail) => detail.eliminado_en === null);
    if (allDetails.some((detail) => detail.maneja_inventario_en_base === null)) {
      throw CustomError.conflict('El historial de detalles no contiene evidencia completa de inventario');
    }
    const detailsById = new Map(activeDetails.map((detail) => [detail.id.toString(), detail]));
    for (const group of groups) {
      for (const id of group.detailIds) {
        if (!detailsById.has(id)) {
          throw CustomError.badRequest('Un detalle indicado no pertenece al pedido o ya no está activo');
        }
      }
    }

    const ledger = await validateInventoryLedger(tx, tenantId, order.id, orderUuid, allDetails);
    const productIds = [...new Set(groups.map((group) => group.productId.toString()))].map(BigInt);
    const productRows = await tx.productos_carniceria.findMany({
      where: { id: { in: productIds }, id_carniceria: tenantId },
      include: { productos_catalogo: { select: { nombre: true } } }
    });
    if (productRows.length !== productIds.length) {
      throw CustomError.badRequest('Uno o más productos no existen o no pertenecen a esta carnicería');
    }
    const productById = new Map(productRows.map((product) => [product.id.toString(), product]));

    const plans: PlannedLine[] = [];
    const detailsToDeactivate = new Map<string, DetailRow>();
    for (const group of groups) {
      const sourceRows = group.detailIds.map((id) => detailsById.get(id)!);
      const primary = sourceRows[0] ?? null;
      const sameCommercialLine = sourceRows.length === 1 && primary !== null &&
        primary.id_producto_carniceria === group.productId &&
        primary.id_tipo_preparacion === group.preparationId && decimal(primary.cantidad).eq(group.quantity);
      const product = productById.get(group.productId.toString())!;

      if (sameCommercialLine) {
        const price = decimal(primary!.precio_unitario);
        const subtotal = decimal(primary!.subtotal);
        plans.push({
          group, source: primary, unchangedCommercially: true, price, subtotal,
          inventoryManaged: primary!.maneja_inventario_en_base === true
        });
        continue;
      }

      if (!product.disponible) {
        throw CustomError.badRequest(`El producto ${product.productos_catalogo.nombre} no está disponible para cambios`);
      }
      if (group.preparationId !== null) {
        const preparation = await tx.tipos_preparacion.findFirst({
          where: { id: group.preparationId, activo: true }, select: { id: true }
        });
        if (!preparation) throw CustomError.badRequest('La preparación nueva o modificada no está activa');
      }

      for (const old of sourceRows) detailsToDeactivate.set(old.id.toString(), old);
      const price = decimal(product.precio);
      // POS rounds positive monetary values to two decimal places; retain that policy.
      const subtotal = group.quantity.mul(price).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
      plans.push({
        group, source: primary, unchangedCommercially: false, price, subtotal,
        inventoryManaged: product.maneja_inventario
      });
    }

    for (const old of activeDetails) {
      if (!groups.some((group) => group.detailIds.includes(old.id.toString()))) {
        detailsToDeactivate.set(old.id.toString(), old);
      }
    }

    const expectedStock = new Map<string, Prisma.Decimal>();
    for (const old of activeDetails) {
      if (old.maneja_inventario_en_base === true) {
        const key = old.id_producto_carniceria.toString();
        expectedStock.set(key, (expectedStock.get(key) ?? decimal(0)).plus(old.cantidad));
      }
    }
    const plannedStock = new Map([...expectedStock.entries()]);
    for (const old of detailsToDeactivate.values()) {
      if (old.maneja_inventario_en_base !== true) continue;
      const key = old.id_producto_carniceria.toString();
      plannedStock.set(key, (plannedStock.get(key) ?? decimal(0)).minus(old.cantidad));
    }
    for (const plan of plans) {
      if (!plan.unchangedCommercially && plan.inventoryManaged) {
        const key = plan.group.productId.toString();
        plannedStock.set(key, (plannedStock.get(key) ?? decimal(0)).plus(plan.group.quantity));
      }
    }

    const returnPlans: { detail: DetailRow; source: MovementRow; quantity: Prisma.Decimal }[] = [];
    const remainingBySource = new Map<string, Prisma.Decimal>();
    for (const movement of ledger.movements) {
      if (movement.tipo !== 'SALIDA') continue;
      const returned = ledger.returnedBySource.get(movement.id.toString()) ?? decimal(0);
      remainingBySource.set(movement.id.toString(), decimal(movement.cantidad).minus(returned));
    }
    for (const old of detailsToDeactivate.values()) {
      if (old.maneja_inventario_en_base !== true) continue;
      const productKey = old.id_producto_carniceria.toString();
      const sourceCandidates = ledger.movements.filter((movement) =>
        movement.id_producto_carniceria.toString() === productKey && movement.tipo === 'SALIDA' &&
        (remainingBySource.get(movement.id.toString()) ?? decimal(0)).gt(0)
      );
      const detailCandidates = sourceCandidates.filter((movement) => movement.id_detalle_pedido === old.id);
      const candidates = detailCandidates.length > 0
        ? detailCandidates.filter((movement) => (remainingBySource.get(movement.id.toString()) ?? decimal(0)).gte(old.cantidad))
        : sourceCandidates.filter((movement) => movement.id_detalle_pedido === null &&
          movement.id_operacion_edicion === null &&
          (remainingBySource.get(movement.id.toString()) ?? decimal(0)).gte(old.cantidad));
      if (candidates.length !== 1) {
        throw CustomError.conflict('No se puede asociar sin ambigüedad la devolución a su salida original');
      }
      const source = candidates[0]!;
      const key = source.id.toString();
      remainingBySource.set(key, remainingBySource.get(key)!.minus(old.cantidad));
      returnPlans.push({ detail: old, source, quantity: decimal(old.cantidad) });
    }

    const operationRows = await tx.$queryRaw<{ id: bigint }[]>`
      INSERT INTO public.operaciones_edicion_pedido
        (id_carniceria, id_pedido, id_usuario, clave, hash_solicitud,
         version_anterior, version_nueva, resultado)
      VALUES (${tenantId}, ${order.id}, ${actor.id}, ${idempotencyKey}, ${hash},
        ${dto.versionEsperada}, ${dto.versionEsperada + 1}, '{"pending":true}'::jsonb)
      RETURNING id
    `;
    const operation = operationRows[0];
    if (!operation) throw CustomError.internalServer('No se pudo registrar la operación idempotente');

    for (const [productKey, targetQuantity] of plannedStock) {
      const previousQuantity = expectedStock.get(productKey) ?? decimal(0);
      const delta = targetQuantity.minus(previousQuantity);
      if (delta.isZero()) continue;
      const productId = BigInt(productKey);
      if (delta.gt(0)) {
        const updated = await tx.productos_carniceria.updateMany({
          where: { id: productId, id_carniceria: tenantId, stock_actual: { gte: delta } },
          data: { stock_actual: { decrement: delta } }
        });
        if (updated.count !== 1) {
          throw CustomError.conflict('Existencias insuficientes o no configuradas para completar la edición');
        }
      } else {
        const updated = await tx.productos_carniceria.updateMany({
          where: { id: productId, id_carniceria: tenantId, stock_actual: { not: null } },
          data: { stock_actual: { increment: delta.abs() } }
        });
        if (updated.count !== 1) throw CustomError.conflict('No se pudo devolver el inventario de forma segura');
      }
    }

    for (const old of detailsToDeactivate.values()) {
      const count = await tx.$executeRaw`
        UPDATE public.detalle_pedidos SET eliminado_en = CURRENT_TIMESTAMP, id_operacion_baja = ${operation.id}
        WHERE id = ${old.id} AND id_pedido = ${order.id} AND eliminado_en IS NULL
      `;
      if (count !== 1) throw CustomError.conflict('Un detalle cambió concurrentemente');
    }

    for (const plan of plans) {
      if (plan.unchangedCommercially && plan.source) {
        if (plan.source.observaciones !== plan.group.observations) {
          const count = await tx.$executeRaw`
            UPDATE public.detalle_pedidos SET observaciones = ${plan.group.observations}
            WHERE id = ${plan.source.id} AND id_pedido = ${order.id} AND eliminado_en IS NULL
          `;
          if (count !== 1) throw CustomError.conflict('Un detalle cambió concurrentemente');
        }
        plan.insertedId = plan.source.id;
        continue;
      }

      const inserted = await tx.$queryRaw<{ id: bigint }[]>`
        INSERT INTO public.detalle_pedidos
          (id_pedido, id_producto_carniceria, id_tipo_preparacion, cantidad,
           precio_unitario, subtotal, observaciones, maneja_inventario_en_base)
        VALUES (${order.id}, ${plan.group.productId}, ${plan.group.preparationId},
          ${plan.group.quantity}, ${plan.price}, ${plan.subtotal},
          ${plan.group.observations}, ${plan.inventoryManaged})
        RETURNING id
      `;
      plan.insertedId = inserted[0]?.id;
      if (!plan.insertedId) throw CustomError.internalServer('No se pudo crear un detalle de pedido');
    }

    for (const item of returnPlans) {
      const operationId = operation.id.toString();
      await tx.$executeRaw`
        INSERT INTO public.movimientos_inventario
          (id_carniceria, id_producto_carniceria, id_pedido, id_detalle_pedido,
           id_movimiento_origen, id_operacion_edicion, tipo, sentido, cantidad,
           motivo, referencia_operacion, clave_idempotencia)
        VALUES (${tenantId}, ${item.detail.id_producto_carniceria}, ${order.id},
          ${item.detail.id}, ${item.source.id}, ${operation.id},
          'DEVOLUCION'::"TipoMovimientoInventario", 'ENTRADA'::"SentidoMovimientoInventario",
          ${item.quantity}, 'EDICION_PEDIDO', ${`PEDIDO_EDICION:${operationId}`},
          ${`PEDIDO_EDICION:${operationId}:DEVOLUCION:${item.source.id}:${item.detail.id}`})
      `;
    }
    for (const plan of plans) {
      if (plan.unchangedCommercially || !plan.inventoryManaged) continue;
      await tx.$executeRaw`
        INSERT INTO public.movimientos_inventario
          (id_carniceria, id_producto_carniceria, id_pedido, id_detalle_pedido,
           id_operacion_edicion, tipo, sentido, cantidad, motivo,
           referencia_operacion, clave_idempotencia)
        VALUES (${tenantId}, ${plan.group.productId}, ${order.id}, ${plan.insertedId},
          ${operation.id}, 'SALIDA'::"TipoMovimientoInventario", 'SALIDA'::"SentidoMovimientoInventario",
          ${plan.group.quantity}, 'EDICION_PEDIDO', ${`PEDIDO_EDICION:${operation.id}`},
          ${`PEDIDO_EDICION:${operation.id}:SALIDA:${plan.group.productId}:${plan.insertedId}`})
      `;
    }

    const totalItems = plans.reduce((sum, plan) => sum.plus(plan.subtotal), decimal(0));
    const total = totalItems.plus(order.costo_envio).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    const orderUpdate = await tx.$queryRaw<{ version: number }[]>`
      UPDATE public.pedidos p SET total = ${total}, version = version + 1
      WHERE p.id = ${order.id} AND p.id_carniceria = ${tenantId}
        AND p.version = ${dto.versionEsperada}
        AND EXISTS (SELECT 1 FROM public.estados_pedido ep
          WHERE ep.id = p.id_estado AND ep.nombre IN ('Pendiente', 'Confirmado'))
      RETURNING p.version
    `;
    if (orderUpdate.length !== 1) throw CustomError.conflict('El pedido cambió concurrentemente; vuelve a consultarlo');

    const result = await loadSerializedOrder(tx, tenantId, orderUuid);
    const storedJson = JSON.stringify(result);
    const resultUpdate = await tx.$executeRaw`
      UPDATE public.operaciones_edicion_pedido
      SET resultado = CAST(${storedJson} AS JSONB)
      WHERE id = ${operation.id} AND id_carniceria = ${tenantId} AND id_pedido = ${order.id}
    `;
    if (resultUpdate !== 1) throw CustomError.internalServer('No se pudo guardar el resultado idempotente');
    return result;
  }, { timeout: 15000 });
};
