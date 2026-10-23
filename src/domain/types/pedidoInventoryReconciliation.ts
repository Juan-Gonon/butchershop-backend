export interface PedidoInventoryMovementEvidence {
  id: string;
  id_carniceria: string;
  id_pedido: string;
  id_producto_carniceria: string;
  id_detalle_pedido: string | null;
  id_movimiento_origen: string | null;
  id_operacion_edicion: string | null;
  tipo: string;
  sentido: string;
  cantidad: string | number;
  motivo: string;
  referencia_operacion: string;
  clave_idempotencia: string;
  producto_tenant?: string | null;
  operacion_pedido?: string | null;
  operacion_tenant?: string | null;
}

export interface PedidoInventoryReturnPlan {
  id_movimiento_origen: string;
  id_producto_carniceria: string;
  cantidad: string;
}

export interface PedidoInventoryReconciliation {
  safe: boolean;
  returns: PedidoInventoryReturnPlan[];
}

const zeroReconciliation = (): PedidoInventoryReconciliation => ({ safe: false, returns: [] });

const toCents = (value: string | number): bigint | null => {
  const text = String(value);
  const match = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/.exec(text);
  if (!match) return null;
  const whole = BigInt(match[1]!);
  const fraction = BigInt((match[2] ?? '').padEnd(2, '0') || '0');
  const cents = whole * 100n + fraction;
  return cents > 0n ? cents : null;
};

const isId = (value: string) => /^\d+$/.test(value);

/**
 * Calculates the unreturned quantity for each evidenced outgoing movement.
 * Any malformed, duplicate, foreign, or unclassifiable evidence fails closed
 * and produces no return plan.
 */
export const reconcilePedidoInventoryReturns = (
  movements: PedidoInventoryMovementEvidence[],
  scope: { tenantId: string; orderId: string; orderUuid: string }
): PedidoInventoryReconciliation => {
  const byId = new Map<string, PedidoInventoryMovementEvidence>();
  const saleCents = new Map<string, bigint>();
  const returnedCents = new Map<string, bigint>();
  const idempotencyKeys = new Set<string>();

  for (const movement of movements) {
    if (!isId(movement.id) || !isId(movement.id_carniceria) || !isId(movement.id_pedido) ||
        !isId(movement.id_producto_carniceria) || movement.id_carniceria !== scope.tenantId ||
        movement.id_pedido !== scope.orderId || byId.has(movement.id) ||
        (movement.producto_tenant !== undefined && movement.producto_tenant !== scope.tenantId) ||
        (movement.id_detalle_pedido !== null && !isId(movement.id_detalle_pedido)) ||
        (movement.id_movimiento_origen !== null && !isId(movement.id_movimiento_origen)) ||
        (movement.id_operacion_edicion !== null && !isId(movement.id_operacion_edicion)) ||
        !movement.clave_idempotencia || idempotencyKeys.has(movement.clave_idempotencia)) {
      return zeroReconciliation();
    }
    const amount = toCents(movement.cantidad);
    if (amount === null) return zeroReconciliation();
    byId.set(movement.id, movement);
    idempotencyKeys.add(movement.clave_idempotencia);

    if (movement.tipo === 'SALIDA' && movement.sentido === 'SALIDA') {
      if (movement.id_movimiento_origen !== null) return zeroReconciliation();
      if (movement.id_operacion_edicion === null) {
        const expectedReference = `PEDIDO_POS:${scope.orderUuid}`;
        const expectedKey = `${expectedReference}:SALIDA:${movement.id_producto_carniceria}`;
        if (movement.motivo !== 'VENTA_POS' || movement.referencia_operacion !== expectedReference ||
            movement.clave_idempotencia !== expectedKey || movement.id_detalle_pedido !== null) {
          return zeroReconciliation();
        }
      } else {
        const operationId = movement.id_operacion_edicion;
        if (!isId(operationId) || movement.motivo !== 'EDICION_PEDIDO' ||
            movement.referencia_operacion !== `PEDIDO_EDICION:${operationId}` ||
            !movement.clave_idempotencia.startsWith(`PEDIDO_EDICION:${operationId}:SALIDA:`) ||
            movement.id_detalle_pedido === null ||
            movement.operacion_pedido !== scope.orderId || movement.operacion_tenant !== scope.tenantId) {
          return zeroReconciliation();
        }
      }
      saleCents.set(movement.id, amount);
      continue;
    }

    if (movement.tipo !== 'DEVOLUCION' || movement.sentido !== 'ENTRADA' ||
        movement.id_movimiento_origen === null || movement.id_operacion_edicion === null) {
      return zeroReconciliation();
    }
    const operationId = movement.id_operacion_edicion;
    if (!isId(operationId) || movement.motivo !== 'EDICION_PEDIDO' ||
        movement.referencia_operacion !== `PEDIDO_EDICION:${operationId}` ||
        !movement.clave_idempotencia.startsWith(`PEDIDO_EDICION:${operationId}:DEVOLUCION:`) ||
        movement.id_detalle_pedido === null || movement.operacion_pedido !== scope.orderId ||
        movement.operacion_tenant !== scope.tenantId) {
      return zeroReconciliation();
    }
    const prior = returnedCents.get(movement.id_movimiento_origen) ?? 0n;
    returnedCents.set(movement.id_movimiento_origen, prior + amount);
  }

  if (saleCents.size === 0) {
    return { safe: true, returns: [] };
  }

  for (const [sourceId, amount] of returnedCents) {
    const source = byId.get(sourceId);
    if (!source || !saleCents.has(sourceId) || amount > saleCents.get(sourceId)!) {
      return zeroReconciliation();
    }
    const refundMovements = movements.filter((movement) => movement.tipo === 'DEVOLUCION' &&
      movement.id_movimiento_origen === sourceId);
    if (refundMovements.some((movement) => movement.id_producto_carniceria !== source.id_producto_carniceria)) {
      return zeroReconciliation();
    }
  }

  const returns = [...saleCents.entries()].flatMap(([sourceId, total]) => {
    const pending = total - (returnedCents.get(sourceId) ?? 0n);
    if (pending <= 0n) return [];
    const source = byId.get(sourceId)!;
    return [{
      id_movimiento_origen: sourceId,
      id_producto_carniceria: source.id_producto_carniceria,
      cantidad: `${pending / 100n}.${String(pending % 100n).padStart(2, '0')}`
    }];
  });

  return { safe: true, returns };
};
