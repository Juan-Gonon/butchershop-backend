import { Router } from 'express';
import { PedidosController } from './controller.js';
import { AuthMiddleware } from '../../middleware/validateJWT.js';
import { RoleMiddleware } from '../../middleware/validateRole.js';
import { Role } from '../../../domain/types/roles.enums.js';

export class PedidosRouter{

  static get routes(): Router{
    const router = Router();
    const controller = new PedidosController();

    router.use(AuthMiddleware.validateJWT);
    router.use(RoleMiddleware.authorizeRoles(Role.ADMIN, Role.OPERADOR));
  
    router.get('/metrics', controller.metrics);

    return router;
  }
}