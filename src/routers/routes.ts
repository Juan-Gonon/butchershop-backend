import { Router } from 'express';
import { AuthRouter } from '../presentation/features/Auth/routes.js';
import { ButcherShopRouter } from '../presentation/features/butcherShop/routes.js';
import { UserRouter } from '../presentation/features/users/routes.js';
import { PedidosRouter } from '../presentation/features/pedidos/routes.js';
import { ProductsRouter } from '../presentation/features/products/routes.js';
import { ClientsRouter } from '../presentation/features/clients/routes.js';
import { PreparationsRouter } from '../presentation/features/preparation/routes.js';
import { ShippingAddressesRouter } from '../presentation/features/shippingAddress/routes.js';
import { CatalogoProductosRouter } from '../presentation/features/catalogoProductos/routes.js';
import { ProductosCarniceriaRouter } from '../presentation/features/productosCarniceria/routes.js';

export class AppRouter {

  static get router(): Router {

    const router = Router();

    router.use('/api/auth', AuthRouter.routes);
    router.use('/api/butcher-shop', ButcherShopRouter.routes);
    router.use('/api/user', UserRouter.router);
    router.use('/api/pedidos', PedidosRouter.routes);
    router.use('/api/productos', ProductsRouter.router);
    router.use('/api/clients', ClientsRouter.router);
    router.use('/api/preparations', PreparationsRouter.router);
    router.use('/api/direcciones-envio', ShippingAddressesRouter.router);
    router.use('/api/catalogo-productos', CatalogoProductosRouter.routes);
    router.use('/api/productos-carniceria', ProductosCarniceriaRouter.routes);

    return router;

  }
}
