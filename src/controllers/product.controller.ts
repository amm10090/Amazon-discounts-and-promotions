import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AmazonService, ProductInfo } from '../services/amazon.service';
import { AppError } from '../middlewares/error.middleware';
import { logInfo } from '../utils/logger';

interface AmazonServiceResponse {
  asin: string;
  title?: string;
  image?: string;
  price?: string;
  priceDetails?: {
    amount?: number;
    currency?: string;
    displayAmount?: string;
    pricePerUnit?: {
      amount?: number;
      currency?: string;
      displayAmount?: string;
    };
    savingBasis?: {
      amount?: number;
      currency?: string;
      displayAmount?: string;
      savingBasisType?: string;
      savingBasisTypeLabel?: string;
    };
    savings?: {
      amount?: number;
      currency?: string;
      displayAmount?: string;
      percentage?: number;
    };
    loyaltyPoints?: {
      points?: number;
    };
  };
  condition?: {
    value?: string;
    subCondition?: string;
    conditionNote?: string;
  };
  merchantInfo?: {
    name?: string;
    id?: string;
    feedbackCount?: number;
    feedbackRating?: number;
  };
  deliveryInfo?: {
    isAmazonFulfilled?: boolean;
    isFreeShippingEligible?: boolean;
    isPrimeEligible?: boolean;
  };
  programEligibility?: {
    isPrimeExclusive?: boolean;
    isPrimePantry?: boolean;
  };
  offerSummary?: {
    condition?: string;
    lowestPrice?: string;
    highestPrice?: string;
    offerCount?: number;
  };
  availability?: {
    type?: string;
    message?: string;
    maxOrderQuantity?: number;
    minOrderQuantity?: number;
  };
  dealDetails?: {
    accessType?: string;
    endTime?: string;
    startTime?: string;
    percentClaimed?: number;
  };
  isBuyBoxWinner?: boolean;
  violatesMAP?: boolean;
}

interface FormattedProduct {
  asin: string;
  title: string;
  image: string;
  price: string;
  priceDetails?: {
    amount?: number;
    currency?: string;
    displayAmount?: string;
    pricePerUnit?: {
      amount?: number;
      currency?: string;
      displayAmount?: string;
    };
    savingBasis?: {
      amount?: number;
      currency?: string;
      displayAmount?: string;
      savingBasisType?: string;
      savingBasisTypeLabel?: string;
    };
    savings?: {
      amount?: number;
      currency?: string;
      displayAmount?: string;
      percentage?: number;
    };
    loyaltyPoints?: {
      points?: number;
    };
  };
  condition?: {
    value?: string;
    subCondition?: string;
    conditionNote?: string;
  };
  merchantInfo?: {
    name?: string;
    id?: string;
    feedbackCount?: number;
    feedbackRating?: number;
  };
  deliveryInfo?: {
    isAmazonFulfilled?: boolean;
    isFreeShippingEligible?: boolean;
    isPrimeEligible?: boolean;
  };
  programEligibility?: {
    isPrimeExclusive?: boolean;
    isPrimePantry?: boolean;
  };
  offerSummary?: {
    condition?: string;
    lowestPrice?: string;
    highestPrice?: string;
    offerCount?: number;
  };
  url: string;
  availability?: {
    type?: string;
    message?: string;
    maxOrderQuantity?: number;
    minOrderQuantity?: number;
  };
  dealDetails?: {
    accessType?: string;
    endTime?: string;
    startTime?: string;
    percentClaimed?: number;
  };
  isBuyBoxWinner?: boolean;
  violatesMAP?: boolean;
}

export class ProductController {
  private amazonService: AmazonService;

  constructor() {
    this.amazonService = new AmazonService();
  }

  /**
   * 格式化商品数据
   */
  private formatProduct(item: AmazonServiceResponse): FormattedProduct {
    return {
      asin: item.asin,
      title: item.title || '未知商品',
      image: item.image || '/images/no-image.png',
      price: item.price || '暂无价格',
      priceDetails: item.priceDetails,
      url: `https://www.amazon.com/dp/${item.asin}`,
      availability: item.availability,
      dealDetails: item.dealDetails,
      isBuyBoxWinner: item.isBuyBoxWinner,
      condition: item.condition,
      merchantInfo: item.merchantInfo,
      deliveryInfo: item.deliveryInfo,
      programEligibility: item.programEligibility,
      offerSummary: item.offerSummary,
      violatesMAP: item.violatesMAP
    };
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
        throw new AppError(req.t('errors.invalidRequest'), 400);
      }

      logInfo('Getting product details', { asin });
      const items = await this.amazonService.getItemsByAsins([asin]);

      if (!items.length) {
        throw new AppError(req.t('errors.notFound'), 404);
      }

      const formattedProduct = this.formatProduct(items[0]);

      res.json({
        status: 'success',
        message: req.t('success.getProduct'),
        data: {
          product: formattedProduct
        }
      });
    } catch (error) {
      next(error);
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
      logInfo('Scraping deals page');
      const products = await this.amazonService.scrapeDealsPage();
      
      // 提取 ASIN 列表
      const asinList = products.map(product => product.asin);
      
      logInfo('Getting items details', { asinCount: asinList.length });
      const items = await this.amazonService.getItemsByAsins(asinList.slice(0, 10));

      // 格式化返回数据
      const formattedProducts = items.map((item: AmazonServiceResponse) => this.formatProduct(item));

      res.json({
        status: 'success',
        message: req.t('success.search'),
        data: {
          products: formattedProducts,
          total: formattedProducts.length
        }
      });
    } catch (error) {
      next(error);
    }
  };

  async getProductsByAsins(asinList: string[]) {
    try {
      const items = await this.amazonService.getItemsByAsins(asinList.slice(0, 10)); // 限制最多10个商品
      return items;
    } catch (error) {
      throw error;
    }
  }

  async getProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const asinList = await this.amazonService.scrapeDealsPage();
      const asins = asinList.map(product => product.asin);
      const items = await this.getProductsByAsins(asins);
      res.json(items);
    } catch (error) {
      next(error);
    }
  }
} 