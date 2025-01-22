import amazonPaapi from 'amazon-paapi';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { logError, logInfo } from '../utils/logger';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { config } from '../config/config';
import puppeteer from 'puppeteer-extra';
import type { Browser, Page, HTTPRequest } from 'puppeteer';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import UserAgent from 'user-agents';

// 添加stealth插件
puppeteer.use(StealthPlugin());

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
      LanguagesOfPreference: ['en_US'], // 添加默认语言
      CurrencyOfPreference: 'USD', // 添加默认货币
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
   * 获取下一个代理地址
   */
  private getNextProxy(): string | undefined {
    if (!config.proxy.enabled || !config.proxy.list || config.proxy.list.length === 0) {
      return undefined;
    }
    
    this.currentProxyIndex = (this.currentProxyIndex + 1) % config.proxy.list.length;
    return config.proxy.list[this.currentProxyIndex];
  }

  /**
   * 随机延迟函数
   */
  private async randomDelay(min: number = 2000, max: number = 5000): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1) + min);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * 模拟人类滚动行为
   */
  private async autoScroll(page: Page): Promise<void> {
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.documentElement.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if(totalHeight >= scrollHeight){
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
  }

  /**
   * 从Amazon Deals页面爬取折扣商品的ASIN
   */
  async scrapeDealsPage(): Promise<string[]> {
    let browser: Browser | undefined;
    try {
      logInfo('启动无头浏览器进行爬取');
      
      // 启动浏览器
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-infobars',
          '--window-position=0,0',
          '--ignore-certifcate-errors',
          '--ignore-certifcate-errors-spki-list',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          ...(config.proxy.enabled ? [`--proxy-server=${this.getNextProxy()}`] : [])
        ]
      });

      // 创建新的隐身上下文
      const context = await browser.createIncognitoBrowserContext();
      const page = await context.newPage();

      // 设置视窗大小
      await page.setViewport({
        width: 1920,
        height: 1080
      });

      // 设置随机桌面版User-Agent
      const userAgent = new UserAgent({ deviceCategory: 'desktop' });
      await page.setUserAgent(userAgent.toString());

      // 拦截不必要的资源
      await page.setRequestInterception(true);
      page.on('request', (request: HTTPRequest) => {
        const resourceType = request.resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
          request.abort();
        } else {
          request.continue();
        }
      });

      // 注入反检测脚本
      await page.evaluateOnNewDocument(() => {
        // 隐藏webdriver
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined
        });

        // 模拟正常的插件数量
        Object.defineProperty(navigator, 'plugins', {
          get: () => new Array(3).fill(null)
        });

        // 模拟正常的语言
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en']
        });
      });

      logInfo('正在访问Amazon Deals页面');
      await page.goto('https://www.amazon.com/deals', {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // 等待页面加载完成
      await page.waitForSelector('.a-section');
      
      // 模拟人类滚动
      await this.autoScroll(page);

      // 等待更多商品加载
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 尝试多个选择器来提取ASIN
      const asinList: string[] = await page.evaluate(() => {
        const asins: string[] = [];
        
        // 方法1: 通过data-testid属性
        document.querySelectorAll('[data-testid]').forEach(el => {
          const asin = el.getAttribute('data-testid');
          if (asin && /^B0[A-Z0-9]{8,9}$/.test(asin)) {
            asins.push(asin);
          }
        });

        // 方法2: 通过data-asin属性
        document.querySelectorAll('[data-asin]').forEach(el => {
          const asin = el.getAttribute('data-asin');
          if (asin && /^B0[A-Z0-9]{8,9}$/.test(asin)) {
            asins.push(asin);
          }
        });

        // 方法3: 通过商品链接
        document.querySelectorAll('a[href*="/dp/"]').forEach(el => {
          const href = el.getAttribute('href');
          if (href) {
            const match = href.match(/\/dp\/([A-Z0-9]{10})/);
            if (match && match[1]) {
              asins.push(match[1]);
            }
          }
        });

        return [...new Set(asins)]; // 去重
      });

      if (asinList.length === 0) {
        logInfo('使用备用方法获取ASIN');
        // 备用方法：直接获取页面内容并解析
        const content = await page.content();
        const asinMatches = content.match(/(?:data-asin="|\/dp\/)([A-Z0-9]{10})/g) || [];
        asinMatches.forEach(match => {
          const asin = match.replace(/data-asin="|\/dp\//, '');
          if (/^B0[A-Z0-9]{8,9}$/.test(asin)) {
            asinList.push(asin);
          }
        });
      }

      // 随机延迟
      await this.randomDelay();

      // 去重并返回结果
      const uniqueAsins = [...new Set(asinList)];
      
      logInfo(`成功获取到${uniqueAsins.length}个商品ASIN`, { asins: uniqueAsins });
      return uniqueAsins;

    } catch (error) {
      logError('爬取Deals页面时发生错误', { error });
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
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
} 