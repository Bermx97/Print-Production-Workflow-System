import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";


const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.log("validation errors", errors.array());

    return res.status(400).json({
      success: false,
      errors: errors.array(),
      message: errors.array()[0].msg,
    });
  }

  next();
};

export default validateRequest;