import amazonPaapi from 'amazon-paapi';
import axios from 'axios';
import { logError, logInfo } from '../utils/logger';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { config } from '../config/config';
import puppeteer from 'puppeteer-extra';
import type { Browser, Page } from 'puppeteer';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import UserAgent from 'user-agents';

// 添加stealth插件
puppeteer.use(StealthPlugin());

export interface ProductInfo {
  asin: string;
  title: string;
  discount: {
    type: string;
    text?: string;
    price?: string;
    originalPrice?: string;
  };
}

export interface SearchItemsParams {
  keywords?: string;
  actor?: string;
  artist?: string;
  author?: string;
  brand?: string;
  title?: string;
  searchIndex?: string;
  sortBy?: 'AvgCustomerReviews' | 'Featured' | 'NewestArrivals' | 'Price:HighToLow' | 'Price:LowToHigh' | 'Relevance';
  minPrice?: number;
  maxPrice?: number;
  minReviewsRating?: number;
  itemPage?: number;
  itemCount?: number;
  condition?: 'Any' | 'New' | 'Used' | 'Collectible' | 'Refurbished';
  deliveryFlags?: string[];
  availability?: 'Available' | 'IncludeOutOfStock';
  browseNodeId?: string;
  dealsOnly?: boolean;
  minSavingsPercent?: number;
  hasCoupons?: boolean;
  Resources?: string[];
}

/**
 * 搜索折扣商品的参数接口
 */
export interface DiscountSearchParams {
  searchIndex?: string;  // 搜索分类
  minSavingsPercent?: number;  // 最小折扣比例
  dealTypes?: ('DealOfTheDay' | 'Lightning' | 'Promotion')[];  // 折扣类型
  maxPrice?: number;  // 最高价格
  sortBy?: 'AvgCustomerReviews' | 'Featured' | 'NewestArrivals' | 'Price:HighToLow' | 'Price:LowToHigh' | 'Relevance';
  itemCount?: number;  // 返回商品数量
  itemPage?: number;   // 分页
}

export class AmazonService {
  private commonParameters: any;
  private proxyAgent: HttpsProxyAgent<string> | undefined;
  private currentProxyIndex: number = 0;

  constructor() {
    // 初始化代理
    if (config.proxy.enabled) {
      const proxyUrl = `http://${config.proxy.host}:${config.proxy.port}`;
      this.proxyAgent = new HttpsProxyAgent(proxyUrl);
      
      // 设置全局代理
      axios.defaults.proxy = false;
      axios.defaults.httpsAgent = this.proxyAgent;
      axios.defaults.httpAgent = this.proxyAgent;
    }

    // 使用集中配置文件中的 Amazon PA-API 配置
    this.commonParameters = {
      AccessKey: config.amazon.accessKey,
      SecretKey: config.amazon.secretKey,
      PartnerTag: config.amazon.associateTag,
      PartnerType: 'Associates',
      Marketplace: 'www.amazon.com', // 根据官方文档，US marketplace 必须包含 www
      LanguagesOfPreference: ['en_US'], // 默认语言
      CurrencyOfPreference: 'USD', // 默认货币
      ...(config.proxy.enabled && { Agent: this.proxyAgent })
    };

    // 检查配置是否完整
    if (!this.commonParameters.AccessKey || !this.commonParameters.SecretKey || !this.commonParameters.PartnerTag) {
      const error = new Error('Amazon PA-API 配置不完整');
      logError('配置错误', {
        hasAccessKey: !!this.commonParameters.AccessKey,
        hasSecretKey: !!this.commonParameters.SecretKey,
        hasPartnerTag: !!this.commonParameters.PartnerTag,
        configSource: 'config.ts'
      });
      throw error;
    }

    // 添加更详细的配置日志
    console.log('Amazon PA-API 配置已加载', {
      hasAccessKey: !!this.commonParameters.AccessKey,
      hasSecretKey: !!this.commonParameters.SecretKey,
      hasPartnerTag: !!this.commonParameters.PartnerTag,
      marketplace: this.commonParameters.Marketplace,
      proxyEnabled: config.proxy.enabled,
      sdkVersion: require('amazon-paapi/package.json').version
    });
  }

  /**
   * 验证ASIN列表
   * @param asinList ASIN列表
   * @throws Error 如果验证失败
   */
  private validateAsinList(asinList: string[]) {
    // 参数验证
    if (!Array.isArray(asinList) || asinList.length === 0) {
      logError('验证失败', { error: 'ASIN列表必须是非空数组' });
      throw new Error('ASIN列表必须是非空数组');
    }

    if (asinList.length > 10) {
      logError('验证失败', { error: 'ASIN列表最多支持10个商品' });
      throw new Error('ASIN列表最多支持10个商品');
    }
  }

  /**
   * 延迟指定的毫秒数
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 带重试机制的API调用
   */
  private async retryableGetItems(parameters: any, retryCount = 3, initialDelay = 1000): Promise<any> {
    for (let i = 0; i < retryCount; i++) {
      try {
        // 如果不是第一次尝试，则等待
        if (i > 0) {
          const delayTime = initialDelay * Math.pow(2, i - 1);
          console.log(`第${i + 1}次重试，等待${delayTime}ms...`);
          await this.delay(delayTime);
        }

        // 设置请求超时
        const timeout = config.api.timeout || 30000; // 默认30秒
        console.log(`设置请求超时时间: ${timeout}ms`);
        
        // 添加超时配置到axios
        axios.defaults.timeout = timeout;

        // 验证认证信息
        if (!this.commonParameters.AccessKey || !this.commonParameters.SecretKey) {
          throw new Error('缺少 AccessKey 或 SecretKey');
        }

        // 验证必需参数
        if (!parameters.ItemIds || !parameters.Resources) {
          throw new Error('缺少必需参数');
        }

        // 添加调试信息
        console.log('发送请求前的参数验证:', {
          hasAccessKey: !!this.commonParameters.AccessKey,
          hasSecretKey: !!this.commonParameters.SecretKey,
          hasPartnerTag: !!parameters.PartnerTag,
          itemCount: parameters.ItemIds.length,
          resourceCount: parameters.Resources.length,
          marketplace: parameters.Marketplace,
          proxyEnabled: !!this.proxyAgent
        });

        const response = await amazonPaapi.GetItems(this.commonParameters, parameters);

        // 验证响应格式
        if (!response) {
          throw new Error('API 返回空响应');
        }

        // 检查错误信息
        if (response.Errors) {
          const errorDetails = response.Errors.map((error: any) => ({
            code: error.Code,
            message: error.Message,
            type: error.__type
          }));
          throw new Error(`API 返回错误: ${JSON.stringify(errorDetails)}`);
        }

        return response;
      } catch (error: any) {
        // 详细的错误日志
        console.error('API 调用错误:', {
          attempt: i + 1,
          error: {
            name: error.name,
            message: error.message,
            type: error.__type,
            code: error.Code,
            response: error.response?.body,
            status: error.response?.status,
            headers: error.response?.headers
          },
          request: {
            marketplace: parameters.Marketplace,
            itemIds: parameters.ItemIds,
            partnerTag: parameters.PartnerTag
          }
        });

        // 如果是最后一次尝试，则抛出错误
        if (i === retryCount - 1) {
          throw error;
        }

        // 只有在遇到限流错误时才重试
        if (error?.response?.status !== 429) {
          throw error;
        }

        console.log(`请求被限流，准备第${i + 1}次重试...`);
      }
    }
  }

  /**
   * 通过ASIN获取商品详细信息
   */
  async getItemsByAsins(asinList: string[]) {
    try {
      // 参数验证
      this.validateAsinList(asinList);

      // 记录查询信息
      console.log('正在查询商品信息', {
        marketplace: this.commonParameters.Marketplace,
        itemCount: asinList.length,
        asins: asinList,
        sdkVersion: require('amazon-paapi/package.json').version,
        nodeVersion: process.version,
        proxyEnabled: !!this.proxyAgent
      });

      // 构建请求参数
      const requestParameters = {
        ItemIds: asinList,
        ItemIdType: 'ASIN',
        Condition: 'New',
        Resources: [
          'ItemInfo.Title',
          'ItemInfo.Features',
          'ItemInfo.ProductInfo',
          'Images.Primary.Medium',
          'Offers.Listings.Availability.MaxOrderQuantity',
          'Offers.Listings.Availability.Message',
          'Offers.Listings.Availability.MinOrderQuantity',
          'Offers.Listings.Availability.Type',
          'Offers.Listings.Condition',
          'Offers.Listings.Condition.ConditionNote',
          'Offers.Listings.Condition.SubCondition',
          'Offers.Listings.DeliveryInfo.IsAmazonFulfilled',
          'Offers.Listings.DeliveryInfo.IsFreeShippingEligible',
          'Offers.Listings.DeliveryInfo.IsPrimeEligible',
          'Offers.Listings.DeliveryInfo.ShippingCharges',
          'Offers.Listings.IsBuyBoxWinner',
          'Offers.Listings.LoyaltyPoints.Points',
          'Offers.Listings.MerchantInfo',
          'Offers.Listings.Price',
          'Offers.Listings.ProgramEligibility.IsPrimeExclusive',
          'Offers.Listings.ProgramEligibility.IsPrimePantry',
          'Offers.Listings.Promotions',
          'Offers.Listings.SavingBasis',
          'Offers.Summaries.HighestPrice',
          'Offers.Summaries.LowestPrice',
          'Offers.Summaries.OfferCount',
          'OffersV2.Listings.Availability',
          'OffersV2.Listings.Condition',
          'OffersV2.Listings.DealDetails',
          'OffersV2.Listings.IsBuyBoxWinner',
          'OffersV2.Listings.LoyaltyPoints',
          'OffersV2.Listings.MerchantInfo',
          'OffersV2.Listings.Price',
          'OffersV2.Listings.Type'
        ],
        PartnerTag: this.commonParameters.PartnerTag,
        PartnerType: 'Associates',
        Marketplace: this.commonParameters.Marketplace
      };

      // 使用带重试机制的API调用
      const response = await this.retryableGetItems(requestParameters);
      
      // 验证响应数据
      if (!response?.ItemsResult?.Items) {
        throw new Error('API 返回数据格式错误');
      }

      // 返回格式化后的商品数据
      return response.ItemsResult.Items.map((item: any) => {
        const listing = item.OffersV2?.Listings?.[0] || item.Offers?.Listings?.[0];
        const offerSummary = item.Offers?.Summaries?.[0];
        
        return {
          asin: item.ASIN,
          title: item.ItemInfo?.Title?.DisplayValue,
          image: item.Images?.Primary?.Medium?.URL,
          price: listing?.Price?.DisplayAmount || listing?.Price?.Money?.DisplayAmount || '暂无价格',
          priceDetails: listing?.Price ? {
            amount: listing.Price.Amount || listing.Price.Money?.Amount,
            currency: listing.Price.Currency || listing.Price.Money?.Currency,
            displayAmount: listing.Price.DisplayAmount || listing.Price.Money?.DisplayAmount,
            pricePerUnit: listing.Price.PricePerUnit ? {
              amount: listing.Price.PricePerUnit.Amount,
              currency: listing.Price.PricePerUnit.Currency,
              displayAmount: listing.Price.PricePerUnit.DisplayAmount
            } : undefined,
            savingBasis: listing.Price.SavingBasis ? {
              amount: listing.Price.SavingBasis.Amount,
              currency: listing.Price.SavingBasis.Currency,
              displayAmount: listing.Price.SavingBasis.DisplayAmount,
              savingBasisType: listing.Price.SavingBasis.Type,
              savingBasisTypeLabel: listing.Price.SavingBasis.Label
            } : undefined,
            savings: listing.Price.Savings ? {
              amount: listing.Price.Savings.Amount,
              currency: listing.Price.Savings.Currency,
              displayAmount: listing.Price.Savings.DisplayAmount,
              percentage: listing.Price.Savings.Percentage
            } : undefined,
            loyaltyPoints: listing.LoyaltyPoints ? {
              points: listing.LoyaltyPoints.Points
            } : undefined
          } : undefined,
          condition: listing?.Condition ? {
            value: listing.Condition.Value,
            subCondition: listing.Condition.SubCondition,
            conditionNote: listing.Condition.ConditionNote
          } : undefined,
          merchantInfo: listing?.MerchantInfo ? {
            name: listing.MerchantInfo.Name,
            id: listing.MerchantInfo.Id,
            feedbackCount: listing.MerchantInfo.FeedbackCount,
            feedbackRating: listing.MerchantInfo.FeedbackRating
          } : undefined,
          deliveryInfo: listing?.DeliveryInfo ? {
            isAmazonFulfilled: listing.DeliveryInfo.IsAmazonFulfilled,
            isFreeShippingEligible: listing.DeliveryInfo.IsFreeShippingEligible,
            isPrimeEligible: listing.DeliveryInfo.IsPrimeEligible
          } : undefined,
          programEligibility: listing?.ProgramEligibility ? {
            isPrimeExclusive: listing.ProgramEligibility.IsPrimeExclusive,
            isPrimePantry: listing.ProgramEligibility.IsPrimePantry
          } : undefined,
          offerSummary: offerSummary ? {
            condition: offerSummary.Condition?.Value,
            lowestPrice: offerSummary.LowestPrice?.DisplayAmount,
            highestPrice: offerSummary.HighestPrice?.DisplayAmount,
            offerCount: offerSummary.OfferCount
          } : undefined,
          availability: listing?.Availability ? {
            type: listing.Availability.Type,
            message: listing.Availability.Message,
            maxOrderQuantity: listing.Availability.MaxOrderQuantity,
            minOrderQuantity: listing.Availability.MinOrderQuantity
          } : undefined,
          dealDetails: listing?.DealDetails ? {
            accessType: listing.DealDetails.AccessType,
            endTime: listing.DealDetails.EndTime,
            startTime: listing.DealDetails.StartTime,
            percentClaimed: listing.DealDetails.PercentClaimed
          } : undefined,
          isBuyBoxWinner: listing?.IsBuyBoxWinner,
          violatesMAP: listing?.ViolatesMAP
        };
      });

    } catch (error: any) {
      // 错误处理
      logError('获取商品信息时发生错误', {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          type: error.__type,
          code: error.Code,
          response: error.response?.body,
          status: error.response?.status
        },
        request: {
          marketplace: this.commonParameters.Marketplace,
          asinList,
          sdkVersion: require('amazon-paapi/package.json').version,
          nodeVersion: process.version
        }
      });
      throw error;
    }
  }

  private isValidAsin(asin: string): boolean {
    return /^B0[A-Z0-9]{8,9}$/.test(asin);
  }

  /**
   * 搜索折扣商品
   * 专门用于搜索带有折扣或优惠券的商品
   */
  async searchDiscountedItems(params: DiscountSearchParams = {}) {
    // 构建基础搜索参数
    const searchParams: SearchItemsParams = {
      availability: 'Available',  // 只搜索有货商品
      condition: 'New',  // 只搜索新品
      minSavingsPercent: params.minSavingsPercent || 5,  // 默认最少5%折扣
      itemCount: params.itemCount || 10,
      itemPage: params.itemPage || 1,
      sortBy: params.sortBy || 'Featured',
      searchIndex: params.searchIndex,
      maxPrice: params.maxPrice,
      deliveryFlags: [
        ...(params.dealTypes || []),  // 添加指定的折扣类型
        'Prime'  // 默认包含 Prime 商品
      ]
    };

    // 使用 Deals 分类的 browseNodeId
    if (!params.searchIndex) {
      // 使用 Deals & Promotions 分类
      searchParams.browseNodeId = "17276797011";  // Amazon US Deals 分类
      
      // 如果没有指定其他搜索条件，添加一个空的关键词以触发搜索
      if (!searchParams.keywords) {
        searchParams.keywords = "deals";
      }
    }

    return this.searchItems({
      ...searchParams,
      Resources: [
        'ItemInfo.Title',
        'ItemInfo.Features',
        'ItemInfo.ProductInfo',
        'Images.Primary.Medium',
        'Offers.Listings.Price',
        'Offers.Listings.SavingBasis',
        'Offers.Listings.Promotions',
        'Offers.Listings.Condition',
        'Offers.Listings.DeliveryInfo.IsPrimeEligible',
        'Offers.Summaries.LowestPrice',
        'Offers.Summaries.HighestPrice',
        'Offers.Summaries.OfferCount',
        'OffersV2.Listings.Availability',
        'OffersV2.Listings.Price',
        'OffersV2.Listings.SavingBasis',
        'OffersV2.Listings.Promotions',
        'OffersV2.Listings.DealDetails',
        'SearchRefinements'
      ]
    });
  }

  /**
   * 搜索商品
   * @param params 搜索参数
   * @returns 搜索结果
   */
  async searchItems(params: SearchItemsParams) {
    try {
      // 验证至少有一个搜索条件
      const hasSearchCriteria = !!(
        params.keywords ||
        params.actor ||
        params.artist ||
        params.author ||
        params.brand ||
        params.title ||
        params.dealsOnly
      );

      if (!hasSearchCriteria) {
        throw new Error('必须提供至少一个搜索条件(keywords, actor, artist, author, brand, title) 或指定只搜索折扣商品');
      }

      // 构建请求参数
      const requestParameters = {
        ...this.commonParameters,
        ItemCount: params.itemCount || 10,
        ItemPage: params.itemPage || 1,
        Resources: [
          'ItemInfo.Title',
          'ItemInfo.Features',
          'ItemInfo.ProductInfo',
          'Images.Primary.Medium',
          'Offers.Listings.Price',
          'Offers.Listings.SavingBasis',
          'Offers.Listings.Promotions',
          'Offers.Listings.DeliveryInfo.IsPrimeEligible',
          'Offers.Summaries.LowestPrice',
          'Offers.Summaries.HighestPrice',
          'Offers.Summaries.OfferCount',
          'OffersV2.Listings.DealDetails',
          'SearchRefinements'
        ],
        ...(params.keywords && { Keywords: params.keywords }),
        ...(params.actor && { Actor: params.actor }),
        ...(params.artist && { Artist: params.artist }),
        ...(params.author && { Author: params.author }),
        ...(params.brand && { Brand: params.brand }),
        ...(params.title && { Title: params.title }),
        ...(params.searchIndex && { SearchIndex: params.searchIndex }),
        ...(params.sortBy && { SortBy: params.sortBy }),
        ...(params.minPrice && { MinPrice: params.minPrice }),
        ...(params.maxPrice && { MaxPrice: params.maxPrice }),
        ...(params.minReviewsRating && { MinReviewsRating: params.minReviewsRating }),
        ...(params.condition && { Condition: params.condition }),
        ...(params.deliveryFlags && { DeliveryFlags: params.deliveryFlags }),
        ...(params.availability && { Availability: params.availability }),
        ...(params.browseNodeId && { BrowseNodeId: params.browseNodeId }),
        ...(params.dealsOnly && { 
          Availability: 'Available',
          Condition: 'New',
          MinSavingsPercent: params.minSavingsPercent || 5
        })
      };

      // 使用带重试机制的API调用
      const response = await this.retryableSearchItems(requestParameters);

      // 验证响应数据
      if (!response?.SearchResult) {
        throw new Error('API 返回数据格式错误');
      }

      // 返回格式化后的搜索结果
      return {
        totalResults: response.SearchResult.TotalResultCount,
        searchUrl: response.SearchResult.SearchURL,
        items: response.SearchResult.Items?.map((item: any) => {
          const listing = item.Offers?.Listings?.[0] || item.OffersV2?.Listings?.[0];
          const offerSummary = item.Offers?.Summaries?.[0];
          const dealDetails = listing?.DealDetails;
          
          // 计算折扣信息
          const savings = listing?.Price?.Savings || {};
          const savingBasis = listing?.SavingBasis;
          const promotions = listing?.Promotions || [];
          
          return {
            asin: item.ASIN,
            title: item.ItemInfo?.Title?.DisplayValue,
            image: item.Images?.Primary?.Medium?.URL,
            price: listing?.Price?.DisplayAmount,
            priceDetails: listing?.Price ? {
              amount: listing.Price.Amount,
              currency: listing.Price.Currency,
              displayAmount: listing.Price.DisplayAmount,
              savings: savings ? {
                amount: savings.Amount,
                percentage: savings.Percentage,
                displayAmount: savings.DisplayAmount
              } : undefined,
              originalPrice: savingBasis ? {
                amount: savingBasis.Amount,
                displayAmount: savingBasis.DisplayAmount
              } : undefined
            } : undefined,
            dealInfo: dealDetails ? {
              type: dealDetails.Type,
              startTime: dealDetails.StartTime,
              endTime: dealDetails.EndTime,
              percentClaimed: dealDetails.PercentClaimed
            } : undefined,
            promotions: promotions.map((promo: any) => ({
              type: promo.Type,
              displayAmount: promo.Amount?.DisplayAmount,
              discountPercent: promo.DiscountPercent,
              description: promo.Description
            })),
            isPrimeEligible: listing?.DeliveryInfo?.IsPrimeEligible,
            offerSummary: offerSummary ? {
              lowestPrice: offerSummary.LowestPrice?.DisplayAmount,
              highestPrice: offerSummary.HighestPrice?.DisplayAmount,
              offerCount: offerSummary.OfferCount
            } : undefined,
            features: item.ItemInfo?.Features?.DisplayValues,
            detailPageUrl: item.DetailPageURL
          };
        }) || [],
        refinements: response.SearchResult.SearchRefinements
      };

    } catch (error: any) {
      logError('搜索商品时发生错误', {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          type: error.__type,
          code: error.Code
        },
        params
      });
      throw error;
    }
  }

  /**
   * 带重试机制的SearchItems API调用
   */
  private async retryableSearchItems(parameters: any, retryCount = 3, initialDelay = 1000): Promise<any> {
    for (let i = 0; i < retryCount; i++) {
      try {
        if (i > 0) {
          const delayTime = initialDelay * Math.pow(2, i - 1);
          console.log(`第${i + 1}次重试，等待${delayTime}ms...`);
          await this.delay(delayTime);
        }

        const response = await amazonPaapi.SearchItems(this.commonParameters, parameters);

        if (!response) {
          throw new Error('API 返回空响应');
        }

        if (response.Errors) {
          const errorDetails = response.Errors.map((error: any) => ({
            code: error.Code,
            message: error.Message,
            type: error.__type
          }));
          throw new Error(`API 返回错误: ${JSON.stringify(errorDetails)}`);
        }

        return response;

      } catch (error: any) {
        console.error('SearchItems API 调用错误:', {
          attempt: i + 1,
          error: {
            name: error.name,
            message: error.message,
            type: error.__type,
            code: error.Code
          },
          request: {
            keywords: parameters.Keywords,
            searchIndex: parameters.SearchIndex,
            itemCount: parameters.ItemCount
          }
        });

        if (i === retryCount - 1) {
          throw error;
        }

        if (error?.response?.status !== 429) {
          throw error;
        }

        console.log(`请求被限流，准备第${i + 1}次重试...`);
      }
    }
  }
} 