import { Response } from 'express';
import { AuthenticatedRequest } from '../../../domain/interfaces/authenticatesRequest.interface.js';
import { getTenantCarniceriaId } from '../../shared/get.tenant.js';
import type { PedidoService } from '../../services/pedidos.service.js';
import { CustomError } from '../../../domain/errors/custom.error.js';
import { CreatePedidoDto } from '../../../domain/Dtos/pedidos/createPedidos.dto.js';
import { ListPedidosDto, PedidoUuidDto } from '../../../domain/Dtos/pedidos/getPedidos.dto.js';
import { ChangePedidoStateDto } from '../../../domain/Dtos/pedidos/changePedidoState.dto.js';
import { UpdatePedidoDetailsDto } from '../../../domain/Dtos/pedidos/updatePedidoDetails.dto.js';

export class PedidosController{
  constructor(private readonly pedidoService: PedidoService){}

  private handleError = (error: unknown, res: Response) => {
    if (error instanceof CustomError) {
      return res.status(error.statusCode).json({ ok: false, error: error.message });
    }
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  };

  public metrics = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: 'Unauthorized - No user found' });
    }

    const { uuid, id_carniceria, id_rol } = req.user;

    // 1. Validar los campos individuales
    if(!uuid) return res.status(400).json({ok: false, error: 'Invalid data: missing uuid'});
    if(!id_carniceria) return res.status(400).json({ok: false, error: 'Invalid data: missing id_carniceria'});
    if(!id_rol) return res.status(400).json({ok: false, error: 'Invalid data: missing id_rol'});

    const idCarniceria = getTenantCarniceriaId(req, id_carniceria);

    const filtro = (req.query.filtro as string) || 'hoy';

    this.pedidoService.getMetrics(uuid, idCarniceria, filtro)
      .then((data) => res.status(200).json({ok: true, data})) // Usar 200 para consultas GET exitosas
      .catch((error) => res.status(400).json({ok: false, error}));
  };

  public getVolumeTypeCarne = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: 'Unauthorized - No user found' });
    }

    const { uuid, id_carniceria, id_rol } = req.user;

    // 1. Validar los campos individuales
    if(!uuid) return res.status(400).json({ok: false, error: 'Invalid data: missing uuid'});
    if(!id_carniceria) return res.status(400).json({ok: false, error: 'Invalid data: missing id_carniceria'});
    if(!id_rol) return res.status(400).json({ok: false, error: 'Invalid data: missing id_rol'});

    const idCarniceria = getTenantCarniceriaId(req, id_carniceria);

    const periodo = (req.query.periodo as string) || 'hoy';
    const unidad = (req.query.unidad as string) || 'lb';

    this.pedidoService.getVolumenDespachoPorTipoCarne(idCarniceria, periodo, unidad )
      .then((data) => res.status(200).json({ok: true, data})) 
      .catch((error) => res.status(400).json({ok: false, error}));
    
  };

  public getLivePedidos = (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: 'Unauthorized - No user found' });
    }

    const { uuid, id_carniceria, id_rol } = req.user;

    // 1. Validar los campos individuales
    if(!uuid) return res.status(400).json({ok: false, error: 'Invalid data: missing uuid'});
    if(!id_carniceria) return res.status(400).json({ok: false, error: 'Invalid data: missing id_carniceria'});
    if(!id_rol) return res.status(400).json({ok: false, error: 'Invalid data: missing id_rol'});

    const idCarniceria = getTenantCarniceriaId(req, id_carniceria);

    this.pedidoService.getLivePedidos(idCarniceria)
      .then((data) => res.status(200).json({ok: true, data})) // Usar 200 para consultas GET exitosas
      .catch((error) => res.status(400).json({ok: false, error}));
  };

  public listPedidos = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: 'Unauthorized - No user found' });
    }

    const [validationError, dto] = ListPedidosDto.create(req.query);
    if (validationError) return res.status(400).json({ ok: false, error: validationError });

    try {
      const idCarniceria = getTenantCarniceriaId(req);
      const data = await this.pedidoService.listPedidos(idCarniceria, dto!);
      return res.status(200).json({ ok: true, data });
    } catch (error) {
      return this.handleError(error, res);
    }
  };

  public getPedidoByUuid = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: 'Unauthorized - No user found' });
    }

    const [validationError, dto] = PedidoUuidDto.create(req.params);
    if (validationError) return res.status(400).json({ ok: false, error: validationError });

    try {
      const idCarniceria = getTenantCarniceriaId(req);
      const data = await this.pedidoService.getPedidoByUuid(idCarniceria, dto!.uuid);
      return res.status(200).json({ ok: true, data });
    } catch (error) {
      return this.handleError(error, res);
    }
  };

  public changePedidoState = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: 'Unauthorized - No user found' });
    }

    const [uuidError, pedidoUuid] = PedidoUuidDto.create(req.params);
    if (uuidError) return res.status(400).json({ ok: false, error: uuidError });

    const [bodyError, dto] = ChangePedidoStateDto.create(req.body);
    if (bodyError) return res.status(400).json({ ok: false, error: bodyError });

    try {
      const idCarniceria = getTenantCarniceriaId(req);
      const data = await this.pedidoService.changePedidoState(idCarniceria, pedidoUuid!.uuid, dto!);
      return res.status(200).json({ ok: true, data });
    } catch (error) {
      return this.handleError(error, res);
    }
  };

  public updatePedidoDetails = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: 'Unauthorized - No user found' });
    }

    const [uuidError, pedidoUuid] = PedidoUuidDto.create(req.params);
    if (uuidError) return res.status(400).json({ ok: false, error: uuidError });

    const [bodyError, dto] = UpdatePedidoDetailsDto.create(req.body);
    if (bodyError) return res.status(400).json({ ok: false, error: bodyError });

    try {
      const idCarniceria = getTenantCarniceriaId(req);
      const data = await this.pedidoService.updatePedidoDetails(idCarniceria, pedidoUuid!.uuid, dto!);
      return res.status(200).json({ ok: true, data });
    } catch (error) {
      return this.handleError(error, res);
    }
  };

  public createPedido = (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: 'Unauthorized - No user found' });
    }
    const [error, createPedido ] = CreatePedidoDto.create(req.body);
    
    if(error) return res.status(400).json({ok: false, error});
    
    const { uuid, id_carniceria, id_rol } = req.user;

    // 1. Validar los campos individuales
    if(!uuid) return res.status(400).json({ok: false, error: 'Invalid data: missing uuid'});
    if(!id_carniceria) return res.status(400).json({ok: false, error: 'Invalid data: missing id_carniceria'});
    if(!id_rol) return res.status(400).json({ok: false, error: 'Invalid data: missing id_rol'});

    const idCarniceria = getTenantCarniceriaId(req, id_carniceria);
    
    this.pedidoService.createPedidoPos(idCarniceria, createPedido!)
      .then((data) => res.status(201).json({ok: true, data}))
      .catch((error) => this.handleError(error, res));

  };
}
