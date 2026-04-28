import { Request, Response, NextFunction } from 'express';
import jwt from "jsonwebtoken";
import { HttpError } from "../utils/errors";
import type { AuthUser } from "../types/auth";

export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (!req.headers.authorization) {
        throw new HttpError("Not authorized", 401);
    } else {
        if (req.headers.authorization.startsWith('Bearer ')) {
            if (!process.env.JWT_SECRET) {
                throw new HttpError("Internal Server Error", 500);
            }
            const secret = process.env.JWT_SECRET;
            const token = req.headers.authorization.split(" ")[1];
            const decoded = jwt.verify(token, secret);
            req.user = decoded as AuthUser;
            return next();
        } else {
            throw new HttpError('Unauthorized', 401);
        }
    }
};