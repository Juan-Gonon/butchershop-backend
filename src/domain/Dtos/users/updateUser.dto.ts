export class UpdateUserDto {
  private constructor(
    public readonly id: number,
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
    const { id, nombre, usuario, password, id_carniceria, id_rol, email, activo } = object;

    // 1. Validar ID del usuario a actualizar (Obligatorio y entero positivo)
    const parsedId = Number(id);
    if (!id || isNaN(parsedId) || !Number.isInteger(parsedId) || parsedId <= 0) {
      return ['El id del usuario es obligatorio y debe ser un entero positivo válido'];
    }

    // 2. Validación de 'nombre' (Opcional)
    let cleanedNombre: string | undefined = undefined;
    if (nombre !== undefined && nombre !== null) {
      if (typeof nombre !== 'string' || nombre.trim().length === 0) {
        return ['El nombre debe ser un texto válido'];
      }
      cleanedNombre = nombre.trim();
    }

    // 3. Validación de 'usuario' (Opcional)
    let cleanedUsuario: string | undefined = undefined;
    if (usuario !== undefined && usuario !== null) {
      if (typeof usuario !== 'string' || usuario.trim().length < 3) {
        return ['El usuario debe ser un texto con al menos 3 caracteres'];
      }
      cleanedUsuario = usuario.trim().toLowerCase();
    }

    // 4. Validación de 'password' (Opcional)
    let cleanedPassword: string | undefined = undefined;
    if (password !== undefined && password !== null && password !== '') {
      if (typeof password !== 'string') {
        return ['La contraseña debe ser un texto válido'];
      }
      if (password.length < 6) {
        return ['La contraseña debe tener al menos 6 caracteres'];
      }
      const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).+$/;
      if (!passwordRegex.test(password)) {
        return ['La contraseña debe contener al menos una letra y un número'];
      }
      cleanedPassword = password;
    }

    // 5. Validación de 'id_carniceria' (Opcional)
    let parsedCarniceriaId: number | undefined = undefined;
    if (id_carniceria !== undefined && id_carniceria !== null) {
      parsedCarniceriaId = Number(id_carniceria);
      if (isNaN(parsedCarniceriaId) || !Number.isInteger(parsedCarniceriaId) || parsedCarniceriaId <= 0) {
        return ['El id_carniceria debe ser un número entero positivo (ej. 1, 2)'];
      }
    }

    // 6. Validación de 'id_rol' (Opcional)
    let parsedRolId: number | undefined = undefined;
    if (id_rol !== undefined && id_rol !== null) {
      parsedRolId = Number(id_rol);
      if (isNaN(parsedRolId) || !Number.isInteger(parsedRolId) || parsedRolId <= 0) {
        return ['El id_rol debe ser un número entero positivo (ej. 1, 2)'];
      }
    }

    // 7. Validación de 'email' (Opcional)
    let cleanedEmail: string | undefined = undefined;
    if (email !== undefined && email !== null && email !== '') {
      if (typeof email !== 'string') {
        return ['El correo electrónico debe ser un texto válido'];
      }
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email.trim())) {
        return ['El formato del correo electrónico no es válido'];
      }
      cleanedEmail = email.trim().toLowerCase();
    }

    // 8. Validación de 'activo' (Opcional - para activar/desactivar usuarios)
    let parsedActivo: boolean | undefined = undefined;
    if (activo !== undefined && activo !== null) {
      if (typeof activo !== 'boolean') {
        return ['El campo activo debe ser un valor booleano (true o false)'];
      }
      parsedActivo = activo;
    }

    return [
      undefined,
      new UpdateUserDto(
        parsedId,
        cleanedNombre,
        cleanedUsuario,
        cleanedPassword,
        parsedCarniceriaId,
        parsedRolId,
        cleanedEmail,
        parsedActivo
      )
    ];
  }
}