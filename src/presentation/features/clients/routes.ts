import { Router } from 'express';
import { ClientsController } from './controller.js';
import { ClientsService } from '../../services/clients.service.js';
import { AuthMiddleware } from '../../middleware/validateJWT.js';
import { RoleMiddleware } from '../../middleware/validateRole.js';
import { Role } from '../../../domain/types/roles.enums.js';

export class ClientsRouter {
  static get router(): Router {
    const router = Router();
    const service = new ClientsService();
    const controller = new ClientsController(service);

    router.use(AuthMiddleware.validateJWT);
    router.use(RoleMiddleware.authorizeRoles(Role.ADMIN, Role.OPERADOR));

    router.get('/search', controller.searchClients);

    return router;
  }
}