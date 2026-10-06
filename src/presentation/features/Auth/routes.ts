import { Router } from 'express';

export class AuthRouter{
  
  static get routes(): Router{

    const router = Router();

    router.post('/', (req, res) => {
      res.json({res: 'Bienvenido'});
    });

    router.post('/new', (req, res) => {
      res.json({res: 'new'});
    });

    router.get('/renew', (req, res) => {
      res.json({res: 'validar token'});
    });

    return router;
    
  }
}