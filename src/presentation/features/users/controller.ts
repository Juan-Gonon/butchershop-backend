import { Response } from 'express';
import { CustomError } from '../../../domain/errors/custom.error.js';
import { AuthenticatedRequest } from '../../../domain/interfaces/authenticatesRequest.interface.js';
import { CreateUserDto } from '../../../domain/Dtos/users/createUser.Dtos.js';
import { UserService } from '../../services/user.service.js';

export class UserController{
  constructor(public readonly userService: UserService){}

  private handleError = (error: unknown, res: Response) => {
    if (error instanceof CustomError) {
      return res.status(error.statusCode).json({ ok: false, error: error.message });
    }

    return res.status(500).json({ ok: false, error: 'Internal server error' });
  };

  public getAllUsers = async (req: AuthenticatedRequest, res: Response) => {
    throw 'implemnt';
  };

  public createUser = async(req: AuthenticatedRequest, res: Response) => {
    const creatorRoleId = Number(req.user!.id_rol);
    const [error, createUserDto] = CreateUserDto.create(req.body);

    if(error) return res.status(400).json({ok: false, error});

    this.userService
      .CreateUser(createUserDto!, creatorRoleId)
      .then((user) => res.status(201).json({ok: true, user}))
      .catch((error) => this.handleError(error, res));
  };

  public updateUser = async (req: AuthenticatedRequest, res: Response) => {
    throw 'Implement';
  };

}