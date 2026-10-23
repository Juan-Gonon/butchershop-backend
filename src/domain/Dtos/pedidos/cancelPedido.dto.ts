import { z } from 'zod';

const cancelPedidoSchema = z.object({
  versionEsperada: z.number().int().nonnegative()
}).strict();

export class CancelPedidoDto {
   
  private constructor(public readonly versionEsperada: number) {}

  static create(object: unknown): [string?, CancelPedidoDto?] {
    const result = cancelPedidoSchema.safeParse(object);
    if (!result.success) {
      return [result.error.issues[0]?.message || 'La solicitud de cancelación no debe incluir un cuerpo'];
    }

    return [undefined, new CancelPedidoDto(result.data.versionEsperada)];
  }
}
