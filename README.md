# 电商折扣商品数据聚合 API

## 项目简介
这是一个用于整合和处理多个电商平台折扣商品数据的 Python API 服务。目前支持从亚马逊产品广告 API 5.0 和 CJ API 获取数据，并提供统一的数据处理和输出接口。

## 主要功能
- 多平台数据获取（亚马逊、CJ）
- 折扣和优惠券商品信息提取
- 数据清洗和标准化
- 品牌分类
- JSON 格式数据输出
- 数据库存储支持

## 技术栈
- Python 3.9+
- FastAPI
- SQLAlchemy
- Redis
- PostgreSQL
- Pydantic

## 安装说明
1. 克隆项目
```bash
git clone [项目地址]
cd Amazon-discounts-and-promotions
```

2. 安装依赖
```bash
pip install -r requirements.txt
```

3. 配置环境变量
```bash
cp config/example.env .env
# 编辑 .env 文件，填入必要的配置信息
```

## 使用说明
1. 启动服务
```bash
uvicorn src.main:app --reload
```

2. API 文档访问
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## API 端点
- GET /api/v1/products/discounts - 获取所有折扣商品
- GET /api/v1/products/coupons - 获取所有优惠券商品
- GET /api/v1/products/brands - 按品牌获取商品

## 开发指南
- 遵循 PEP 8 编码规范
- 使用 black 进行代码格式化
- 运行测试: `pytest tests/`

## 许可证
MIT License

## 贡献指南
欢迎提交 Issue 和 Pull Request
