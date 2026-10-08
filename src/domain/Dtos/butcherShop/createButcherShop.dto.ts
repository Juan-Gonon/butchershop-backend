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
    if (nombre.trim().length < 3) return ['El nombre debe tener al menos 3 caracteres'];

    return [
      undefined,
      new CreateButcherShop(
        nombre.trim(),
        telefono_whatsapp ? String(telefono_whatsapp).trim() : undefined,
        direccion ? String(direccion).trim() : undefined
      )
    ];
  }
}