import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { handle } from 'i18next-http-middleware';
import i18next from './i18n.js';
import { config } from './config/config.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';
import { ProductController } from './controllers/product.controller.js';
import { logInfo } from './utils/logger.js';

// 创建Express应用
const app: Express = express();

// 基础中间件
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            "img-src": ["'self'", "https:", "data:"],
            "script-src": ["'self'", "'unsafe-inline'", "https:"],
            "style-src": ["'self'", "'unsafe-inline'", "https:"],
        },
    },
}));
app.use(cors({
    origin: config.cors.origins,
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use(express.static(path.join(path.dirname(new URL(import.meta.url).pathname), 'public')));

// 国际化中间件
app.use(handle(i18next));

// 创建控制器实例
const productController = new ProductController();

// API路由
const apiRouter = express.Router();
apiRouter.get('/products/deals', productController.getAllDiscounts);
apiRouter.get('/products/:asin', productController.getProductDetails);

// 注册API路由
app.use('/api/v1', apiRouter);

// 语言切换
app.post('/api/v1/language/:lang', (req, res) => {
    const { lang } = req.params;
    if (config.i18n.supportedLanguages.includes(lang)) {
        req.i18n.changeLanguage(lang);
        res.json({ status: 'success', message: 'Language changed successfully' });
    } else {
        res.status(400).json({ status: 'error', message: 'Unsupported language' });
    }
});

// 所有其他路由返回index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(path.dirname(new URL(import.meta.url).pathname), 'public', 'index.html'));
});

// 404处理
app.use(notFoundHandler);

// 错误处理
app.use(errorHandler);

// 启动服务器
const PORT = config.server.port;
app.listen(PORT, () => {
    logInfo(`Server is running on port ${PORT}`);
});

export default app; 