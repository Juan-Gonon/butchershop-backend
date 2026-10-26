import { z } from 'zod';

const phoneSchema = z.string()
  .trim()
  .transform((value) => value || null)
  .pipe(z.string().refine((value) => {
    const digitCount = value.replace(/\D/g, '').length;
    return /^\+?[\d\s-]+$/.test(value) && digitCount >= 7 && digitCount <= 15 && value.length <= 30;
  }, 'El teléfono debe contener entre 7 y 15 dígitos y solo puede incluir números, espacios, guiones o el signo +').nullable());

const optionalNullableTextSchema = z.string()
  .trim()
  .transform((value) => value || null);

const createClientSchema = z.object({
  nombre: z.string({ error: 'El nombre es obligatorio' })
    .trim()
    .min(1, 'El nombre es obligatorio')
    .max(150, 'El nombre no puede exceder los 150 caracteres'),
  telefono: phoneSchema.optional().transform((value) => value ?? null),
  direccion_defecto: optionalNullableTextSchema.optional().transform((value) => value ?? null),
  es_generico: z.boolean().default(false)
}).strict();

export class CreateClientDto {
  private constructor(
    public readonly nombre: string,
    public readonly telefono: string | null,
    public readonly direccion_defecto: string | null,
    public readonly es_generico: boolean
  ) {}

  static create(object: unknown): [string?, CreateClientDto?] {
    const result = createClientSchema.safeParse(object);
    if (!result.success) {
      return [result.error.issues[0]?.message || 'Datos del cliente inválidos'];
    }

    const { nombre, telefono, direccion_defecto, es_generico } = result.data;
    return [undefined, new CreateClientDto(nombre, telefono, direccion_defecto, es_generico)];
  }
}
