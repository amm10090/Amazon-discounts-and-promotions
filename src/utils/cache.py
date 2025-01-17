from typing import Any, Optional
import json
import redis
from functools import wraps

from config.settings import settings
from src.utils.logger import logger

# 创建 Redis 连接
redis_client = redis.Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    db=settings.REDIS_DB,
    decode_responses=True
)

def get_cache_key(*args, **kwargs) -> str:
    """
    生成缓存键
    
    Args:
        *args: 位置参数
        **kwargs: 关键字参数
        
    Returns:
        str: 缓存键
    """
    key_parts = [str(arg) for arg in args]
    key_parts.extend(f"{k}:{v}" for k, v in sorted(kwargs.items()))
    return ":".join(key_parts)

class Cache:
    @staticmethod
    def get(key: str) -> Optional[str]:
        """
        获取缓存值
        
        Args:
            key: 缓存键
            
        Returns:
            Optional[str]: 缓存值
        """
        try:
            return redis_client.get(key)
        except redis.RedisError as e:
            logger.error(f"Redis get error: {str(e)}")
            return None

    @staticmethod
    def set(key: str, value: Any, expire: int = None) -> bool:
        """
        设置缓存值
        
        Args:
            key: 缓存键
            value: 缓存值
            expire: 过期时间（秒）
            
        Returns:
            bool: 是否成功
        """
        try:
            if isinstance(value, (dict, list)):
                value = json.dumps(value)
            return redis_client.set(key, value, ex=expire or settings.CACHE_TTL)
        except redis.RedisError as e:
            logger.error(f"Redis set error: {str(e)}")
            return False

    @staticmethod
    def delete(key: str) -> bool:
        """
        删除缓存
        
        Args:
            key: 缓存键
            
        Returns:
            bool: 是否成功
        """
        try:
            return bool(redis_client.delete(key))
        except redis.RedisError as e:
            logger.error(f"Redis delete error: {str(e)}")
            return False

def cache_decorator(prefix: str = "", expire: int = None):
    """
    缓存装饰器
    
    Args:
        prefix: 缓存键前缀
        expire: 过期时间（秒）
        
    Returns:
        callable: 装饰器函数
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # 生成缓存键
            cache_key = f"{prefix}:{get_cache_key(*args, **kwargs)}"
            
            # 尝试获取缓存
            cached_value = Cache.get(cache_key)
            if cached_value:
                try:
                    return json.loads(cached_value)
                except json.JSONDecodeError:
                    return cached_value
            
            # 执行原函数
            result = await func(*args, **kwargs)
            
            # 设置缓存
            Cache.set(cache_key, result, expire)
            
            return result
        return wrapper
    return decorator 