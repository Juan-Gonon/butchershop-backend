import type { Response } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../../../domain/interfaces/authenticatesRequest.interface.js';
import { CustomError } from '../../../domain/errors/custom.error.js';
import { ListProductosCarniceriaDto } from '../../../domain/Dtos/productosCarniceria/getProductosCarniceria.dto.js';
import { CreateProductoCarniceriaDto } from '../../../domain/Dtos/productosCarniceria/createProductoCarniceria.dto.js';
import { UpdateProductoCarniceriaDto } from '../../../domain/Dtos/productosCarniceria/updateProductoCarniceria.dto.js';
import { ToggleDisponibilidadProductoCarniceriaDto } from '../../../domain/Dtos/productosCarniceria/toggleDisponibilidadProductoCarniceria.dto.js';
import { getTenantCarniceriaId } from '../../shared/get.tenant.js';
import { ProductosCarniceriaService } from '../../services/productosCarniceria.service.js';

const uuidSchema = z.uuid('El UUID del producto no es válido');

export class ProductosCarniceriaController {
  constructor(private readonly productosCarniceriaService: ProductosCarniceriaService) {}

  private handleError = (error: unknown, res: Response) => {
    if (error instanceof CustomError) {
      return res.status(error.statusCode).json({ ok: false, error: error.message });
    }

    return res.status(500).json({ ok: false, error: 'Internal server error' });
  };

  private validateUser = (req: AuthenticatedRequest, res: Response): boolean => {
    if (req.user) return true;
    res.status(401).json({ ok: false, error: 'Unauthorized - No user found' });
    return false;
  };

  public listar = async (req: AuthenticatedRequest, res: Response) => {
    if (!this.validateUser(req, res)) return;

    const [validationError, dto] = ListProductosCarniceriaDto.create(req.query);
    if (validationError) return res.status(400).json({ ok: false, error: validationError });

    try {
      const idCarniceria = getTenantCarniceriaId(req);
      const result = await this.productosCarniceriaService.listar(idCarniceria, dto!);
      return res.status(200).json({ ok: true, ...result });
    } catch (error) {
      return this.handleError(error, res);
    }
  };

  public crear = async (req: AuthenticatedRequest, res: Response) => {
    if (!this.validateUser(req, res)) return;

    const [validationError, dto] = CreateProductoCarniceriaDto.create(req.body);
    if (validationError) return res.status(400).json({ ok: false, error: validationError });

    try {
      const idCarniceria = getTenantCarniceriaId(req);
      const result = await this.productosCarniceriaService.crear(idCarniceria, dto!);
      return res.status(201).json({ ok: true, data: result });
    } catch (error) {
      return this.handleError(error, res);
    }
  };

  public actualizar = async (req: AuthenticatedRequest, res: Response) => {
    if (!this.validateUser(req, res)) return;

    const uuidResult = uuidSchema.safeParse(req.params.uuid);
    if (!uuidResult.success) {
      return res.status(400).json({ ok: false, error: uuidResult.error.issues[0]?.message || 'UUID inválido' });
    }

    const [validationError, dto] = UpdateProductoCarniceriaDto.create(req.body);
    if (validationError) return res.status(400).json({ ok: false, error: validationError });

    try {
      const idCarniceria = getTenantCarniceriaId(req);
      const result = await this.productosCarniceriaService.actualizar(idCarniceria, uuidResult.data, dto!);
      return res.status(200).json({ ok: true, data: result });
    } catch (error) {
      return this.handleError(error, res);
    }
  };

  public toggleDisponibilidad = async (req: AuthenticatedRequest, res: Response) => {
    if (!this.validateUser(req, res)) return;

    const uuidResult = uuidSchema.safeParse(req.params.uuid);
    if (!uuidResult.success) {
      return res.status(400).json({ ok: false, error: uuidResult.error.issues[0]?.message || 'UUID inválido' });
    }

    const [validationError, dto] = ToggleDisponibilidadProductoCarniceriaDto.create(req.body);
    if (validationError) return res.status(400).json({ ok: false, error: validationError });

    try {
      const idCarniceria = getTenantCarniceriaId(req);
      const result = await this.productosCarniceriaService.toggleDisponibilidad(idCarniceria, uuidResult.data, dto!);
      return res.status(200).json({ ok: true, data: result });
    } catch (error) {
      return this.handleError(error, res);
    }
  };
}