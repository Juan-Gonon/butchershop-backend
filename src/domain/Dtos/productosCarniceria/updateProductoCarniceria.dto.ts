import { z } from 'zod';

const decimalAmountSchema = z.number()
  .finite()
  .min(0, 'El valor no puede ser negativo')
  .max(99_999_999.99, 'El valor excede el máximo permitido')
  .refine((value) => Number(value.toFixed(2)) === value, 'El valor admite hasta 2 decimales');

const updateProductoCarniceriaSchema = z.object({
  precio: decimalAmountSchema.optional(),
  maneja_inventario: z.boolean().optional(),
  stock_actual: decimalAmountSchema.optional()
}).strict()
  .superRefine((value, context) => {
    if (value.precio === undefined
      && value.maneja_inventario === undefined
      && value.stock_actual === undefined) {
      context.addIssue({
        code: 'custom',
        message: 'Debe especificar al menos un campo para actualizar'
      });
    }
  })
  .transform((value) => ({
    ...value,
    ...(value.maneja_inventario === false ? { stock_actual: null } : {})
  }));

export class UpdateProductoCarniceriaDto {
  private constructor(
    public readonly precio: number | undefined,
    public readonly maneja_inventario: boolean | undefined,
    public readonly stock_actual: number | null | undefined
  ) {}

  static create(object: unknown): [string?, UpdateProductoCarniceriaDto?] {
    const result = updateProductoCarniceriaSchema.safeParse(object);

    if (!result.success) {
      return [result.error.issues[0]?.message || 'Datos de actualización inválidos'];
    }

    const { precio, maneja_inventario, stock_actual } = result.data;
    return [
      undefined,
      new UpdateProductoCarniceriaDto(precio, maneja_inventario, stock_actual)
    ];
  }
}