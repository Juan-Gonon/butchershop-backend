import { z } from 'zod';

const listCatalogoProductosSchema = z.object({
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  tipo_carne: z.string().trim().min(1).optional(),
  todos: z.preprocess(
    (value) => value === 'true' ? true : value === 'false' ? false : value,
    z.boolean().default(false)
  )
});

export class ListCatalogoProductosDto {
  private constructor(
    public readonly page: number,
    public readonly pageSize: number,
    public readonly tipo_carne: string | undefined,
    public readonly todos: boolean
  ) {}

  static create(object: unknown): [string?, ListCatalogoProductosDto?] {
    const result = listCatalogoProductosSchema.safeParse(object);

    if (!result.success) {
      return [result.error.issues[0]?.message || 'Parámetros de consulta inválidos'];
    }

    const { page, pageSize, tipo_carne, todos } = result.data;
    return [undefined, new ListCatalogoProductosDto(page, pageSize, tipo_carne, todos)];
  }
}
