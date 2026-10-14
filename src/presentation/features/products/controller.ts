import { Response } from 'express';
import { AuthenticatedRequest } from '../../../domain/interfaces/authenticatesRequest.interface.js';
import { getTenantCarniceriaId } from '../../shared/get.tenant.js';
import { ProductsService } from '../../services/products.service.js';
import { CustomError } from '../../../domain/errors/custom.error.js';

export class ProductsController{
  constructor(private readonly productsService: ProductsService){}

  private handleError = (error: unknown, res: Response) => {
    if (error instanceof CustomError) {
      return res.status(error.statusCode).json({ ok: false, error: error.message });
    }
    
    //console.error(`${error}`);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  };

  public getAllProducts = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: 'Unauthorized - No user found' });
    }

    const { uuid, id_carniceria, id_rol } = req.user;

    // 1. Validar los campos individuales
    if(!uuid) return res.status(400).json({ok: false, error: 'Invalid data: missing uuid'});
    if(!id_carniceria) return res.status(400).json({ok: false, error: 'Invalid data: missing id_carniceria'});
    if(!id_rol) return res.status(400).json({ok: false, error: 'Invalid data: missing id_rol'});

    const idCarniceria = getTenantCarniceriaId(req, id_carniceria);

    // const tipoCarneId = (req.query.tipoCarneId as string) || 'todos';

    this.productsService.getAllProducts(idCarniceria)
      .then((products) => res.status(200).json({ok: true, products}))
      .catch((error) => this.handleError(error, res));

  };

}
