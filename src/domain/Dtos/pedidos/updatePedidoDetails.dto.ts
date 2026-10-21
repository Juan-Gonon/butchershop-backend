import { z } from 'zod';

// Prisma stores these identifiers as BigInt, so the HTTP contract uses decimal strings
// to avoid losing precision through JavaScript numbers.
const maxPostgresBigInt = 9_223_372_036_854_775_807n;
const positiveBigIntIdSchema = z.string()
  .regex(/^[1-9]\d*$/, 'El identificador debe ser un entero positivo')
  .refine((value) => /^[1-9]\d*$/.test(value) && BigInt(value) <= maxPostgresBigInt,
    'El identificador excede el rango permitido');

const hasAtMostTwoDecimalPlaces = (value: number): boolean => {
  const [coefficient, exponent = '0'] = value.toString().toLowerCase().split('e');
  const fractionalDigits = coefficient?.split('.')[1]?.length ?? 0;
  return Math.max(0, fractionalDigits - Number(exponent)) <= 2;
};

const updatePedidoDetailSchema = z.object({
  id_detalle_pedido: positiveBigIntIdSchema.optional(),
  id_producto_carniceria: positiveBigIntIdSchema,
  id_tipo_preparacion: positiveBigIntIdSchema.nullable().optional(),
  cantidad: z.number()
    .finite('La cantidad debe ser un número finito')
    .positive('La cantidad debe ser mayor a 0')
    .refine(hasAtMostTwoDecimalPlaces, 'La cantidad admite como máximo 2 decimales')
    .max(300, 'La cantidad excede el límite permitido por venta'),
  observaciones: z.string()
    .trim()
    .max(255, 'Las observaciones no pueden exceder 255 caracteres')
    .nullable()
    .optional()
}).strict();

const updatePedidoDetailsSchema = z.object({
  versionEsperada: z.number()
    .int('La versión esperada debe ser un entero')
    .positive('La versión esperada debe ser positiva'),
  detalles: z.array(updatePedidoDetailSchema)
    .min(1, 'El pedido debe contener al menos un detalle')
    .max(50, 'El pedido no puede contener más de 50 detalles')
}).strict().superRefine((value, context) => {
  const detailIds = new Set<string>();

  value.detalles.forEach((detail, index) => {
    if (!detail.id_detalle_pedido) return;

    if (detailIds.has(detail.id_detalle_pedido)) {
      context.addIssue({
        code: 'custom',
        path: ['detalles', index, 'id_detalle_pedido'],
        message: 'El ID de detalle no puede repetirse'
      });
      return;
    }

    detailIds.add(detail.id_detalle_pedido);
  });
});

export type UpdatePedidoDetailInput = z.infer<typeof updatePedidoDetailSchema>;

export class UpdatePedidoDetailsDto {
  private constructor(
    public readonly versionEsperada: number,
    public readonly detalles: UpdatePedidoDetailInput[]
  ) {}

  static create(object: unknown): [string?, UpdatePedidoDetailsDto?] {
    const result = updatePedidoDetailsSchema.safeParse(object);

    if (!result.success) {
      return [result.error.issues[0]?.message || 'Datos de edición del pedido inválidos'];
    }

    return [undefined, new UpdatePedidoDetailsDto(result.data.versionEsperada, result.data.detalles)];
  }
}
