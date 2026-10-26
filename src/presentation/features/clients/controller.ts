import { Response } from 'express';
import { AuthenticatedRequest } from '../../../domain/interfaces/authenticatesRequest.interface.js';
import { getTenantCarniceriaId } from '../../shared/get.tenant.js';
import { ClientsService } from '../../services/clients.service.js';
import { CustomError } from '../../../domain/errors/custom.error.js';
import { ListClientsDto } from '../../../domain/Dtos/clients/listClients.dto.js';
import { CreateClientDto } from '../../../domain/Dtos/clients/createClient.dto.js';
import { UpdateClientDto } from '../../../domain/Dtos/clients/updateClient.dto.js';

export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  private handleError = (error: unknown, res: Response) => {
    if (error instanceof CustomError) {
      return res.status(error.statusCode).json({ ok: false, error: error.message });
    }
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  };

  public listar = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: 'Unauthorized - No user found' });
    }

    const [validationError, dto] = ListClientsDto.create(req.query);
    if (validationError) return res.status(400).json({ ok: false, error: validationError });

    try {
      const idCarniceria = getTenantCarniceriaId(req);
      const result = await this.clientsService.listar(idCarniceria, dto!);
      return res.status(200).json({ ok: true, ...result });
    } catch (error) {
      return this.handleError(error, res);
    }
  };

  public crear = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: 'Unauthorized - No user found' });
    }

    const [validationError, dto] = CreateClientDto.create(req.body);
    if (validationError) return res.status(400).json({ ok: false, error: validationError });

    try {
      const idCarniceria = getTenantCarniceriaId(req);
      const result = await this.clientsService.crear(idCarniceria, dto!);
      return res.status(201).json({ ok: true, data: result });
    } catch (error) {
      return this.handleError(error, res);
    }
  };

  public actualizar = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: 'Unauthorized - No user found' });
    }

    const [validationError, dto] = UpdateClientDto.create({
      ...(req.body ?? {}),
      uuid: req.params.uuid
    });
    if (validationError) return res.status(400).json({ ok: false, error: validationError });

    try {
      const idCarniceria = getTenantCarniceriaId(req);
      const result = await this.clientsService.actualizar(idCarniceria, dto!.uuid, dto!);
      return res.status(200).json({ ok: true, data: result });
    } catch (error) {
      return this.handleError(error, res);
    }
  };

  public searchClients = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: 'Unauthorized - No user found' });
    }

    const { uuid, id_carniceria, id_rol } = req.user;

    if (!uuid || !id_carniceria || !id_rol) {
      return res.status(400).json({ ok: false, error: 'Invalid data' });
    }

    const idCarniceria = getTenantCarniceriaId(req);
    const query = (req.query.query as string) || '';

    this.clientsService.searchClients(idCarniceria, query)
      .then((clients) => res.status(200).json({ ok: true, clients }))
      .catch((error) => this.handleError(error, res));
  };
}
