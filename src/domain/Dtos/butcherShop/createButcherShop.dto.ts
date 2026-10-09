export class CreateButcherShop {
  private constructor(
    public readonly nombre: string,
    public readonly telefono_whatsapp?: string,
    public readonly direccion?: string
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static create(object: Record<string, any>): [string?, CreateButcherShop?] {
    const { nombre, telefono_whatsapp, direccion } = object;

    if (!nombre) return ['El nombre de la carnicería es obligatorio'];
    if (typeof nombre !== 'string') return ['El nombre debe ser un texto válido'];
    
    const trimmedNombre = nombre.trim();
    if (trimmedNombre.length < 3) return ['El nombre debe tener al menos 3 caracteres'];
    if (trimmedNombre.length > 100) return ['El nombre no puede exceder los 100 caracteres'];

    let cleanedPhone: string | undefined = undefined;
    if (telefono_whatsapp !== undefined && telefono_whatsapp !== null && telefono_whatsapp !== '') {
      if (typeof telefono_whatsapp !== 'string' && typeof telefono_whatsapp !== 'number') {
        return ['El teléfono debe ser un valor válido'];
      }

      cleanedPhone = String(telefono_whatsapp).trim();
      
      // RegEx para validar formato internacional E.164 o local (ej. +50212345678 o 12345678)
      // Acepta un '+' opcional seguido de 8 a 15 números.
      const phoneRegex = /^\+?[1-9]\d{7,14}$/;
      if (!phoneRegex.test(cleanedPhone)) {
        return ['El teléfono de WhatsApp debe tener un formato válido (ej. +50212345678 o entre 8 y 15 dígitos)'];
      }
    }

    let cleanedDireccion: string | undefined = undefined;
    if (direccion !== undefined && direccion !== null && direccion !== '') {
      if (typeof direccion !== 'string') return ['La dirección debe ser un texto válido'];
      
      cleanedDireccion = direccion.trim();
      if (cleanedDireccion.length < 5) return ['La dirección debe tener al menos 5 caracteres'];
      if (cleanedDireccion.length > 255) return ['La dirección no puede exceder los 255 caracteres'];
    }

    return [
      undefined,
      new CreateButcherShop(
        trimmedNombre,
        cleanedPhone,
        cleanedDireccion
      )
    ];
  }
}