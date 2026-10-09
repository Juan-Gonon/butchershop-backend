export class UpdateButcherShop {
  private constructor(
    public readonly id: number,
    public readonly nombre?: string,
    public readonly telefono_whatsapp?: string,
    public readonly direccion?: string,
    public readonly activo?: boolean
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static create(object: Record<string, any>): [string?, UpdateButcherShop?] {
    const { id, nombre, telefono_whatsapp, direccion, activo } = object;

    // 1. Validar ID de la carnicería (Obligatorio, número entero positivo)
    const parsedId = Number(id);
    if (!id || isNaN(parsedId) || !Number.isInteger(parsedId) || parsedId <= 0) {
      return ['El ID de la carnicería es obligatorio y debe ser un número entero positivo válido'];
    }

    // 2. Validar 'nombre' (Opcional)
    let cleanedNombre: string | undefined = undefined;
    if (nombre !== undefined && nombre !== null && nombre !== '') {
      if (typeof nombre !== 'string') {
        return ['El nombre debe ser un texto válido'];
      }
      cleanedNombre = nombre.trim();
      if (cleanedNombre.length < 3) {
        return ['El nombre debe tener al menos 3 caracteres'];
      }
      if (cleanedNombre.length > 100) {
        return ['El nombre no puede exceder los 100 caracteres'];
      }
    }

    // 3. Validar 'telefono_whatsapp' (Opcional)
    let cleanedPhone: string | undefined = undefined;
    if (telefono_whatsapp !== undefined && telefono_whatsapp !== null && telefono_whatsapp !== '') {
      if (typeof telefono_whatsapp !== 'string' && typeof telefono_whatsapp !== 'number') {
        return ['El teléfono debe ser un valor válido'];
      }

      cleanedPhone = String(telefono_whatsapp).trim();

      // Misma RegEx internacional que en CreateButcherShop
      const phoneRegex = /^\+?[1-9]\d{7,14}$/;
      if (!phoneRegex.test(cleanedPhone)) {
        return ['El teléfono de WhatsApp debe tener un formato válido (ej. +50212345678 o entre 8 y 15 dígitos)'];
      }
    }

    // 4. Validar 'direccion' (Opcional)
    let cleanedDireccion: string | undefined = undefined;
    if (direccion !== undefined && direccion !== null && direccion !== '') {
      if (typeof direccion !== 'string') {
        return ['La dirección debe ser un texto válido'];
      }
      cleanedDireccion = direccion.trim();
      if (cleanedDireccion.length < 5) {
        return ['La dirección debe tener al menos 5 caracteres'];
      }
      if (cleanedDireccion.length > 255) {
        return ['La dirección no puede exceder los 255 caracteres'];
      }
    }

    // 5. Validar 'activo' (Opcional - para activar/desactivar la carnicería)
    let parsedActivo: boolean | undefined = undefined;
    if (activo !== undefined && activo !== null) {
      if (typeof activo === 'boolean') {
        parsedActivo = activo;
      } else if (activo === 'true' || activo === 'false') {
        parsedActivo = activo === 'true';
      } else {
        return ['El campo activo debe ser un valor booleano (true o false)'];
      }
    }

    return [
      undefined,
      new UpdateButcherShop(
        parsedId,
        cleanedNombre,
        cleanedPhone,
        cleanedDireccion,
        parsedActivo
      )
    ];
  }
}