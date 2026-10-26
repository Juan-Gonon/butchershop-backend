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

const updateClientSchema = z.object({
  uuid: z.uuid('El UUID del cliente no es válido'),
  nombre: z.string()
    .trim()
    .min(1, 'El nombre no puede estar vacío')
    .max(150, 'El nombre no puede exceder los 150 caracteres')
    .optional(),
  telefono: phoneSchema.optional(),
  direccion_defecto: optionalNullableTextSchema.optional(),
  es_generico: z.boolean().optional()
}).strict().superRefine((value, context) => {
  if (value.nombre === undefined
    && value.telefono === undefined
    && value.direccion_defecto === undefined
    && value.es_generico === undefined) {
    context.addIssue({ code: 'custom', message: 'Debe especificar al menos un campo para actualizar' });
  }
});

export class UpdateClientDto {
  private constructor(
    public readonly uuid: string,
    public readonly nombre: string | undefined,
    public readonly telefono: string | null | undefined,
    public readonly direccion_defecto: string | null | undefined,
    public readonly es_generico: boolean | undefined
  ) {}

  static create(object: unknown): [string?, UpdateClientDto?] {
    const result = updateClientSchema.safeParse(object);
    if (!result.success) {
      return [result.error.issues[0]?.message || 'Datos de actualización inválidos'];
    }

    const { uuid, nombre, telefono, direccion_defecto, es_generico } = result.data;
    return [undefined, new UpdateClientDto(uuid, nombre, telefono, direccion_defecto, es_generico)];
  }
}
