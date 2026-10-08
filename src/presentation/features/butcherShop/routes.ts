import { Router } from 'express';
import { AuthMiddleware } from '../../middleware/validateJWT.js';
import { RoleMiddleware } from '../../middleware/validateRole.js';
import { Role } from '../../../domain/types/roles.enums.js';
import { ButcherShopController } from './controller.js';

export class ButcherShopRouter {

  static get routes(): Router {
    const router = Router();
    const controller = new ButcherShopController();

    router.use(AuthMiddleware.validateJWT);
    router.use(RoleMiddleware.authorizeRoles(Role.SUPER_ADMIN));

    router.get('/', controller.getAllButcherShop);
    router.post('/', controller.createButcherShop);
    router.put('/', controller.updateButcherShop);
    router.delete('/', controller.deleteButcherShop);

    return router;
  }
}