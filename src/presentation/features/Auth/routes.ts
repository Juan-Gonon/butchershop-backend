import { Router } from 'express';
import { AuthController } from './controller.js';

export class AuthRouter{
  
  static get routes(): Router{

    const router = Router();
    const controller = new AuthController();

    router.post('/' , controller.loginUser);

    router.post('/new', controller.createUser);

    router.get('/renew', controller.revalidateToken);

    return router;
    
  }
}