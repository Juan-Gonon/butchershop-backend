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
    const { nombre, usuario, password, id_carniceria, id_rol, email } = object;

    // 1. Validaciones básicas de presencia
    if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
      return ['El nombre es requerido y debe ser texto'];
    }

    if (!usuario || typeof usuario !== 'string' || usuario.trim().length < 3) {
      return ['El usuario es requerido y debe tener al menos 3 caracteres'];
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return ['La contraseña es requerida y debe tener al menos 6 caracteres'];
    }

    if (!id_carniceria || isNaN(Number(id_carniceria))) {
      return ['El id_carniceria es requerido y debe ser un número válido'];
    }

    if (!id_rol || isNaN(Number(id_rol))) {
      return ['El id_rol es requerido y debe ser un número válido'];
    }

    // 2. Validación opcional de email
    if (email) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email)) {
        return ['El formato del correo electrónico no es válido'];
      }
    }

    return [
      undefined,
      new CreateUserDto(
        nombre.trim(),
        usuario.trim().toLowerCase(),
        password,
        Number(id_carniceria),
        Number(id_rol),
        email ? email.trim().toLowerCase() : undefined
      )
    ];
  }
}