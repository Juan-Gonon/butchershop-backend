import { Router } from 'express';
import { PedidosController } from './controller.js';

export class PedidosRouter{

  static get routes(): Router{
    const router = Router();
    const controller = new PedidosController();

    router.get('/metrics', controller.metrics);

    return router;
  }
}