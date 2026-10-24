import { Router } from 'express';
import { AuthMiddleware } from '../../middleware/validateJWT.js';
import { RoleMiddleware } from '../../middleware/validateRole.js';
import { Role } from '../../../domain/types/roles.enums.js';
import { CatalogoProductosController } from './controller.js';
import { CatalogoProductosService } from '../../services/catalogoProductos.service.js';

export class CatalogoProductosRouter {
  static get routes(): Router {
    const router = Router();
    const service = new CatalogoProductosService();
    const controller = new CatalogoProductosController(service);

    router.use(AuthMiddleware.validateJWT);
    router.use(RoleMiddleware.authorizeRoles(Role.ADMIN, Role.OPERADOR));

    router.get('/', controller.listar);

    return router;
  }
}
