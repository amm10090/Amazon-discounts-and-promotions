import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AmazonService } from '../services/amazon.service';
import { AppError } from '../middlewares/error.middleware';
import { logError, logInfo } from '../utils/logger';

interface AmazonServiceResponse {
  asin: string;
  title?: string;
  image?: string;
  price?: string;
  priceDetails?: {
    amount?: number;
    currency?: string;
    displayAmount?: string;
    savings?: {
      amount?: number;
      currency?: string;
      displayAmount?: string;
      percentage?: number;
    };
    originalPrice?: {
      amount?: number;
      displayAmount?: string;
    };
  };
  dealInfo?: {
    type?: string;
    startTime?: string;
    endTime?: string;
    percentClaimed?: number;
  };
  isPrimeEligible?: boolean;
  features?: string[];
  detailPageUrl?: string;
}

interface SearchResult {
  items: AmazonServiceResponse[];
  totalResults: number;
  searchUrl: string;
  refinements?: any;
}

export class ProductController {
  private amazonService: AmazonService;

  constructor() {
    try {
      this.amazonService = new AmazonService();
    } catch (error) {
      logError('Failed to initialize AmazonService', error);
      throw error;
    }
  }

  /**
   * 格式化商品数据
   */
  private formatProduct(item: AmazonServiceResponse) {
    try {
      return {
        asin: item.asin,
        title: item.title || '未知商品',
        image: item.image || '/images/no-image.png',
        price: item.price || '暂无价格',
        priceDetails: item.priceDetails,
        dealInfo: item.dealInfo,
        isPrimeEligible: item.isPrimeEligible,
        features: item.features,
        detailPageUrl: item.detailPageUrl
      };
    } catch (error) {
      logError('Failed to format product', { error, item });
      throw new AppError('商品数据格式化失败', 500);
    }
  }

  /**
   * 获取商品详情
   */
  getProductDetails: RequestHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { asin } = req.params;

      if (!asin) {
        throw new AppError('缺少商品ASIN', 400);
      }

      logInfo('Getting product details', { asin });
      const items = await this.amazonService.getItemsByAsins([asin]);

      if (!items?.length) {
        throw new AppError('商品未找到', 404);
      }

      const formattedProduct = this.formatProduct(items[0]);

      res.json({
        status: 'success',
        message: '获取商品详情成功',
        data: {
          product: formattedProduct
        }
      });
    } catch (error: any) {
      logError('获取商品详情失败', error);
      next(new AppError(error.message || '获取商品详情失败', error.status || 500));
    }
  };

  /**
   * 获取所有折扣商品
   */
  getAllDiscounts: RequestHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      logInfo('Searching for discounted items');
      
      // 从查询参数中获取搜索选项
      const {
        searchIndex,
        minSavingsPercent,
        maxPrice,
        sortBy,
        itemCount,
        itemPage,
        dealTypes
      } = req.query;

      // 构建搜索参数
      const searchParams = {
        searchIndex: searchIndex as string,
        minSavingsPercent: minSavingsPercent ? Number(minSavingsPercent) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        sortBy: sortBy as any,
        itemCount: itemCount ? Number(itemCount) : undefined,
        itemPage: itemPage ? Number(itemPage) : undefined,
        dealTypes: dealTypes ? (dealTypes as string).split(',') as ('DealOfTheDay' | 'Lightning' | 'Promotion')[] : undefined
      };

      // 搜索折扣商品
      const result = await this.amazonService.searchDiscountedItems(searchParams);

      if (!result?.items) {
        throw new AppError('未找到折扣商品', 404);
      }

      // 格式化返回数据
      const formattedProducts = result.items.map((item: AmazonServiceResponse) => this.formatProduct(item));

      res.json({
        status: 'success',
        message: '获取折扣商品成功',
        data: {
          products: formattedProducts,
          total: result.totalResults,
          searchUrl: result.searchUrl,
          refinements: result.refinements
        }
      });
    } catch (error: any) {
      logError('获取折扣商品失败', error);
      next(new AppError(error.message || '获取折扣商品失败', error.status || 500));
    }
  };

  /**
   * 搜索商品
   */
  searchProducts: RequestHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const {
        keywords,
        searchIndex,
        sortBy,
        minPrice,
        maxPrice,
        minReviewsRating,
        condition,
        availability,
        itemCount,
        itemPage
      } = req.query;

      if (!keywords && !searchIndex) {
        throw new AppError('请提供搜索关键词或分类', 400);
      }

      // 构建搜索参数
      const searchParams = {
        keywords: keywords as string,
        searchIndex: searchIndex as string,
        sortBy: sortBy as any,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        minReviewsRating: minReviewsRating ? Number(minReviewsRating) : undefined,
        condition: condition as any,
        availability: availability as any,
        itemCount: itemCount ? Number(itemCount) : undefined,
        itemPage: itemPage ? Number(itemPage) : undefined
      };

      // 搜索商品
      const result = await this.amazonService.searchItems(searchParams);

      if (!result?.items) {
        throw new AppError('未找到相关商品', 404);
      }

      // 格式化返回数据
      const formattedProducts = result.items.map((item: AmazonServiceResponse) => this.formatProduct(item));

      res.json({
        status: 'success',
        message: '搜索成功',
        data: {
          products: formattedProducts,
          total: result.totalResults,
          searchUrl: result.searchUrl,
          refinements: result.refinements
        }
      });
    } catch (error: any) {
      logError('搜索商品失败', error);
      next(new AppError(error.message || '搜索商品失败', error.status || 500));
    }
  };
} 