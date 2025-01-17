from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html

from src.api.v1 import amazon
from src.utils.logger import logger
# from src.utils.database import init_db
from config.settings import settings

# 创建 FastAPI 应用
app = FastAPI(
    title="E-commerce Discount Product Data Aggregation API",
    description="Integrate discount product data from multiple e-commerce platforms",
    version="1.0.0",
    docs_url=None,  # 禁用默认的 docs 路由
    swagger_ui_parameters={
        "defaultModelsExpandDepth": -1,  # 隐藏 Models 部分
        "docExpansion": "none",  # 默认折叠所有接口
        "filter": True,  # 启用过滤功能
        "displayRequestDuration": True,  # 显示请求耗时
        "syntaxHighlight.theme": "obsidian",  # 代码高亮主题
        "lang": "zh-CN",  # 设置语言为中文
    }
)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(amazon.router, prefix=f"/api/{settings.API_VERSION}")

@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    """自定义 Swagger UI 路由"""
    return get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title=app.title + " - API 文档",
        swagger_js_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui-bundle.js",
        swagger_css_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui.css",
        swagger_favicon_url="https://fastapi.tiangolo.com/img/favicon.png",
    )

@app.on_event("startup")
async def startup_event():
    """应用启动时的初始化操作"""
    try:
        # 初始化数据库
        # init_db()
        logger.info("Application startup completed")
    except Exception as e:
        logger.error(f"Failed to initialize application: {str(e)}")
        raise

@app.get("/")
async def root():
    """API 根路径"""
    return {
        "message": "Welcome to Discounts API",
        "version": settings.API_VERSION,
        "docs_url": "/docs",
        "redoc_url": "/redoc"
    } 