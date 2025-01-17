from typing import List, Optional
from fastapi import APIRouter, Query, HTTPException

from src.services.amazon_service import AmazonService
from src.models.schemas import ProductResponse, ProductFilter, PaginationParams

router = APIRouter(prefix="/amazon", tags=["amazon"])
amazon_service = AmazonService()

@router.get("/search", response_model=List[ProductResponse])
async def search_products(
    keywords: Optional[str] = Query(None, description="搜索关键词"),
    category: Optional[str] = Query(None, description="商品类别"),
    min_discount: float = Query(5.0, description="最小折扣百分比", ge=0, le=100),
    page: int = Query(1, description="页码", ge=1),
    page_size: int = Query(10, description="每页数量", ge=1, le=50)
):
    """
    搜索 Amazon 折扣商品
    
    参数:
    - keywords: 搜索关键词
    - category: 商品类别
    - min_discount: 最小折扣百分比
    - page: 页码
    - page_size: 每页数量
    """
    try:
        products = await amazon_service.search_discounted_products(
            keywords=keywords,
            category=category,
            min_savings_percent=min_discount,
            page=page,
            items_per_page=page_size
        )
        return products
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/product/{asin}", response_model=ProductResponse)
async def get_product(asin: str):
    """
    获取 Amazon 商品详情
    
    参数:
    - asin: Amazon ASIN
    """
    try:
        product = await amazon_service.get_product_details(asin=asin)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        return product
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 