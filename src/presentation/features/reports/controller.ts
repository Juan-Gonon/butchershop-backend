import { Response } from 'express';
import { AuthenticatedRequest } from '../../../domain/interfaces/authenticatesRequest.interface.js';
import { ReportDateRangeDto } from '../../../domain/Dtos/reports/reportDateRange.dto.js';
import { ReportOrdersQueryDto } from '../../../domain/Dtos/reports/reportOrdersQuery.dto.js';
import { CustomError } from '../../../domain/errors/custom.error.js';
import { getTenantCarniceriaId } from '../../shared/get.tenant.js';
import { ReportsService } from '../../services/reports.service.js';

export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  private handleError = (error: unknown, res: Response) => {
    if (error instanceof CustomError) {
      return res.status(error.statusCode).json({ ok: false, error: error.message });
    }
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  };

  public summary = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: 'Unauthorized - No user found' });
    }

    const [validationError, dto] = ReportDateRangeDto.create(req.query);
    if (validationError) return res.status(400).json({ ok: false, error: validationError });

    try {
      const idCarniceria = getTenantCarniceriaId(req);
      const data = await this.reportsService.getSummary(idCarniceria, dto!);
      return res.status(200).json({ ok: true, data });
    } catch (error) {
      return this.handleError(error, res);
    }
  };

  public orders = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: 'Unauthorized - No user found' });
    }

    const [validationError, dto] = ReportOrdersQueryDto.create(req.query);
    if (validationError) return res.status(400).json({ ok: false, error: validationError });

    try {
      const idCarniceria = getTenantCarniceriaId(req);
      const result = await this.reportsService.getOrdersHistory(idCarniceria, dto!);
      return res.status(200).json({
        ok: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      return this.handleError(error, res);
    }
  };
}
