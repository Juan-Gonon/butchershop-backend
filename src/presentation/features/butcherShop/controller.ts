import { Response } from 'express';
import { AuthenticatedRequest } from '../../../domain/interfaces/authenticatesRequest.interface.js';
import { ButcherShopService } from '../../services/butcherShop.service.js';
import { CustomError } from '../../../domain/errors/custom.error.js';
import { CreateButcherShop } from '../../../domain/Dtos/butcherShop/createButcherShop.dto.js';

export class ButcherShopController{
  constructor(public readonly butcherShopService: ButcherShopService){}

  private handleError = (error: unknown, res: Response) => {
    if (error instanceof CustomError) {
      return res.status(error.statusCode).json({ ok: false, error: error.message });
    }
  
    //console.error(`${error}`);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  };

  public getAllButcherShop = async (req: AuthenticatedRequest, res: Response) => {

    this.butcherShopService.getAllBucherShop()
      .then((butcherShop) => res.status(201).json({ok: true, butcherShop}))
      .catch((error) => this.handleError(error, res));
  };

  public createButcherShop = async (req: AuthenticatedRequest, res: Response) => {
    const [error, createBtucherShop ] = CreateButcherShop.create(req.body);

    if(error) return res.status(400).json({ok: false, error});

    return res.status(201).json(createBtucherShop);
  };
  public updateButcherShop = async (req: AuthenticatedRequest, res: Response) => {
    throw 'Implement';
  };

  public deleteButcherShop = async (req: AuthenticatedRequest, res: Response) => {
    throw 'Implement';
  };
}