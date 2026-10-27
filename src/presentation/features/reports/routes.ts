import { Router } from 'express';
import { ReportsController } from './controller.js';
import { ReportsService } from '../../services/reports.service.js';
import { AuthMiddleware } from '../../middleware/validateJWT.js';
import { RoleMiddleware } from '../../middleware/validateRole.js';
import { Role } from '../../../domain/types/roles.enums.js';

export class ReportsRouter {
  static get routes(): Router {
    const router = Router();
    const service = new ReportsService();
    const controller = new ReportsController(service);

    router.use(AuthMiddleware.validateJWT);
    router.use(RoleMiddleware.authorizeRoles(Role.ADMIN, Role.OPERADOR));

    router.get('/summary', controller.summary);

    return router;
  }
}
