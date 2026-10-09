import { Response, NextFunction } from 'express';
import { JwtAdapter } from '../../config/jwt.adapter.js';
import { prisma } from '../../data/postgres/index.js';
import { AuthenticatedRequest } from '../../domain/interfaces/authenticatesRequest.interface.js';
import { JwtPayload } from '../../domain/interfaces/jwtPayload.interface.js';
import { CustomError } from '../../domain/errors/custom.error.js';
import { Role } from '../../domain/types/roles.enums.js';

export class AuthMiddleware {

  static async validateJWT(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    // Obtener el header Authorization

    try {
      const authorization = req.header('Authorization');

      if (!authorization) throw CustomError.unauthorized('No token provider');
      if (!authorization.startsWith('Bearer ')) throw CustomError.unauthorized('Invalid token format (must be Bearer)');

      const token = authorization.split(' ').at(1) || '';
      // Validar el JWT mediante nuestro JwtAdapter
      const payload = await JwtAdapter.validateToken<JwtPayload>(token);

      if (!payload) throw CustomError.unauthorized('Invalid or expired token');

      // Verificar en la BD si el usuario existe y está activo
      const user = await prisma.usuarios.findUnique({
        where: { id: BigInt(payload.id) }
      });

      if (!user) throw CustomError.unauthorized('Invalid token - user does not exist in the system');
      if (!user.activo) throw CustomError.unauthorized('Inactive user');

      // Inyectar el payload validado en la Request
      req.user = {
        id: Number(user.id),
        id_carniceria: Number(user.id_carniceria),
        id_rol: Number(user.id_rol) as Role
      };

      // Continuar al siguiente handler/controlador
      next();

    } catch (error) {
      if (error instanceof CustomError) {
        return res.status(error.statusCode).json({ ok: false, error: error.message });
      }

      //console.error(`${error}`);
      return res.status(500).json({ ok: false, error: 'Internal server error' });
    }
  }
}