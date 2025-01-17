from datetime import datetime
from typing import Optional
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, Integer, String, Float, DateTime, JSON

Base = declarative_base()

class BaseModel(Base):
    """所有模型的基类"""
    __abstract__ = True

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Product(BaseModel):
    """商品基础模型"""
    __tablename__ = "products"

    # 基本信息
    platform = Column(String, index=True)  # 平台名称：amazon, cj
    external_id = Column(String, unique=True, index=True)  # 外部平台商品ID
    title = Column(String)
    description = Column(String, nullable=True)
    brand = Column(String, index=True)
    category = Column(String, index=True)
    
    # 价格信息
    original_price = Column(Float)
    current_price = Column(Float)
    currency = Column(String, default="USD")
    discount_percentage = Column(Float, nullable=True)
    
    # 优惠信息
    coupon_code = Column(String, nullable=True)
    coupon_description = Column(String, nullable=True)
    discount_type = Column(String, nullable=True)  # COUPON, DEAL, PROMOTION
    
    # 链接信息
    product_url = Column(String)
    image_url = Column(String, nullable=True)
    
    # 其他信息
    extra_data = Column(JSON, nullable=True)  # 存储平台特定的额外信息
    status = Column(String, default="active")  # active, inactive
    
    class Config:
        orm_mode = True 