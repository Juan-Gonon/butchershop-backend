import { compareSync, genSaltSync, hashSync } from 'bcryptjs';

export class BcryptAdapter {
  /**
   * Genera un hash seguro a partir de una contraseña en texto plano.
   */
  static hash(password: string): string {
    const salt = genSaltSync(10);
    return hashSync(password, salt);
  }

  /**
   * Compara una contraseña en texto plano contra el hash almacenado.
   */
  static compare(password: string, hashed: string): boolean {
    return compareSync(password, hashed);
  }
}