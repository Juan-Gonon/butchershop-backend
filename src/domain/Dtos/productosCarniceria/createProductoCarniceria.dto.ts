import { z } from 'zod';

const postgresBigIntMax = 9_223_372_036_854_775_807n;

const positiveBigIntIdSchema = z.union([
  z.string().regex(/^[1-9]\d*$/, 'El ID debe ser un entero positivo'),
  z.number().int().positive().safe()
]).transform((value) => String(value)).refine(
  (value) => BigInt(value) <= postgresBigIntMax,
  'El ID excede el rango permitido'
);

const decimalAmountSchema = z.number()
  .finite()
  .min(0, 'La cantidad no puede ser negativa')
  .max(99_999_999.99, 'La cantidad excede el máximo permitido')
  .refine((value) => Number(value.toFixed(2)) === value, 'La cantidad admite hasta 2 decimales');

const createProductoCarniceriaSchema = z.object({
  producto_catalogo_uuid: z.uuid('El UUID del producto del catálogo no es válido'),
  id_unidad_venta: positiveBigIntIdSchema,
  precio: decimalAmountSchema,
  maneja_inventario: z.boolean(),
  stock_inicial: decimalAmountSchema.nullable().optional()
}).strict().transform((value) => ({
  ...value,
  stock_inicial: value.maneja_inventario ? value.stock_inicial ?? null : null
}));

export class CreateProductoCarniceriaDto {
  private constructor(
    public readonly producto_catalogo_uuid: string,
    public readonly id_unidad_venta: string,
    public readonly precio: number,
    public readonly maneja_inventario: boolean,
    public readonly stock_inicial: number | null
  ) {}

  static create(object: unknown): [string?, CreateProductoCarniceriaDto?] {
    const result = createProductoCarniceriaSchema.safeParse(object);

    if (!result.success) {
      return [result.error.issues[0]?.message || 'Datos del producto inválidos'];
    }

    const { producto_catalogo_uuid, id_unidad_venta, precio, maneja_inventario, stock_inicial } = result.data;
    return [
      undefined,
      new CreateProductoCarniceriaDto(
        producto_catalogo_uuid,
        id_unidad_venta,
        precio,
        maneja_inventario,
        stock_inicial
      )
    ];
  }
}