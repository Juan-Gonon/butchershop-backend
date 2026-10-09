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

    // 1. Validaciones de textos básicos
    if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
      return ['El nombre es requerido y debe ser texto'];
    }

    if (!usuario || typeof usuario !== 'string' || usuario.trim().length < 3) {
      return ['El usuario es requerido y debe tener al menos 3 caracteres'];
    }

    // 2. Validación de contraseña más robusta
    if (!password || typeof password !== 'string') {
      return ['La contraseña es requerida y debe ser un texto válido'];
    }

    if (password.length < 6) {
      return ['La contraseña debe tener al menos 6 caracteres'];
    }

    // Comprobar que incluya al menos una letra y un número
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).+$/;
    if (!passwordRegex.test(password)) {
      return ['La contraseña debe contener al menos una letra y un número'];
    }

    // 3. Validaciones de IDs (Enteros Positivos)
    const parsedCarniceriaId = Number(id_carniceria);
    if (!id_carniceria || isNaN(parsedCarniceriaId) || !Number.isInteger(parsedCarniceriaId) || parsedCarniceriaId <= 0) {
      return ['El id_carniceria es requerido y debe ser un número entero positivo (ej. 1, 2)'];
    }

    const parsedRolId = Number(id_rol);
    if (!id_rol || isNaN(parsedRolId) || !Number.isInteger(parsedRolId) || parsedRolId <= 0) {
      return ['El id_rol es requerido y debe ser un número entero positivo (ej. 1, 2)'];
    }

    // 4. Validación opcional de email
    if (email) {
      if (typeof email !== 'string') {
        return ['El correo electrónico debe ser un texto válido'];
      }
      
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email.trim())) {
        return ['El formato del correo electrónico no es válido'];
      }
    }

    return [
      undefined,
      new CreateUserDto(
        nombre.trim(),
        usuario.trim().toLowerCase(),
        password,
        parsedCarniceriaId,
        parsedRolId,
        email ? email.trim().toLowerCase() : undefined
      )
    ];
  }
}