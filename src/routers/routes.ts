import { Router } from 'express';
import { AuthRouter } from '../presentation/features/Auth/routes.js';
import { ButcherShopRouter } from '../presentation/features/butcherShop/routes.js';

export class AppRouter {

  static get router(): Router {

    const router = Router();

    router.use('/api/auth', AuthRouter.routes);
    router.use('/api/butcher-shop', ButcherShopRouter.routes);

    return router;

  }
}