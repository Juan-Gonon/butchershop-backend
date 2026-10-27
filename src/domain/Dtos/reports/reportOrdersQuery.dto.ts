import { z } from 'zod';

const reportOrdersQuerySchema = z.object({
  desde: z.iso.date('La fecha desde debe tener formato YYYY-MM-DD'),
  hasta: z.iso.date('La fecha hasta debe tener formato YYYY-MM-DD'),
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10)
}).strict().superRefine((value, context) => {
  if (value.desde > value.hasta) {
    context.addIssue({
      code: 'custom',
      path: ['hasta'],
      message: 'La fecha hasta debe ser igual o posterior a desde'
    });
  }
});

export class ReportOrdersQueryDto {
  private constructor(
    public readonly desde: string,
    public readonly hasta: string,
    public readonly page: number,
    public readonly pageSize: number
  ) {}

  static create(object: unknown): [string?, ReportOrdersQueryDto?] {
    const result = reportOrdersQuerySchema.safeParse(object);
    if (!result.success) {
      return [result.error.issues[0]?.message || 'Parámetros de consulta inválidos'];
    }

    const { desde, hasta, page, pageSize } = result.data;
    return [undefined, new ReportOrdersQueryDto(desde, hasta, page, pageSize)];
  }
}
