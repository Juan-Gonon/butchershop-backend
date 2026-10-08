import { Router } from 'express';
import { AuthController } from './controller.js';
import { AuthService } from '../../services/auth.service.js';
import { AuthMiddleware } from '../../middleware/validateJWT.js';

export class AuthRouter{
  
  static get routes(): Router{

    const router = Router();
    const authService = new AuthService();
    const controller = new AuthController(authService);

    router.post('/' , controller.loginUser);

    router.post('/new', controller.createUser);

    router.get('/renew', [AuthMiddleware.validateJWT],  controller.renewToken);

    return router;
    
  }
}