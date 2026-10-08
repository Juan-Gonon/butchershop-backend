import { Role } from '../types/roles.enums.js';

export interface JwtPayload {
  id: string | number;
  id_carniceria: string | number;
  id_rol: Role;
}