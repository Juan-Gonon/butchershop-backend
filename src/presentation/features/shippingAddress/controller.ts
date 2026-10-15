import { Response } from 'express';
import { AuthenticatedRequest } from '../../../domain/interfaces/authenticatesRequest.interface.js';
import { getTenantCarniceriaId } from '../../shared/get.tenant.js';
import { CustomError } from '../../../domain/errors/custom.error.js';
import { ShippingAddressesService } from '../../services/shippingAddress.service.js';
import { CreateShippingAddressDto } from '../../../domain/Dtos/shippingAddress/createShippingAddress.dto.js';
import { UpdateShippingAddressDto } from '../../../domain/Dtos/shippingAddress/updateShippingAddress.dto.js';

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

  public createAddress = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: 'Unauthorized - No user found' });
    }

    const [error, createDto] = CreateShippingAddressDto.create(req.body);
    if (error) return res.status(400).json({ ok: false, error });

    const { uuid, id_carniceria, id_rol } = req.user;
    if (!uuid || !id_carniceria || !id_rol) {
      return res.status(400).json({ ok: false, error: 'Invalid data' });
    }

    const idCarniceria = getTenantCarniceriaId(req, id_carniceria);

    this.shippingAddressesService.createAddress(idCarniceria, createDto!)
      .then((address) => res.status(201).json({ ok: true, address }))
      .catch((error) => this.handleError(error, res));
  };

  public updateAddress = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: 'Unauthorized - No user found' });
    }

    const addressId = Number(req.params.id);
    if (isNaN(addressId) || addressId <= 0) {
      return res.status(400).json({ ok: false, error: 'ID de dirección inválido' });
    }

    const [error, updateDto] = UpdateShippingAddressDto.create(req.body);
    if (error) return res.status(400).json({ ok: false, error });

    const { uuid, id_carniceria, id_rol } = req.user;
    if (!uuid || !id_carniceria || !id_rol) {
      return res.status(400).json({ ok: false, error: 'Invalid data' });
    }

    const idCarniceria = getTenantCarniceriaId(req, id_carniceria);

    this.shippingAddressesService.updateAddress(idCarniceria, addressId, updateDto!)
      .then((address) => res.status(200).json({ ok: true, address }))
      .catch((error) => this.handleError(error, res));
  };

  public deleteAddress = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: 'Unauthorized - No user found' });
    }

    const addressId = Number(req.params.id);
    if (isNaN(addressId) || addressId <= 0) {
      return res.status(400).json({ ok: false, error: 'ID de dirección inválido' });
    }

    const { uuid, id_carniceria, id_rol } = req.user;
    if (!uuid || !id_carniceria || !id_rol) {
      return res.status(400).json({ ok: false, error: 'Invalid data' });
    }

    const idCarniceria = getTenantCarniceriaId(req, id_carniceria);

    this.shippingAddressesService.deleteAddress(idCarniceria, addressId)
      .then((result) => res.status(200).json({ ok: true, ...result }))
      .catch((error) => this.handleError(error, res));
  };
}