import { z } from 'zod';

const estadosPedido = [
  'Pendiente',
  'Confirmado',
  'En preparación',
  'En camino',
  'Entregado',
  'Cancelado'
] as const;

const changePedidoStateSchema = z.object({
  estado_destino: z.enum(estadosPedido),
  estado_actual_esperado: z.enum(estadosPedido)
});

export class ChangePedidoStateDto {
  private constructor(
    public readonly estado_destino: typeof estadosPedido[number],
    public readonly estado_actual_esperado: typeof estadosPedido[number]
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
