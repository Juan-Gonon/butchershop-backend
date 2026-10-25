import { z } from 'zod';

const toggleDisponibilidadSchema = z.object({
  disponible: z.boolean()
}).strict();

export class ToggleDisponibilidadProductoCarniceriaDto {
  private constructor(public readonly disponible: boolean) {}

  static create(object: unknown): [string?, ToggleDisponibilidadProductoCarniceriaDto?] {
    const result = toggleDisponibilidadSchema.safeParse(object);

    if (!result.success) {
      return [result.error.issues[0]?.message || 'El campo disponible debe ser booleano'];
    }

    return [undefined, new ToggleDisponibilidadProductoCarniceriaDto(result.data.disponible)];
  }
}