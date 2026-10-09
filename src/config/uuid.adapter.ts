import { randomUUID } from 'node:crypto';
import { z } from 'zod';

export class UuidAdapter {

  /**
   * Genera un UUID v4 nativo 
   */
  static generate(): string {
    return randomUUID();
  }

  /**
   * Valida si un string recibido cumple con el formato estándar de UUID
   */
  static validate(uuid: string): boolean {
    return z.string().uuid().safeParse(uuid).success;
  }
}