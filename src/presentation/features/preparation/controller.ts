import { Response } from 'express';
import { AuthenticatedRequest } from '../../../domain/interfaces/authenticatesRequest.interface.js';
import { CustomError } from '../../../domain/errors/custom.error.js';
import { PreparationsService } from '../../services/preparation.service.js';

export class PreparationsController {
  constructor(private readonly preparationsService: PreparationsService) {}

  private handleError = (error: unknown, res: Response) => {
    if (error instanceof CustomError) {
      return res.status(error.statusCode).json({ ok: false, error: error.message });
    }
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  };

  public getActivePreparations = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: 'Unauthorized - No user found' });
    }

    this.preparationsService.getActivePreparations()
      .then((preparations) => res.status(200).json({ ok: true, preparations }))
      .catch((error) => this.handleError(error, res));
  };
}