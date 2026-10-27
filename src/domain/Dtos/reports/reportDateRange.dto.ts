import { z } from 'zod';

const reportDateRangeSchema = z.object({
  desde: z.iso.date('La fecha desde debe tener formato YYYY-MM-DD'),
  hasta: z.iso.date('La fecha hasta debe tener formato YYYY-MM-DD')
}).strict().superRefine((value, context) => {
  if (value.desde > value.hasta) {
    context.addIssue({
      code: 'custom',
      path: ['hasta'],
      message: 'La fecha hasta debe ser igual o posterior a desde'
    });
  }
});

export class ReportDateRangeDto {
  private constructor(
    public readonly desde: string,
    public readonly hasta: string
  ) {}

  static create(object: unknown): [string?, ReportDateRangeDto?] {
    const result = reportDateRangeSchema.safeParse(object);
    if (!result.success) {
      return [result.error.issues[0]?.message || 'Rango de fechas inválido'];
    }

    const { desde, hasta } = result.data;
    return [undefined, new ReportDateRangeDto(desde, hasta)];
  }
}
