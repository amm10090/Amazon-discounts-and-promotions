from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import SQLAlchemyError

from config.settings import settings
from src.utils.logger import logger

# 创建数据库引擎
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,  # 自动检测断开的连接
    pool_size=5,  # 连接池大小
    max_overflow=10,  # 最大溢出连接数
    pool_recycle=3600,  # 连接回收时间（秒）
)

# 创建会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Generator[Session, None, None]:
    """
    获取数据库会话的依赖函数
    用于 FastAPI 依赖注入系统
    """
    db = SessionLocal()
    try:
        yield db
    except SQLAlchemyError as e:
        logger.error(f"Database error: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()

def init_db() -> None:
    """
    初始化数据库
    创建所有表
    """
    try:
        from src.models.base import Base
        Base.metadata.create_all(bind=engine)
        logger.info("Successfully initialized database")
    except Exception as e:
        logger.error(f"Failed to initialize database: {str(e)}")
        raise 