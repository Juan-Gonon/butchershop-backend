import { Response } from 'express';
import { AuthenticatedRequest } from '../../../domain/interfaces/authenticatesRequest.interface.js';
import { ListCatalogoProductosDto } from '../../../domain/Dtos/catalogoProductos/listCatalogoProductos.dto.js';
import { CustomError } from '../../../domain/errors/custom.error.js';
import { CatalogoProductosService } from '../../services/catalogoProductos.service.js';

export class CatalogoProductosController {
  constructor(private readonly catalogoProductosService: CatalogoProductosService) {}

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

    const [validationError, dto] = ListCatalogoProductosDto.create(req.query);
    if (validationError) {
      return res.status(400).json({ ok: false, error: validationError });
    }

    try {
      const result = await this.catalogoProductosService.listar(dto!);
      return res.status(200).json({ ok: true, ...result });
    } catch (error) {
      return this.handleError(error, res);
    }
  };
}
