import { Request, Response, NextFunction } from 'express';
import { logError } from '../utils/logger';

// 自定义错误类
export class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// 错误处理中间件
export const errorHandler = (
  err: AppError | Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = err;

  // 记录错误日志
  logError('Error occurred', error);

  // 如果不是自定义错误，转换为自定义错误
  if (!(error instanceof AppError)) {
    error = new AppError(
      req.t('errors.internal'),
      500
    );
  }

  const appError = error as AppError;

  // 开发环境返回详细错误信息
  if (process.env.NODE_ENV === 'development') {
    res.status(appError.statusCode).json({
      status: appError.status,
      error: appError,
      message: appError.message,
      stack: appError.stack,
    });
  } 
  // 生产环境只返回必要信息
  else {
    res.status(appError.statusCode).json({
      status: appError.status,
      message: appError.message,
    });
  }
};

// 404错误处理中间件
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const error = new AppError(
    req.t('errors.notFound'),
    404
  );
  next(error);
}; 