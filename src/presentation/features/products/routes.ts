import { Router } from 'express';
import { AuthMiddleware } from '../../middleware/validateJWT.js';
import { RoleMiddleware } from '../../middleware/validateRole.js';
import { Role } from '../../../domain/types/roles.enums.js';
import { ProductsController } from './controller.js';

export class ProductsRouter {

  static get router (): Router{
    const router = Router();
    const controller = new ProductsController();

    router.use(AuthMiddleware.validateJWT);
    router.use(RoleMiddleware.authorizeRoles(Role.ADMIN, Role.OPERADOR));

    router.get('/pos', controller.getAllProducts );

    return router;

  }
}