import { z } from 'zod';

const createUserSchema = z.object({
  nombre: z.string({ error: 'El nombre es requerido' }).trim().min(1, 'El nombre no puede estar vacío'),
  usuario: z.string({ error: 'El usuario es requerido' }).trim().toLowerCase().min(3, 'El usuario debe tener al menos 3 caracteres'),
  password: z.string({ error: 'La contraseña es requerida' })
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, 'La contraseña debe contener al menos una letra y un número'),
  id_carniceria: z.coerce.number({ error: 'El id_carniceria debe ser un número' }).int().positive('El id_carniceria debe ser positivo'),
  id_rol: z.coerce.number({ error: 'El id_rol debe ser un número' }).int().positive('El id_rol debe ser positivo'),
  email: z.string().trim().toLowerCase().email('El formato del correo electrónico no es válido').optional().or(z.literal(''))
});

export class CreateUserDto {
  private constructor(
    public readonly nombre: string,
    public readonly usuario: string,
    public readonly password: string,
    public readonly id_carniceria: number,
    public readonly id_rol: number,
    public readonly email?: string
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static create(object: Record<string, any>): [string?, CreateUserDto?] {
    const result = createUserSchema.safeParse(object);

    if (!result.success) {
      const firstError = result.error.issues[0]?.message || 'Error de validación';
      return [firstError];
    }

    const { nombre, usuario, password, id_carniceria, id_rol, email } = result.data;

    return [
      undefined,
      new CreateUserDto(nombre, usuario, password, id_carniceria, id_rol, email || undefined)
    ];
  }
}