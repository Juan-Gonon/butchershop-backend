import { Router } from 'express';
import { PreparationsController } from './controller.js';
import { AuthMiddleware } from '../../middleware/validateJWT.js';
import { RoleMiddleware } from '../../middleware/validateRole.js';
import { Role } from '../../../domain/types/roles.enums.js';
import { PreparationsService } from '../../services/preparation.service.js';

export class PreparationsRouter {
  static get router(): Router {
    const router = Router();
    const service = new PreparationsService();
    const controller = new PreparationsController(service);

    router.use(AuthMiddleware.validateJWT);
    router.use(RoleMiddleware.authorizeRoles(Role.ADMIN, Role.OPERADOR));

    router.get('/', controller.getActivePreparations);

    return router;
  }
}