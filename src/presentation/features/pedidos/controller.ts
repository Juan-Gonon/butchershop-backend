import { Response } from 'express';
import { AuthenticatedRequest } from '../../../domain/interfaces/authenticatesRequest.interface.js';
import { getTenantCarniceriaId } from '../../shared/get.tenant.js';

export class PedidosController{

  public metrics = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: 'Unauthorized - No user found' });
    }

    const { uuid, id_carniceria, id_rol } = req.user;

    // 2. Validar los campos individuales
    if(!uuid) return res.status(400).json({ok: false, error: 'Invalid data: missing uuid'});
    if(!id_carniceria) return res.status(400).json({ok: false, error: 'Invalid data: missing id_carniceria'});
    if(!id_rol) return res.status(400).json({ok: false, error: 'Invalid data: missing id_rol'});

    const idCarniceria = getTenantCarniceriaId(req, id_carniceria);

    res.json({ok: true, uuid, id_carniceria, id_rol, idCarniceria});
  };
}