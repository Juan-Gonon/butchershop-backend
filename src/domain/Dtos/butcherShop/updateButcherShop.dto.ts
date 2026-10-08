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

    if (!id || isNaN(Number(id))) return ['El ID de la carnicería es obligatorio y debe ser numérico'];

    if (nombre !== undefined) {
      if (typeof nombre !== 'string' || nombre.trim().length < 3) {
        return ['El nombre debe ser un texto de al menos 3 caracteres'];
      }
    }

    return [
      undefined,
      new UpdateButcherShop(
        Number(id),
        nombre ? nombre.trim() : undefined,
        telefono_whatsapp ? String(telefono_whatsapp).trim() : undefined,
        direccion ? direccion.trim() : undefined,
        activo !== undefined ? Boolean(activo) : undefined
      )
    ];
  }
}