import { AuthenticatedRequest } from '../../../domain/interfaces/authenticatesRequest.interface.js';

export class UserController{
  constructor(){}

  public getAllUsers = async (req: AuthenticatedRequest, res: Response) => {
    throw 'implemnt';
  };

  public createUser = async (req: AuthenticatedRequest, res: Response) => {
    throw 'Implement';
  };

  public updateUser = async (req: AuthenticatedRequest, res: Response) => {
    throw 'Implement';
  };

}