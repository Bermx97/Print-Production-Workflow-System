import { Request, Response, NextFunction } from "express";
import { HttpError } from "../utils/errors";

const errorHandler = (
  err: Error, req: Request, res: Response, next: NextFunction) => {
  //console.error(err.stack);

  const status = err instanceof HttpError ? err.status : 500;
  res.status(status).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
};

export default errorHandler;