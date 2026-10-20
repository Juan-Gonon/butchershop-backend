import { z } from 'zod';
import { PEDIDO_ESTADOS, type EstadoPedidoNombre } from '../../types/pedidoStates.js';

const changePedidoStateSchema = z.object({
  estado_destino: z.enum(PEDIDO_ESTADOS),
  estado_actual_esperado: z.enum(PEDIDO_ESTADOS)
});

export class ChangePedidoStateDto {
  private constructor(
    public readonly estado_destino: EstadoPedidoNombre,
    public readonly estado_actual_esperado: EstadoPedidoNombre
  ) {}

  static create(object: unknown): [string?, ChangePedidoStateDto?] {
    const result = changePedidoStateSchema.safeParse(object);

    if (!result.success) {
      return [result.error.issues[0]?.message || 'Datos de cambio de estado inválidos'];
    }

    return [undefined, new ChangePedidoStateDto(
      result.data.estado_destino,
      result.data.estado_actual_esperado
    )];
  }
}
