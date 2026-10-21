import { z } from 'zod';
import { normalizePedidoObservations, trimPedidoObservationSpaces } from '../../types/pedidoObservations.js';

const detalleItemSchema = z.object({
  id_producto_carniceria: z.number({ error: 'El ID del producto es obligatorio' })
    .int('El ID del producto debe ser un entero')
    .positive('El ID del producto debe ser positivo'),
  id_tipo_preparacion: z.number()
    .int('El ID de preparación debe ser un entero')
    .positive('El ID de preparación debe ser positivo')
    .optional()
    .nullable(),
  cantidad: z.number({ error: 'La cantidad es obligatoria' })
    .positive('La cantidad debe ser mayor a 0')
    .max(300, 'La cantidad excede el límite permitido por venta'),
  observaciones: z.string()
    .transform(trimPedidoObservationSpaces)
    .pipe(z.string().max(255, 'Las observaciones no pueden exceder 255 caracteres'))
    .optional()
    .nullable()
    .transform((value) => normalizePedidoObservations(value))
});

const createPedidoSchema = z.object({
  cliente_uuid: z.uuid('El UUID del cliente no tiene un formato válido'),
  id_tipo_entrega: z.number({ error: 'El tipo de entrega es obligatorio' })
    .int()
    .positive(),
  id_direccion_envio: z.number().int().positive().optional().nullable(),
  canal_origen: z.enum(['pos', 'whatsapp', 'web'], {
    message: 'El canal de origen debe ser "pos", "whatsapp" o "web"'
  }),
  productos: z.array(detalleItemSchema)
    .min(1, 'El ticket debe contener al menos un producto')
    .max(50, 'El ticket no puede contener más de 50 ítems distintos')
});

export class CreatePedidoDto {
  private constructor(
    public readonly cliente_uuid: string,
    public readonly id_tipo_entrega: number,
    public readonly canal_origen: string,
    public readonly productos: z.infer<typeof detalleItemSchema>[],
    public readonly id_direccion_envio?: number | null
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static create(object: Record<string, any>): [string?, CreatePedidoDto?] {
    const result = createPedidoSchema.safeParse(object);

    if (!result.success) {
      const firstError = result.error.issues[0]?.message || 'Error de validación';
      return [firstError];
    }

    const { 
      cliente_uuid, 
      id_tipo_entrega, 
      canal_origen, 
      productos, 
      id_direccion_envio 
    } = result.data;

    return [
      undefined,
      new CreatePedidoDto(
        cliente_uuid,
        id_tipo_entrega,
        canal_origen,
        productos,
        id_direccion_envio
      )
    ];
  }
}
