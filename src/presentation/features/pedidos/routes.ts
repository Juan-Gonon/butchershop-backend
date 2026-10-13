import { Router } from 'express';
import { PedidosController } from './controller.js';
import { AuthMiddleware } from '../../middleware/validateJWT.js';
import { RoleMiddleware } from '../../middleware/validateRole.js';
import { Role } from '../../../domain/types/roles.enums.js';
import { PedidoService } from '../../services/pedidos.service.js';

export class PedidosRouter{

  static get routes(): Router{
    const router = Router();
    const service = new PedidoService();
    const controller = new PedidosController(service);

    router.use(AuthMiddleware.validateJWT);
    router.use(RoleMiddleware.authorizeRoles(Role.ADMIN, Role.OPERADOR));
  
    router.get('/metrics', controller.metrics);

    return router;
  }
}