import { Request, Response } from 'express';
import { AuthService } from '../../services/auth.service.js';
import { CreateUserDto } from '../../../domain/Dtos/users/createUser.Dtos.js';

export class AuthController {

  constructor(private readonly authService: AuthService){}

  public loginUser = async (req: Request, res: Response) => {
    
    this.authService
      .testConection()
      .then(roles => res.json({ok: true, roles}))
      .catch((error) => res.status(500).json({ok: false, error}));
  };

  public createUser = async(req: Request, res: Response) => {
    const [error, createUserDto] = CreateUserDto.create(req.body);

    if(error) return res.status(400).json({ok: false, error});

    return res.json({ok: true, createUserDto});
  };

  public revalidateToken = async (req: Request, res: Response) => {
    res.json({data: 'Revalidate'});
  };
}