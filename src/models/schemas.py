from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, HttpUrl

class ProductBase(BaseModel):
    """商品基础模型"""
    platform: str = Field(..., description="商品来源平台")
    external_id: str = Field(..., description="外部平台商品ID")
    title: str = Field(..., description="商品标题")
    description: Optional[str] = Field(None, description="商品描述")
    brand: str = Field(..., description="品牌名称")
    category: str = Field(..., description="商品类别")
    
    original_price: float = Field(..., description="原始价格")
    current_price: float = Field(..., description="当前价格")
    currency: str = Field(default="USD", description="货币单位")
    discount_percentage: Optional[float] = Field(None, description="折扣百分比")
    
    coupon_code: Optional[str] = Field(None, description="优惠券代码")
    coupon_description: Optional[str] = Field(None, description="优惠券描述")
    discount_type: Optional[str] = Field(None, description="折扣类型")
    
    product_url: HttpUrl = Field(..., description="商品链接")
    image_url: Optional[HttpUrl] = Field(None, description="商品图片链接")
    
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="额外元数据")
    status: str = Field(default="active", description="商品状态")

class ProductCreate(ProductBase):
    """创建商品的模型"""
    pass

class ProductUpdate(ProductBase):
    """更新商品的模型"""
    class Config:
        extra = "allow"

class ProductInDB(ProductBase):
    """数据库中的商品模型"""
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

class ProductResponse(ProductInDB):
    """API 响应的商品模型"""
    pass

# 查询参数模型
class ProductFilter(BaseModel):
    """商品查询过滤器"""
    platform: Optional[str] = None
    brand: Optional[str] = None
    category: Optional[str] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    discount_type: Optional[str] = None
    has_coupon: Optional[bool] = None

class PaginationParams(BaseModel):
    """分页参数"""
    page: int = Field(default=1, ge=1, description="页码")
    page_size: int = Field(default=20, ge=1, le=100, description="每页数量") 