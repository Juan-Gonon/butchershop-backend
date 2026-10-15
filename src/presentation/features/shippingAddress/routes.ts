import { Router } from 'express';
import { ShippingAddressesController } from './controller.js';
import { AuthMiddleware } from '../../middleware/validateJWT.js';
import { RoleMiddleware } from '../../middleware/validateRole.js';
import { Role } from '../../../domain/types/roles.enums.js';
import { ShippingAddressesService } from '../../services/shippingAddress.service.js';

export class ShippingAddressesRouter {
  static get router(): Router {
    const router = Router();
    const service = new ShippingAddressesService();
    const controller = new ShippingAddressesController(service);

    router.use(AuthMiddleware.validateJWT);
    router.use(RoleMiddleware.authorizeRoles(Role.ADMIN, Role.OPERADOR));

    router.get('/', controller.getActiveAddresses);
    router.post('/', controller.createAddress);
    router.patch('/:id', controller.updateAddress);
    router.delete('/:id', controller.deleteAddress);

    return router;
  }
}