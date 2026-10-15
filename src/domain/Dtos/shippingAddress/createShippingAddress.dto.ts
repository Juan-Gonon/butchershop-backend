import { z } from 'zod';

const createShippingAddressSchema = z.object({
  nombre_sector: z.string({ error: 'El nombre del sector es obligatorio' })
    .trim()
    .min(3, 'El nombre del sector debe tener al menos 3 caracteres')
    .max(150, 'El nombre del sector no puede exceder los 150 caracteres'),
  costo_envio: z.number({ error: 'El costo de envío es obligatorio' })
    .min(0, 'El costo de envío no puede ser negativo'),
  activo: z.boolean().optional()
});

export class CreateShippingAddressDto {
  private constructor(
    public readonly nombre_sector: string,
    public readonly costo_envio: number,
    public readonly activo?: boolean
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static create(object: Record<string, any>): [string?, CreateShippingAddressDto?] {
    const result = createShippingAddressSchema.safeParse(object);

    if (!result.success) {
      const firstError = result.error.issues[0]?.message || 'Error de validación';
      return [firstError];
    }

    const { nombre_sector, costo_envio, activo } = result.data;

    return [
      undefined,
      new CreateShippingAddressDto(nombre_sector, costo_envio, activo ?? true)
    ];
  }
}