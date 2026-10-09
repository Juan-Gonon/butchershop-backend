import { z } from 'zod';

const createButcherShopSchema = z.object({
  nombre: z.string({ error: 'El nombre de la carnicería es obligatorio' })
    .trim()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(100, 'El nombre no puede exceder los 100 caracteres'),
  telefono_whatsapp: z.string()
    .trim()
    .regex(/^\+?[1-9]\d{7,14}$/, 'El teléfono de WhatsApp debe tener un formato válido (ej. +50212345678)')
    .optional()
    .or(z.literal('')),
  direccion: z.string()
    .trim()
    .min(5, 'La dirección debe tener al menos 5 caracteres')
    .max(255, 'La dirección no puede exceder los 255 caracteres')
    .optional()
    .or(z.literal(''))
});

export class CreateButcherShop {
  private constructor(
    public readonly nombre: string,
    public readonly telefono_whatsapp?: string,
    public readonly direccion?: string
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static create(object: Record<string, any>): [string?, CreateButcherShop?] {
    const result = createButcherShopSchema.safeParse(object);

    if (!result.success) {
      const firstError = result.error.issues[0]?.message || 'Error de validación';
      return [firstError];
    }

    const { nombre, telefono_whatsapp, direccion } = result.data;

    return [
      undefined,
      new CreateButcherShop(
        nombre,
        telefono_whatsapp || undefined,
        direccion || undefined
      )
    ];
  }
}