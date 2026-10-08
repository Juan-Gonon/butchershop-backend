import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../domain/interfaces/authenticatesRequest.interface.js';
import { CustomError } from '../../domain/errors/custom.error.js';

export class RoleMiddleware {

  static authorizeRoles(...allowedRoleIds: number[]) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        if (!req.user) {
          throw CustomError.internalServer('validateJWT debe ejecutarse antes de authorizeRoles');
        }

        const userRoleId = Number(req.user.id_rol);

        // Verificar si el rol del usuario está dentro de los permitidos
        if (!allowedRoleIds.includes(userRoleId)) {
          throw CustomError.forbidden('No tienes permisos suficientes para realizar esta acción');
        }

        next();
      } catch (error) {
        if (error instanceof CustomError) {
          return res.status(error.statusCode).json({ ok: false, error: error.message });
        }
        return res.status(500).json({ ok: false, error: 'Internal server error' });
      }
    };
  }
}