import { z } from 'zod';

const queryBooleanSchema = z.preprocess(
  (value) => value === 'true' ? true : value === 'false' ? false : value,
  z.boolean()
);

const listProductosCarniceriaSchema = z.object({
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  tipo_carne: z.string().trim().min(1).optional(),
  categoria: z.string().trim().min(1).optional(),
  disponible: queryBooleanSchema.optional(),
  maneja_inventario: queryBooleanSchema.optional(),
  stock_critico: z.coerce.number().min(0).max(99_999_999.99).default(3)
}).strict();

export class ListProductosCarniceriaDto {
  private constructor(
    public readonly page: number,
    public readonly pageSize: number,
    public readonly tipo_carne: string | undefined,
    public readonly categoria: string | undefined,
    public readonly disponible: boolean | undefined,
    public readonly maneja_inventario: boolean | undefined,
    public readonly stock_critico: number
  ) {}

  static create(object: unknown): [string?, ListProductosCarniceriaDto?] {
    const result = listProductosCarniceriaSchema.safeParse(object);

    if (!result.success) {
      return [result.error.issues[0]?.message || 'Parámetros de consulta inválidos'];
    }

    const { page, pageSize, tipo_carne, categoria, disponible, maneja_inventario, stock_critico } = result.data;
    return [
      undefined,
      new ListProductosCarniceriaDto(
        page,
        pageSize,
        tipo_carne,
        categoria,
        disponible,
        maneja_inventario,
        stock_critico
      )
    ];
  }
}