from pathlib import Path
from typing import Dict, Any

from dotenv import load_dotenv
import os

# 加载环境变量
env_path = Path(__file__).parent / ".env"
if env_path.exists():
    load_dotenv(str(env_path))
else:
    load_dotenv()  # 尝试从默认位置加载

class Settings:
    """应用程序配置类"""
    
    def __init__(self):
        # API 配置
        self.API_VERSION: str = os.getenv("API_VERSION", "v1")
        self.DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
        self.HOST: str = os.getenv("HOST", "0.0.0.0")
        self.PORT: int = int(os.getenv("PORT", "8000"))
        
        # 数据库配置
        self.DATABASE_URL: str = os.getenv("DATABASE_URL", "")
        
        # Redis 配置
        self.REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
        self.REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
        self.REDIS_DB: int = int(os.getenv("REDIS_DB", "0"))
        
        # Amazon API 配置
        self.AMAZON_CLIENT_ID: str = os.getenv("AMAZON_ACCESS_KEY_ID", "")
        self.AMAZON_CLIENT_SECRET: str = os.getenv("AMAZON_SECRET_ACCESS_KEY", "")
        self.AMAZON_REFRESH_TOKEN: str = os.getenv("AMAZON_ASSOCIATE_TAG", "")
        self.AMAZON_REGION: str = os.getenv("AMAZON_REGION", "US")
        
        # CJ API 配置
        self.CJ_API_KEY: str = os.getenv("CJ_API_KEY", "")
        self.CJ_WEBSITE_ID: str = os.getenv("CJ_WEBSITE_ID", "")
        
        # 缓存配置
        self.CACHE_TTL: int = int(os.getenv("CACHE_TTL", "3600"))
        
        # 日志配置
        self.LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
        self.LOG_FILE: str = os.getenv("LOG_FILE", "logs/app.log")
    
    def dict(self) -> Dict[str, Any]:
        """返回配置的字典表示"""
        return {
            key: value for key, value in self.__dict__.items()
            if not key.startswith("_")
        }

# 创建全局配置实例
settings = Settings() 