import { CustomError } from '../../domain/errors/custom.error.js';
import { AuthenticatedRequest } from '../../domain/interfaces/authenticatesRequest.interface.js';
import { Role } from '../../domain/types/roles.enums.js';

export const getTenantCarniceriaId = (
  req: AuthenticatedRequest, 
  bodyCarniceriaId?: number | string
): number => {
  if (!req.user) {
    throw CustomError.internalServer('Se requiere autenticación para determinar la carnicería');
  }

  const userRoleId = Number(req.user.id_rol);

  // Si es Super Admin y envió un id_carniceria explícito en el body/query
  if (userRoleId === Role.SUPER_ADMIN && bodyCarniceriaId) {
    return Number(bodyCarniceriaId);
  }

  // Para cualquier otro usuario, se garantiza la carnicería de su JWT
  return Number(req.user.id_carniceria);
};