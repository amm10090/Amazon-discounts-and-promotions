import winston from 'winston';
import path from 'path';
import { config } from '../config/config';

// 定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

// 创建日志记录器
export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports: [
    // 控制台输出
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    // 错误日志文件
    new winston.transports.File({
      filename: path.join(config.logging.dir, 'error.log'),
      level: 'error',
    }),
    // 组合日志文件
    new winston.transports.File({
      filename: path.join(config.logging.dir, 'combined.log'),
    }),
  ],
});

// 如果不是生产环境，则添加更详细的日志记录
if (config.server.env !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

// 导出日志记录方法
export const logError = (message: string, error?: any) => {
  logger.error(message, { error: error?.message || error, metadata: error });
};

export const logInfo = (message: string, data?: any) => {
  logger.info(message, { data });
};

export const logDebug = (message: string, data?: any) => {
  logger.debug(message, { data });
};

export const logWarn = (message: string, data?: any) => {
  logger.warn(message, { data });
}; 