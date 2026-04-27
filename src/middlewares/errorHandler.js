"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const errorHandler = (err, req, res, next) => {
    const customError = err;
    console.error(err.stack);
    const status = customError.status || 500;
    res.status(status).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
};
exports.default = errorHandler;
