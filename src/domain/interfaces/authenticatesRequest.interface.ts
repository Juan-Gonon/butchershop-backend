import { Request } from 'express';
import { JwtPayload } from './jwtPayload.interface.js';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}