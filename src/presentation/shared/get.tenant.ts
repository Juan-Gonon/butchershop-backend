import { CustomError } from '../../domain/errors/custom.error.js';
import { AuthenticatedRequest } from '../../domain/interfaces/authenticatesRequest.interface.js';
import { Role } from '../../domain/types/roles.enums.js';

export const getTenantCarniceriaId = (
  req: AuthenticatedRequest, 
  targetCarniceriaId?: number | string
): number => {
  if (!req.user) {
    throw CustomError.internalServer('Se requiere autenticación para determinar la carnicería');
  }

  const userRoleId = Number(req.user.id_rol);

  if (userRoleId === Role.SUPER_ADMIN && targetCarniceriaId) {
    const parsedId = Number(targetCarniceriaId);
    
    if (isNaN(parsedId) || parsedId <= 0) {
      throw CustomError.badRequest('El ID de la carnicería debe ser un número válido');
    }
    
    return parsedId;
  }

  return Number(req.user.id_carniceria);
};