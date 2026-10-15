import { z } from 'zod';

// Esquema para cada producto dentro del ticket (detalle)
const detalleItemSchema = z.object({
  id_producto_carniceria: z.number({ error: 'El id del producto es obligatorio' })
    .positive('El id del producto debe ser positivo'),
  id_tipo_preparacion: z.number().positive('El id de preparación debe ser positivo').optional().nullable(),
  cantidad: z.number({ error: 'La cantidad es obligatoria' })
    .positive('La cantidad debe ser mayor a 0'),
  precio_unitario: z.number({ error: 'El precio unitario es obligatorio' })
    .min(0, 'El precio unitario no puede ser negativo'),
  subtotal: z.number({ error: 'El subtotal es obligatorio' })
    .min(0, 'El subtotal no puede ser negativo'),
  observaciones: z.string().optional().nullable()
});

// Esquema principal para el Pedido del POS
const createPedidoSchema = z.object({
  cliente_uuid: z.string({ error: 'El UUID del cliente es obligatorio' })
    .uuid('El UUID del cliente debe ser válido'),
  id_tipo_entrega: z.number().positive(),
  id_direccion_envio: z.number().positive().optional().nullable(),
  costo_envio: z.number().min(0),
  canal_origen: z.string().min(1),
  total: z.number().min(0),
  productos: z.array(detalleItemSchema).min(1)
});

export class CreatePedidoDto {
  private constructor(
    public readonly cliente_uuid: string,
    public readonly id_tipo_entrega: number,
    public readonly costo_envio: number,
    public readonly canal_origen: string,
    public readonly total: number,
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
      costo_envio, 
      canal_origen, 
      total, 
      productos, 
      id_direccion_envio 
    } = result.data;

    return [
      undefined,
      new CreatePedidoDto(
        cliente_uuid,
        id_tipo_entrega,
        costo_envio,
        canal_origen,
        total,
        productos,
        id_direccion_envio
      )
    ];
  }
}