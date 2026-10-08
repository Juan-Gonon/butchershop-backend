import jwt, { SignOptions } from 'jsonwebtoken';
import { envs } from './envs.js';

const JWT_SEED = envs.JWT_SEED;

export class JwtAdapter {

  /**
   * Genera un token JWT firmado asíncronamente
   * @param payload Objeto con la información a codificar
   * @param duration Duración del token (ej. '2h', '1d', '7d')
   */

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static async generateToken(payload: Record<string, any>, duration = '2h'): Promise<string | null> {
    return new Promise((resolve) => {
      const options: SignOptions = {
        expiresIn: duration as SignOptions['expiresIn']
      };

      jwt.sign(payload, JWT_SEED, options, (err, token) => {
        if (err) return resolve(null);
        resolve(token!);
      });
    });
  }

  /**
   * Verifica la validez de un JWT token
   * @param token Token en string enviado por el cliente
   */
  static async validateToken<T>(token: string): Promise<T | null> {
    return new Promise((resolve) => {
      jwt.verify(token, JWT_SEED, (err, decoded) => {
        if (err) return resolve(null);
        resolve(decoded as T);
      });
    });
  }
}