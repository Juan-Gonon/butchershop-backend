import { Router } from 'express';
import { AuthRouter } from '../presentation/features/Auth/routes.js';
import { ButcherShopRouter } from '../presentation/features/butcherShop/routes.js';
import { UserRouter } from '../presentation/features/users/routes.js';

export class AppRouter {

  static get router(): Router {

    const router = Router();

    router.use('/api/auth', AuthRouter.routes);
    router.use('/api/butcher-shop', ButcherShopRouter.routes);
    router.use('/api/user', UserRouter.router);

    return router;

  }
}