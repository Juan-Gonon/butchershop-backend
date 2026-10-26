import { z } from 'zod';

const toggleDisponibilidadSchema = z.object({
  uuid: z.uuid('El UUID del producto no es válido'),
  disponible: z.boolean()
}).strict();

export class ToggleDisponibilidadProductoCarniceriaDto {
  private constructor(
    public readonly uuid: string,
    public readonly disponible: boolean
  ) {}

  static create(object: unknown): [string?, ToggleDisponibilidadProductoCarniceriaDto?] {
    const result = toggleDisponibilidadSchema.safeParse(object);

    if (!result.success) {
      return [result.error.issues[0]?.message || 'El UUID y el campo disponible son inválidos'];
    }

    return [undefined, new ToggleDisponibilidadProductoCarniceriaDto(result.data.uuid, result.data.disponible)];
  }
}