import { Response } from 'express';
import { AuthenticatedRequest } from '../../../domain/interfaces/authenticatesRequest.interface.js';
import { getTenantCarniceriaId } from '../../shared/get.tenant.js';
import { ClientsService } from '../../services/clients.service.js';
import { CustomError } from '../../../domain/errors/custom.error.js';

export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  private handleError = (error: unknown, res: Response) => {
    if (error instanceof CustomError) {
      return res.status(error.statusCode).json({ ok: false, error: error.message });
    }
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  };

  public searchClients = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: 'Unauthorized - No user found' });
    }

    const { uuid, id_carniceria, id_rol } = req.user;

    if (!uuid || !id_carniceria || !id_rol) {
      return res.status(400).json({ ok: false, error: 'Invalid data' });
    }

    const idCarniceria = getTenantCarniceriaId(req, id_carniceria);
    const query = (req.query.query as string) || '';

    this.clientsService.searchClients(idCarniceria, query)
      .then((clients) => res.status(200).json({ ok: true, clients }))
      .catch((error) => this.handleError(error, res));
  };
}