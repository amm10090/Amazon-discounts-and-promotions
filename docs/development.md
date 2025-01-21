# 亚马逊商品API整合平台开发文档

## 1. 项目概述

### 1.1 项目简介
本项目是一个整合了亚马逊商品数据的API平台，提供商品搜索、详情查询和变体获取等功能。项目使用 TypeScript + Express 开发，集成了亚马逊 PA-API (Product Advertising API)。

### 1.2 主要功能
- 搜索商品并获取折扣信息
- 获取商品详细信息
- 查询商品变体信息
- 多语言支持
- API文档和测试平台

## 2. 技术架构

### 2.1 技术栈
- 后端：Node.js + TypeScript + Express
- 前端：HTML5 + Bootstrap 5 + Prism.js
- API：Amazon PA-API
- 国际化：i18next
- 日志：Winston

### 2.2 项目结构
```
src/
├── app.ts                 # 应用程序入口
├── config/               # 配置文件
├── controllers/          # 控制器
├── services/            # 服务层
├── middlewares/         # 中间件
├── models/              # 数据模型
├── utils/              # 工具函数
├── i18n/               # 国际化文件
├── types/              # TypeScript 类型定义
└── public/             # 静态资源
    ├── index.html      # API文档页面
    ├── styles/         # CSS样式
    └── scripts/        # JavaScript脚本
```

## 3. 核心模块说明

### 3.1 Amazon Service
```typescript
class AmazonService {
  // 搜索商品
  async searchProducts(keywords: string, options: any = {})
  
  // 获取商品详情
  async getProductDetails(asin: string)
  
  // 获取商品变体
  async getProductVariations(asin: string)
}
```

主要功能：
- 封装亚马逊 PA-API 调用
- 处理商品搜索和数据获取
- 错误处理和日志记录

### 3.2 Product Controller
```typescript
class ProductController {
  // 搜索折扣商品
  searchDiscountProducts = async (req: Request, res: Response, next: NextFunction)
  
  // 获取商品详情
  getProductDetails = async (req: Request, res: Response, next: NextFunction)
  
  // 获取商品变体
  getProductVariations = async (req: Request, res: Response, next: NextFunction)
}
```

主要功能：
- 处理 API 请求
- 参数验证
- 数据格式化
- 错误处理

## 4. API 接口说明

### 4.1 搜索商品
- 端点：`GET /api/v1/products/search`
- 参数：
  - `keywords` (必填)：搜索关键词
  - `searchIndex`：商品分类
  - `itemCount`：返回数量
- 响应示例：
```json
{
  "status": "success",
  "message": "搜索成功",
  "data": {
    "products": [
      {
        "asin": "B08PP5MSVB",
        "title": "商品标题",
        "image": "图片URL",
        "price": {
          "current": 599.99,
          "original": 699.99,
          "saved": 100.00,
          "currency": "USD"
        },
        "isPrime": true,
        "merchant": "商家名称"
      }
    ],
    "total": 1
  }
}
```

### 4.2 获取商品详情
- 端点：`GET /api/v1/products/:asin`
- 参数：
  - `asin` (路径参数)：商品ASIN编号
- 响应格式与搜索接口类似

### 4.3 获取商品变体
- 端点：`GET /api/v1/products/:asin/variations`
- 参数：
  - `asin` (路径参数)：商品ASIN编号
- 返回该商品的所有变体信息

## 5. 错误处理

### 5.1 错误类型
```typescript
class AppError extends Error {
  constructor(message: string, statusCode: number)
}
```

### 5.2 错误代码
- 400：请求参数无效
- 401：未授权访问
- 404：资源未找到
- 429：超出请求限制
- 500：服务器内部错误

## 6. 国际化支持

### 6.1 支持语言
- 中文 (zh)
- 英文 (en)

### 6.2 切换语言
- 端点：`POST /api/v1/language/:lang`
- 参数：
  - `lang`：语言代码 (zh/en)

### 6.3 翻译文件
位于 `src/i18n/locales/` 目录：
- `zh.json`：中文翻译
- `en.json`：英文翻译

## 7. 前端文档平台

### 7.1 主要功能
- API文档展示
- 在线API测试
- 代码示例展示
- 响应结果格式化
- 多语言切换

### 7.2 API测试功能
```javascript
const API_CONFIG = {
  'search-products': {
    method: 'GET',
    path: '/api/v1/products/search',
    params: [
      { name: 'keywords', type: 'string', required: true, placeholder: '搜索关键词' },
      { name: 'searchIndex', type: 'string', required: false, placeholder: '商品分类' },
      { name: 'itemCount', type: 'number', required: false, placeholder: '返回数量' }
    ]
  },
  'product-details': {
    method: 'GET',
    path: '/api/v1/products/:asin',
    params: [
      { name: 'asin', type: 'string', required: true, placeholder: '商品ASIN' }
    ]
  },
  'variations': {
    method: 'GET',
    path: '/api/v1/products/:asin/variations',
    params: [
      { name: 'asin', type: 'string', required: true, placeholder: '商品ASIN' }
    ]
  }
}
```

## 8. 部署说明

### 8.1 环境要求
- Node.js >= 14
- TypeScript >= 4.5
- pnpm 包管理器

### 8.2 环境变量
```env
# Amazon PA-API 配置
AMAZON_ACCESS_KEY=your_access_key
AMAZON_SECRET_KEY=your_secret_key
AMAZON_ASSOCIATE_TAG=your_tag
AMAZON_MARKETPLACE=US

# 服务器配置
PORT=3000
NODE_ENV=production
```

### 8.3 部署步骤
1. 安装依赖：
```bash
pnpm install
```

2. 编译TypeScript：
```bash
pnpm build
```

3. 启动服务：
```bash
pnpm start
```

## 9. 开发指南

### 9.1 开发环境设置
1. 克隆项目
2. 复制 `.env.example` 到 `.env` 并配置
3. 安装依赖
4. 启动开发服务器

### 9.2 代码规范
- 使用 TypeScript 强类型
- 遵循 RESTful API 设计规范
- 使用 async/await 处理异步
- 统一的错误处理
- 完整的日志记录

### 9.3 测试
```bash
pnpm test        # 运行所有测试
pnpm test:watch  # 监视模式运行测试
```

## 10. 维护和更新

### 10.1 日志管理
- 使用 Winston 记录日志
- 日志分级：error、info、debug
- 日志文件位置：`logs/`

### 10.2 监控
- 错误日志监控
- API 调用频率监控
- 响应时间监控

### 10.3 性能优化
- 响应缓存
- 请求限流
- 错误重试机制

## 11. 安全性

### 11.1 API 安全
- API 密钥认证
- 请求限流保护
- CORS 配置

### 11.2 数据安全
- 敏感信息加密
- 环境变量保护
- 错误信息脱敏

## 12. 扩展性

### 12.1 添加新API
1. 在 `API_CONFIG` 中添加配置
2. 实现对应的控制器方法
3. 添加路由
4. 更新文档

### 12.2 支持新功能
- 模块化设计
- 插件系统支持
- 配置驱动开发

## 13. 常见问题

### 13.1 API 限制
- PA-API 调用频率限制
- 请求超时处理
- 错误重试策略

### 13.2 故障排除
- 检查 API 密钥配置
- 验证请求参数
- 查看错误日志

## 14. 更新日志

### v1.0.0 (2025-01-20)
- 初始版本发布
- 基础API功能实现
- 文档平台上线
- 支持商品搜索、详情和变体查询
- 添加多语言支持
- 实现在线API测试功能

## 15. 联系方式

### 15.1 技术支持
- 提交 Issue
- 电子邮件支持
- 在线文档

### 15.2 贡献指南
- Fork 项目
- 创建特性分支
- 提交 Pull Request

## 16. 许可证

本项目采用 MIT 许可证。详见 [LICENSE](../LICENSE) 文件。 