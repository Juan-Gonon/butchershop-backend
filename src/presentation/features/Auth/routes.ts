import { Router } from 'express';
import { AuthController } from './controller.js';
import { AuthService } from '../../services/auth.service.js';

export class AuthRouter{
  
  static get routes(): Router{

    const router = Router();
    const authService = new AuthService();
    const controller = new AuthController(authService);

    router.post('/' , controller.loginUser);

    router.post('/new', controller.createUser);

    router.get('/renew', controller.revalidateToken);

    return router;
    
  }
}