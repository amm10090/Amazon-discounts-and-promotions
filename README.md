# Amazon 折扣和优惠信息 API

这是一个基于 FastAPI 的 RESTful API 服务，用于获取亚马逊商品的折扣和优惠信息。该服务集成了 Amazon Product Advertising API 5.0，支持多语言，并提供了丰富的搜索和过滤功能。

## 功能特点

- 搜索折扣商品，支持多种过滤条件
- 获取商品的优惠信息和促销活动
- 支持中文和英文双语界面
- 完善的错误处理和日志记录
- 支持高并发请求
- Swagger UI 接口文档

## 技术栈

- Python 3.8+
- FastAPI
- Pydantic
- HTTPX
- Loguru
- Python-dotenv

## 安装

1. 克隆仓库：

```bash
git clone https://github.com/yourusername/amazon-discounts-api.git
cd amazon-discounts-api
```

2. 创建虚拟环境：

```bash
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# 或
.venv\Scripts\activate  # Windows
```

3. 安装依赖：

```bash
pip install -r requirements.txt
```

4. 配置环境变量：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的 Amazon PA-API 认证信息和其他配置。

## 运行

开发环境：

```bash
uvicorn src.app.main:app --reload --host 0.0.0.0 --port 8000
```

生产环境：

```bash
uvicorn src.app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## API 文档

启动服务后，访问以下地址查看 API 文档：

- Swagger UI: http://localhost:8000/api/v1/docs
- ReDoc: http://localhost:8000/api/v1/redoc

## API 端点

### 搜索商品

```http
GET /api/v1/products/search
```

参数：

- `keywords` (必需): 搜索关键词
- `category`: 商品分类
- `min_price`: 最低价格
- `max_price`: 最高价格
- `min_savings_percent`: 最低折扣百分比
- `sort_by`: 排序方式
- `page_size`: 每页商品数量

### 获取商品详情

```http
POST /api/v1/products/details
```

请求体：

```json
{
  "asin_list": ["ASIN1", "ASIN2", ...]
}
```

## 环境变量

| 变量名 | 描述 | 默认值 |
|--------|------|---------|
| AWS_ACCESS_KEY | Amazon PA-API 访问密钥 | - |
| AWS_SECRET_KEY | Amazon PA-API 密钥 | - |
| AWS_ASSOCIATE_TAG | Amazon Associates 标签 | - |
| AWS_HOST | Amazon PA-API 主机 | webservices.amazon.com |
| AWS_REGION | AWS 区域 | us-east-1 |
| MAX_RETRIES | 最大重试次数 | 3 |
| RETRY_DELAY | 重试延迟（秒） | 1 |
| TIMEOUT | 请求超时（秒） | 30 |
| DEFAULT_LANGUAGE | 默认语言 | zh |

## 错误处理

API 使用标准的 HTTP 状态码，并返回统一的错误响应格式：

```json
{
  "success": false,
  "message": "错误信息",
  "data": null
}
```

## 日志

日志文件位于 `logs` 目录：

- `app.log`: 应用日志
- `error.log`: 错误日志

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

## 项目结构

```
.
├── config/                 # 配置文件
│   ├── settings.py        # 应用配置
│   └── .env              # 环境变量
├── src/                   # 源代码
│   ├── api/              # API 路由
│   │   └── v1/
│   │       └── amazon.py # Amazon API 路由
│   ├── i18n/             # 国际化
│   │   └── translations.py
│   ├── models/           # 数据模型
│   │   └── schemas.py
│   ├── services/         # 业务逻辑
│   │   └── amazon_service.py
│   └── utils/            # 工具函数
│       ├── database.py
│       └── logger.py
├── tests/                # 测试用例
├── requirements.txt      # 依赖包
└── README.md            # 项目文档
```

## 环境要求

- Python 3.12+
- PostgreSQL 14+
- Redis 6+

## 安装部署

1. 克隆项目:
```bash
git clone [项目地址]
cd Amazon-discounts-and-promotions
```

2. 创建虚拟环境:
```bash
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# 或
.venv\Scripts\activate     # Windows
```

3. 安装依赖:
```bash
pip install -r requirements.txt
```

4. 配置环境变量:
```bash
cp config/example.env config/.env
# 编辑 .env 文件，填入必要的配置信息
```

5. 启动服务:
```bash
uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

## API 文档

启动服务后访问: http://localhost:8000/docs

### 主要接口

1. 搜索折扣商品
```
GET /api/v1/amazon/search
```
参数:
- keywords: 搜索关键词
- category: 商品类别
- min_discount: 最小折扣百分比
- page: 页码
- page_size: 每页数量

2. 获取商品详情
```
GET /api/v1/amazon/product/{asin}
```
参数:
- asin: Amazon 商品 ASIN

## 支持的商品类别

- APPAREL (服装)
- AUTOMOTIVE (汽车)
- BABY (婴儿用品)
- BEAUTY (美妆)
- BOOKS (图书)
- ELECTRONICS (电子产品)
- GROCERY (食品杂货)
- HOME (家居)
- KITCHEN (厨房)
- MUSIC (音乐)
- OFFICE (办公用品)
- PET_SUPPLIES (宠物用品)
- SHOES (鞋类)
- SOFTWARE (软件)
- SPORTS (运动)
- TOOLS (工具)
- TOYS (玩具)
- VIDEO_GAMES (游戏)

## 国际化支持

支持通过 `Accept-Language` 请求头切换语言:
- 中文: `Accept-Language: zh`
- 英文: `Accept-Language: en`

## 错误处理

API 使用标准的 HTTP 状态码表示请求状态:

- 200: 成功
- 400: 请求参数错误
- 401: 认证失败
- 404: 资源不存在
- 429: 请求频率过高
- 500: 服务器内部错误
- 502: 上游服务错误

## 开发指南

1. 添加新的 API 端点:
   - 在 `src/api/v1/` 下创建新的路由文件
   - 在 `src/main.py` 中注册路由

2. 添加新的服务:
   - 在 `src/services/` 下创建新的服务类
   - 实现业务逻辑

3. 添加新的语言支持:
   - 在 `src/i18n/translations.py` 中添加翻译

4. 修改配置:
   - 在 `config/settings.py` 中添加新的配置项
   - 在 `.env` 文件中设置对应的环境变量

## 注意事项

1. API 限制
   - PA-API 有请求频率限制
   - 建议启用缓存减少 API 调用

2. 安全性
   - 不要在代码中硬编码敏感信息
   - 使用环境变量管理密钥

3. 性能优化
   - 使用异步操作处理 I/O 密集型任务
   - 合理设置缓存过期时间

## 贡献指南

1. Fork 项目
2. 创建特性分支
3. 提交代码
4. 发起 Pull Request

## 许可证

[MIT License](LICENSE)

## 折扣和优惠券筛选

API 提供了丰富的折扣和优惠券筛选选项，帮助您快速找到最优惠的商品。

### 折扣类型筛选

支持以下折扣类型：

- `PRICE_DROP`: 直接降价商品
- `COUPON`: 优惠券折扣商品
- `PROMOTION`: 促销活动商品
- `DEAL`: 特价活动商品

示例请求：
```bash
# 获取降价商品
GET /api/v1/amazon/search?discount_types=PRICE_DROP

# 获取优惠券商品
GET /api/v1/amazon/search?discount_types=COUPON

# 获取多种折扣类型
GET /api/v1/amazon/search?discount_types=PRICE_DROP&discount_types=COUPON
```

### 优惠券筛选

可以专门筛选有优惠券的商品：

```bash
# 只显示有优惠券的商品
GET /api/v1/amazon/search?has_coupon=true

# 只显示无优惠券的商品
GET /api/v1/amazon/search?has_coupon=false
```

### 折扣力度筛选

通过 `min_discount` 参数筛选折扣力度：

```bash
# 筛选折扣大于等于30%的商品
GET /api/v1/amazon/search?min_discount=30
```

### 组合筛选示例

可以组合多个筛选条件：

```bash
# 搜索折扣大于20%且有优惠券的电子产品
GET /api/v1/amazon/search?category=ELECTRONICS&min_discount=20&has_coupon=true

# 搜索有优惠券的降价商品
GET /api/v1/amazon/search?discount_types=PRICE_DROP&has_coupon=true
```

### 分页

所有搜索结果支持分页：

```bash
# 每页显示20条，获取第2页
GET /api/v1/amazon/search?page=2&page_size=20
```

### 响应示例

```json
[
  {
    "platform": "amazon",
    "external_id": "B0xxxxx",
    "title": "商品标题",
    "original_price": 99.99,
    "current_price": 79.99,
    "discount_percentage": 20.0,
    "discount_type": "PRICE_DROP",
    "coupon_code": "SAVE20",
    "coupon_description": "使用优惠券节省20%"
  }
]
```
