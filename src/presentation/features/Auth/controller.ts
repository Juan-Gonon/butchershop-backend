import { Request, Response } from 'express';
import { AuthService } from '../../services/auth.service.js';

export class AuthController {

  constructor(private readonly authService: AuthService){}

  public loginUser = async (req: Request, res: Response) => {
    
    this.authService
      .testConection()
      .then(roles => res.json({ok: true, roles}))
      .catch((error) => res.status(500).json({ok: false, error}));
  };

  public createUser = async(req: Request, res: Response) => {
    res.json({data: req.body});
  };

  public revalidateToken = async (req: Request, res: Response) => {
    res.json({data: 'Revalidate'});
  };
}