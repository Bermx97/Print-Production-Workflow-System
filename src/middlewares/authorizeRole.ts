import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../utils/errors';
import { employee_role } from '@prisma/client';

export const authorizeRoles = (...roles: employee_role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new HttpError('Unauthorized', 401);
    }

    if (!roles.includes(req.user.role)) {
      throw new HttpError('Forbidden', 403);
    }

    next();
  };
};