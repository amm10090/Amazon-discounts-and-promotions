from typing import List, Optional, Dict, Any
import asyncio
from datetime import datetime
import time
import random

from amazon_paapi import AmazonApi
from config.settings import settings
from src.utils.logger import logger
# from src.utils.cache import cache_decorator
from src.models.schemas import ProductCreate

class AmazonService:
    """Amazon Product Advertising API 服务"""
    
    def __init__(self):
        """初始化 Amazon API 客户端"""
        self.client = AmazonApi(
            key=settings.AMAZON_CLIENT_ID,  # AWS Access Key ID
            secret=settings.AMAZON_CLIENT_SECRET,  # AWS Secret Access Key
            tag=settings.AMAZON_REFRESH_TOKEN,  # Associate Tag
            country=settings.AMAZON_REGION,  # Country code (e.g., US)
            throttling=0.9  # 限制请求速率
        )
    
    def _generate_id(self) -> int:
        """生成唯一的整数ID"""
        # 使用时间戳和随机数组合生成唯一ID
        timestamp = int(time.time() * 1000)  # 毫秒级时间戳
        random_num = random.randint(0, 999)  # 3位随机数
        return timestamp * 1000 + random_num  # 组合成最终的ID
    
    # @cache_decorator(prefix="amazon:search", expire=3600)
    async def search_discounted_products(
        self,
        keywords: Optional[str] = None,
        category: Optional[str] = None,
        min_savings_percent: float = 5.0,
        page: int = 1,
        items_per_page: int = 10
    ) -> List[Dict[str, Any]]:
        """
        搜索折扣商品
        
        Args:
            keywords: 搜索关键词
            category: 商品类别
            min_savings_percent: 最小折扣百分比
            page: 页码
            items_per_page: 每页商品数
            
        Returns:
            List[Dict[str, Any]]: 商品列表
        """
        try:
            # 构建基础搜索参数
            search_params = {
                "keywords": keywords if keywords else "deals",  # 默认搜索 deals
                "item_page": page,
                "item_count": items_per_page,
                "availability": "Available",  # 只搜索可用商品
                "merchant": "All",  # 包含所有商家
                "min_saving_percent": int(min_savings_percent)  # 最小折扣百分比
            }

            # 如果指定了类别，添加到搜索参数中
            if category and category != "All":
                search_params["search_index"] = category
            
            logger.info(f"Searching Amazon products with params: {search_params}")
            search_result = self.client.search_items(**search_params)
            
            if not search_result or not hasattr(search_result, 'items'):
                logger.warning("No items found")
                return []
            
            products = []
            for item in search_result.items:
                product = self._parse_product(item)
                if product:
                    products.append(product)
            
            logger.info(f"Found {len(products)} discounted products")
            return products
            
        except Exception as e:
            logger.error(f"Error searching Amazon products: {str(e)}")
            return []
    
    # @cache_decorator(prefix="amazon:product", expire=3600)
    async def get_product_details(self, asin: str) -> Optional[Dict[str, Any]]:
        """
        获取商品详细信息
        
        Args:
            asin: Amazon ASIN
            
        Returns:
            Optional[Dict[str, Any]]: 商品信息
        """
        try:
            items = self.client.get_items([asin])
            if not items:
                logger.warning(f"Product not found: {asin}")
                return None
                
            return self._parse_product(items[0])
            
        except Exception as e:
            logger.error(f"Error getting Amazon product details: {str(e)}")
            return None
    
    def _parse_product(self, item: Any) -> Dict[str, Any]:
        """解析商品数据"""
        try:
            # 获取价格信息
            price_info = item.offers.listings[0].price if item.offers and item.offers.listings else None
            saving_basis = item.offers.listings[0].saving_basis if item.offers and item.offers.listings else None
            promotions = item.offers.listings[0].promotions if item.offers and item.offers.listings else []
            
            # 计算折扣
            original_price = float(saving_basis.amount) if saving_basis else (price_info.amount if price_info else 0)
            current_price = float(price_info.amount) if price_info else 0
            discount_percentage = 0
            
            if original_price > 0 and current_price > 0 and original_price > current_price:
                discount_percentage = ((original_price - current_price) / original_price) * 100
            
            # 获取当前时间
            current_time = datetime.utcnow()
            
            # 构建商品数据
            product_data = {
                "platform": "amazon",
                "external_id": item.asin,
                "title": item.item_info.title.display_value if item.item_info and item.item_info.title else "",
                "description": self._get_features(item),
                "brand": self._get_brand(item) or "Unknown",  # 确保品牌不为空
                "category": self._get_category(item) or "Other",  # 确保类别不为空
                "original_price": original_price,
                "current_price": current_price,
                "currency": price_info.currency if price_info else "USD",
                "discount_percentage": round(discount_percentage, 2),
                "coupon_code": self._get_promotion_id(promotions),
                "coupon_description": self._get_promotion_text(promotions),
                "discount_type": self._get_discount_type(promotions, discount_percentage > 0),
                "product_url": item.detail_page_url if hasattr(item, "detail_page_url") else "",
                "image_url": self._get_image_url(item),
                "metadata": {
                    "is_prime": self._is_prime_eligible(item),
                    "promotions": [p.__dict__ for p in promotions] if promotions else []
                },
                "status": "active"
            }
            
            # 添加数据库所需字段
            product_data.update({
                "id": self._generate_id(),
                "created_at": current_time,
                "updated_at": current_time
            })
            
            return product_data
            
        except Exception as e:
            logger.error(f"Error parsing Amazon product: {str(e)}")
            return {}
    
    def _has_discount_or_promotion(self, item: Any) -> bool:
        """检查商品是否有折扣或优惠"""
        try:
            if not item.offers or not item.offers.listings:
                return False
                
            listing = item.offers.listings[0]
            has_saving = hasattr(listing, "saving_basis")
            has_promotions = bool(listing.promotions) if hasattr(listing, "promotions") else False
            
            if has_saving:
                original_price = float(listing.saving_basis.amount)
                current_price = float(listing.price.amount)
                return current_price < original_price
                
            return has_promotions
        except Exception:
            return False
    
    def _get_features(self, item: Any) -> str:
        """获取商品特性描述"""
        try:
            if not item.item_info or not item.item_info.features:
                return ""
            return " ".join(item.item_info.features.display_values)
        except Exception:
            return ""
    
    def _get_brand(self, item: Any) -> str:
        """获取商品品牌"""
        try:
            if not item.item_info or not item.item_info.by_line_info:
                return ""
            return item.item_info.by_line_info.brand.display_value
        except Exception:
            return ""
    
    def _get_category(self, item: Any) -> str:
        """获取商品类别"""
        try:
            if not item.item_info or not item.item_info.classifications:
                return ""
            return item.item_info.classifications.product_group.display_value
        except Exception:
            return ""
    
    def _get_image_url(self, item: Any) -> str:
        """获取商品图片 URL"""
        try:
            if not item.images or not item.images.primary:
                return ""
            return item.images.primary.large.url
        except Exception:
            return ""
    
    def _is_prime_eligible(self, item: Any) -> bool:
        """检查是否支持 Prime"""
        try:
            if not item.offers or not item.offers.listings:
                return False
            return item.offers.listings[0].delivery_info.is_prime_eligible
        except Exception:
            return False
    
    def _get_promotion_id(self, promotions: List[Any]) -> Optional[str]:
        """获取优惠券代码"""
        if not promotions:
            return None
        try:
            return promotions[0].id
        except Exception:
            return None
    
    def _get_promotion_text(self, promotions: List[Any]) -> Optional[str]:
        """获取优惠描述"""
        if not promotions:
            return None
        try:
            return promotions[0].summary
        except Exception:
            return None
    
    def _get_discount_type(self, promotions: List[Any], has_price_discount: bool) -> str:
        """获取折扣类型"""
        if not promotions:
            return "DEAL" if has_price_discount else ""
        try:
            promo_type = promotions[0].type.lower()
            return "COUPON" if "coupon" in promo_type else "PROMOTION"
        except Exception:
            return "DEAL" if has_price_discount else "" 