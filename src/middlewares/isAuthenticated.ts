import { Request, Response, NextFunction } from "express";
import { HttpError } from "../utils/errors";
import { verifyToken } from "../utils/decode.token";

export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new HttpError('Not authorized', 401);
  }

  if (!authHeader.startsWith('Bearer ')) {
    throw new HttpError('Invalid token format', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    

    req.user = decoded;

    return next();
  } catch {
    throw new HttpError('Invalid token', 401);
  }
};