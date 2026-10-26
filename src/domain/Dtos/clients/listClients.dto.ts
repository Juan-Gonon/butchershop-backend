import { z } from 'zod';

const listClientsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  nombre: z.string().trim().transform((value) => value || undefined).optional(),
  telefono: z.string().trim().transform((value) => value || undefined).optional()
}).strict();

export class ListClientsDto {
  private constructor(
    public readonly page: number,
    public readonly pageSize: number,
    public readonly nombre: string | undefined,
    public readonly telefono: string | undefined
  ) {}

  static create(object: unknown): [string?, ListClientsDto?] {
    const result = listClientsSchema.safeParse(object);
    if (!result.success) {
      return [result.error.issues[0]?.message || 'Parámetros de búsqueda inválidos'];
    }

    const { page, pageSize, nombre, telefono } = result.data;
    return [undefined, new ListClientsDto(page, pageSize, nombre, telefono)];
  }
}
