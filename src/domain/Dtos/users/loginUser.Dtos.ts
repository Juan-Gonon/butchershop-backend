export class LoginUserDto {
  constructor(
    public readonly usuario: string,
    public readonly password: string
  ){}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static create(object: Record<string, any>):[string?, LoginUserDto?]{
    const { usuario, password } = object;

    if(!usuario || typeof usuario !== 'string' || usuario.trim().length === 0){
      return ['El usuario es requerido'];
    }

    if(!password || typeof password !== 'string' || password.length === 0){
      return ['La contraseña es requerida'];
    }
    
    return [
      undefined,
      new LoginUserDto(usuario.trim().toLowerCase(), password)
    ];
  }
}