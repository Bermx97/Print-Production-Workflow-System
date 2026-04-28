import { validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";
import { HttpError } from "../../src/utils/errors";


const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError(errors.array()[0].msg, 400));
  }

  next();
};

export default validateRequest;