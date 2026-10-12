import { Response } from 'express';
import { AuthenticatedRequest } from '../../../domain/interfaces/authenticatesRequest.interface.js';

export class PedidosController{

  public metrics = async (req: AuthenticatedRequest, res: Response) => {

    res.json({ok: true});
  };
}