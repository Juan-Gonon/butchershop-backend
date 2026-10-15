import { Response } from 'express';
import { AuthenticatedRequest } from '../../../domain/interfaces/authenticatesRequest.interface.js';
import { getTenantCarniceriaId } from '../../shared/get.tenant.js';
import { CustomError } from '../../../domain/errors/custom.error.js';
import { ShippingAddressesService } from '../../services/shippingAddress.service.js';

export class ShippingAddressesController {
  constructor(private readonly shippingAddressesService: ShippingAddressesService) {}

  private handleError = (error: unknown, res: Response) => {
    if (error instanceof CustomError) {
      return res.status(error.statusCode).json({ ok: false, error: error.message });
    }
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  };

  public getActiveAddresses = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: 'Unauthorized - No user found' });
    }

    const { uuid, id_carniceria, id_rol } = req.user;

    if (!uuid || !id_carniceria || !id_rol) {
      return res.status(400).json({ ok: false, error: 'Invalid data' });
    }

    const idCarniceria = getTenantCarniceriaId(req, id_carniceria);

    this.shippingAddressesService.getActiveShippingAddresses(idCarniceria)
      .then((addresses) => res.status(200).json({ ok: true, addresses }))
      .catch((error) => this.handleError(error, res));
  };
}