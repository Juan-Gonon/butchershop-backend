import { Router } from 'express';
import { AuthMiddleware } from '../../middleware/validateJWT.js';
import { RoleMiddleware } from '../../middleware/validateRole.js';
import { Role } from '../../../domain/types/roles.enums.js';
import { ProductosCarniceriaController } from './controller.js';
import { ProductosCarniceriaService } from '../../services/productosCarniceria.service.js';

export class ProductosCarniceriaRouter {
  static get routes(): Router {
    const router = Router();
    const service = new ProductosCarniceriaService();
    const controller = new ProductosCarniceriaController(service);

    router.use(AuthMiddleware.validateJWT);
    router.use(RoleMiddleware.authorizeRoles(Role.ADMIN, Role.OPERADOR));

    router.get('/', controller.listar);
    router.post('/', controller.crear);
    router.patch('/:uuid', controller.actualizar);
    router.patch('/:uuid/disponible', controller.toggleDisponibilidad);

    return router;
  }
}