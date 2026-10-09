import { z } from 'zod';

const updateButcherShopSchema = z.object({
  id: z.string({ error: 'El ID de la carnicería es obligatorio' }).uuid('El ID debe ser un UUID válido'),
  nombre: z.string()
    .trim()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(100, 'El nombre no puede exceder los 100 caracteres')
    .optional(),
  telefono_whatsapp: z.string()
    .trim()
    .regex(/^\+?[1-9]\d{7,14}$/, 'El teléfono de WhatsApp debe tener un formato válido')
    .optional()
    .or(z.literal('')),
  direccion: z.string()
    .trim()
    .min(5, 'La dirección debe tener al menos 5 caracteres')
    .max(255, 'La dirección no puede exceder los 255 caracteres')
    .optional()
    .or(z.literal('')),
  activo: z.boolean().optional()
});

export class UpdateButcherShop {
  private constructor(
    public readonly id: string, 
    public readonly nombre?: string,
    public readonly telefono_whatsapp?: string,
    public readonly direccion?: string,
    public readonly activo?: boolean
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static create(object: Record<string, any>): [string?, UpdateButcherShop?] {
    const result = updateButcherShopSchema.safeParse(object);

    if (!result.success) {
      const firstError = result.error.issues[0]?.message || 'Error de validación';
      return [firstError];
    }

    const { id, nombre, telefono_whatsapp, direccion, activo } = result.data;

    return [
      undefined,
      new UpdateButcherShop(
        id,
        nombre,
        telefono_whatsapp || undefined,
        direccion || undefined,
        activo
      )
    ];
  }
}