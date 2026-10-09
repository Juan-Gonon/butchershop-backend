import { z } from 'zod';

const updateUserSchema = z.object({
  id: z.string({ error: 'El id es obligatorio' }).uuid('El id debe ser un formato UUID válido'),
  nombre: z.string().trim().min(1, 'El nombre no puede estar vacío').optional(),
  usuario: z.string().trim().toLowerCase().min(3, 'El usuario debe tener al menos 3 caracteres').optional(),
  password: z.string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, 'La contraseña debe contener al menos una letra y un número')
    .optional(),
  id_carniceria: z.coerce.number().int().positive().optional(),
  id_rol: z.coerce.number().int().positive().optional(),
  email: z.string().trim().toLowerCase().email('El formato del correo electrónico no es válido').optional().or(z.literal('')),
  activo: z.boolean().optional()
});

export class UpdateUserDto {
  private constructor(
    public readonly id: string, 
    public readonly nombre?: string,
    public readonly usuario?: string,
    public readonly password?: string,
    public readonly id_carniceria?: number,
    public readonly id_rol?: number,
    public readonly email?: string,
    public readonly activo?: boolean
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static create(object: Record<string, any>): [string?, UpdateUserDto?] {
    const result = updateUserSchema.safeParse(object);

    if (!result.success) {
      const firstError = result.error.issues[0]?.message || 'Error de validación';
      return [firstError];
    }

    const { id, nombre, usuario, password, id_carniceria, id_rol, email, activo } = result.data;

    return [
      undefined,
      new UpdateUserDto(
        id,
        nombre,
        usuario,
        password,
        id_carniceria,
        id_rol,
        email || undefined,
        activo
      )
    ];
  }
}