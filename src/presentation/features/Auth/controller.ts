import { Request, Response } from 'express';
import { AuthService } from '../../services/auth.service.js';
import { CreateUserDto } from '../../../domain/Dtos/users/createUser.Dtos.js';
import { CustomError } from '../../../domain/errors/custom.error.js';
import { LoginUserDto } from '../../../domain/Dtos/users/loginUser.Dtos.js';
import { AuthenticatedRequest } from '../../../domain/interfaces/authenticatesRequest.interface.js';

export class AuthController {

  constructor(private readonly authService: AuthService){}

  private handleError = (error: unknown, res: Response) => {
    if (error instanceof CustomError) {
      return res.status(error.statusCode).json({ ok: false, error: error.message });
    }

    //console.error(`${error}`);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  };

  public loginUser = async (req: Request, res: Response) => {
    const [error, loginUserDto] = LoginUserDto.create(req.body);

    if(error) return res.status(400).json({ok: false, error});

    this.authService.loginUser(loginUserDto!)
      .then((user) => res.status(201).json({ok: true, ...user}))
      .catch((error) => this.handleError(error, res));

  };

  public createUser = async(req: Request, res: Response) => {
    const [error, createUserDto] = CreateUserDto.create(req.body);

    if(error) return res.status(400).json({ok: false, error});

    this.authService
      .CreateUser(createUserDto!)
      .then((user) => res.status(201).json({ok: true, user}))
      .catch((error) => this.handleError(error, res));
  };

  public renewToken = async (req: AuthenticatedRequest, res: Response) => {
    // req.user fue inyectado de forma segura por el AuthMiddleware
    const userId = req.user!.id;

    this.authService
      .renewToken(userId)
      .then((data) => res.json({ ok: true, ...data }))
      .catch((error) => this.handleError(error, res));
  };
}