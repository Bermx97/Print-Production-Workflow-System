import { Request, Response, NextFunction} from "express";

const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    const customError = err as Error & { status?: number };
    console.error(err.stack);

    const status = customError.status || 500;

    res.status(status).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
};

export default errorHandler;