import { Role } from '../types/roles.enums.js';

export interface JwtPayload {
  uuid: string;
  id_carniceria: number;
  id_rol: Role;
}
// | string, id and id_carnicería