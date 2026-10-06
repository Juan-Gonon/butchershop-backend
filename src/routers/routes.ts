import { Router } from 'express';
import { AuthRouter } from '../presentation/features/Auth/routes.js';

export class AppRouter {

  static get router(): Router {

    const router = Router();

    router.use('/api/auth', AuthRouter.routes);

    return router;

  }
}