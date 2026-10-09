import { Router } from 'express';
import { AuthMiddleware } from '../../middleware/validateJWT.js';
import { RoleMiddleware } from '../../middleware/validateRole.js';
import { Role } from '../../../domain/types/roles.enums.js';
import { UserController } from './controller.js';
import { UserService } from '../../services/user.service.js';

export class UserRouter{

  static get router():Router{
    const router = Router();

    const service = new UserService();
    const controller = new UserController(service);

    // Todas las rutas de usuarios requieren autenticación
    router.use(AuthMiddleware.validateJWT);

    // Solo SUPER_ADMIN y ADMIN pueden administrar usuarios
    router.use(RoleMiddleware.authorizeRoles(Role.SUPER_ADMIN, Role.ADMIN));

    router.get('/', controller.getAllUsers);
    router.post('/', controller.createUser);
    //router.put('/:id', controller.updateUser);

    return router;
  }
}