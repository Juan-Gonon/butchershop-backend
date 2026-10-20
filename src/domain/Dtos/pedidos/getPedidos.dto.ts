import { z } from 'zod';

const estadosPedido = [
  'Pendiente',
  'Confirmado',
  'En_preparacion',
  'En_camino',
  'Entregado',
  'Cancelado'
] as const;

const uuidSchema = z.uuid('El UUID del pedido no tiene un formato válido');

const listPedidosSchema = z.object({
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  estado: z.enum(estadosPedido).optional(),
  cliente_uuid: z.uuid('El UUID del cliente no tiene un formato válido').optional(),
  desde: z.iso.datetime({ offset: true }).transform((value) => new Date(value)).optional(),
  hasta: z.iso.datetime({ offset: true }).transform((value) => new Date(value)).optional()
}).superRefine((value, context) => {
  if (value.desde && value.hasta && value.desde > value.hasta) {
    context.addIssue({
      code: 'custom',
      path: ['hasta'],
      message: 'La fecha hasta debe ser posterior o igual a desde'
    });
  }
});

export class ListPedidosDto {
  private constructor(
    public readonly page: number,
    public readonly pageSize: number,
    public readonly estado?: typeof estadosPedido[number],
    public readonly cliente_uuid?: string,
    public readonly desde?: Date,
    public readonly hasta?: Date
  ) {}

  static create(object: unknown): [string?, ListPedidosDto?] {
    const result = listPedidosSchema.safeParse(object);

    if (!result.success) {
      return [result.error.issues[0]?.message || 'Parámetros de consulta inválidos'];
    }

    const { page, pageSize, estado, cliente_uuid, desde, hasta } = result.data;
    return [undefined, new ListPedidosDto(page, pageSize, estado, cliente_uuid, desde, hasta)];
  }
}

export class PedidoUuidDto {
  private constructor(public readonly uuid: string) {}

  static create(object: unknown): [string?, PedidoUuidDto?] {
    const result = z.object({ uuid: uuidSchema }).safeParse(object);

    if (!result.success) {
      return [result.error.issues[0]?.message || 'UUID del pedido inválido'];
    }

    return [undefined, new PedidoUuidDto(result.data.uuid)];
  }
}
