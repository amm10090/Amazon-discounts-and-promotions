import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
dotenv.config();

interface ProxyConfig {
  enabled: boolean;
  host: string;
  port: number;
  auth?: {
    username: string;
    password: string;
  };
  list: string[]; // 添加代理列表配置
}

export const config = {
  // 服务器配置
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
  },

  // Amazon PA-API配置
  amazon: {
    accessKey: process.env.AWS_ACCESS_KEY,
    secretKey: process.env.AWS_SECRET_KEY,
    associateTag: process.env.AWS_ASSOCIATE_TAG,
    region: process.env.AWS_REGION || 'us-east-1',
    service: process.env.AWS_SERVICE || 'ProductAdvertisingAPI',
    host: process.env.AWS_HOST || 'webservices.amazon.com',
    marketplace: process.env.AMAZON_MARKETPLACE || 'www.amazon.com',
  },

  // API设置
  api: {
    maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
    retryDelay: parseInt(process.env.RETRY_DELAY || '2000', 10),
    timeout: parseInt(process.env.TIMEOUT || '10000', 10),
  },

  // 代理配置
  proxy: {
    enabled: process.env.PROXY_ENABLED === 'true',
    host: process.env.PROXY_HOST || '127.0.0.1',
    port: parseInt(process.env.PROXY_PORT || '7890', 10),
    auth: (process.env.PROXY_USERNAME && process.env.PROXY_PASSWORD) ? {
      username: process.env.PROXY_USERNAME,
      password: process.env.PROXY_PASSWORD
    } : undefined,
    list: process.env.PROXY_LIST ? JSON.parse(process.env.PROXY_LIST) : [],
  },

  // CORS配置
  cors: {
    origins: process.env.BACKEND_CORS_ORIGINS 
      ? JSON.parse(process.env.BACKEND_CORS_ORIGINS)
      : ['http://localhost:3000'],
  },

  // 国际化配置
  i18n: {
    defaultLanguage: process.env.DEFAULT_LANGUAGE || 'zh',
    supportedLanguages: process.env.SUPPORTED_LANGUAGES 
      ? JSON.parse(process.env.SUPPORTED_LANGUAGES)
      : ['zh', 'en'],
  },

  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    dir: path.join(__dirname, '../../logs'),
  },
}; 