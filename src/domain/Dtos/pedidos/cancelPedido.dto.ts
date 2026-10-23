import { z } from 'zod';

const cancelPedidoSchema = z.union([
  z.undefined(),
  z.object({}).strict()
]);

export class CancelPedidoDto {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  static create(object: unknown): [string?, CancelPedidoDto?] {
    const result = cancelPedidoSchema.safeParse(object);
    if (!result.success) {
      return [result.error.issues[0]?.message || 'La solicitud de cancelación no debe incluir un cuerpo'];
    }

    return [undefined, new CancelPedidoDto()];
  }
}
