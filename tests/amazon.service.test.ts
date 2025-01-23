import { AmazonService } from '../src/services/amazon.service';
import ProductAdvertisingAPIv1 from 'amazon-paapi';
import { config } from '../src/config/config';
import puppeteer from 'puppeteer-extra';
import UserAgent from 'user-agents';

// Mock 所有依赖
jest.mock('amazon-paapi');
jest.mock('puppeteer-extra');
jest.mock('user-agents');
jest.mock('../src/utils/logger');

describe('AmazonService', () => {
  let amazonService: AmazonService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    (ProductAdvertisingAPIv1.GetItems as jest.Mock).mockRejectedValue(new Error('API不应该被调用'));
    amazonService = new AmazonService();
  });

  describe('getItemsByAsins', () => {
    const mockValidAsin = 'B0B9XB57XM';
    const mockValidResponse = {
      ItemsResult: {
        Items: [
          {
            ASIN: mockValidAsin,
            ItemInfo: {
              Title: { DisplayValue: '测试商品' },
              Features: { DisplayValues: ['特性1', '特性2'] },
              ProductInfo: {
                IsAdultProduct: { DisplayValue: false }
              }
            },
            Offers: {
              Listings: [
                {
                  Price: {
                    Amount: 99.99,
                    Currency: 'USD',
                    DisplayAmount: '$99.99',
                    SavingBasis: {
                      Amount: 20.00,
                      Currency: 'USD',
                      DisplayAmount: '$20.00'
                    }
                  },
                  Promotions: [{ Type: 'Deal' }],
                  MerchantInfo: {
                    Name: 'Amazon.com',
                    Id: 'ATVPDKIKX0DER'
                  },
                  IsBuyBoxWinner: true,
                  DeliveryInfo: {
                    IsAmazonFulfilled: true,
                    IsFreeShippingEligible: true,
                    IsPrimeEligible: true
                  }
                }
              ],
              Summaries: [
                {
                  LowestPrice: {
                    Amount: 99.99,
                    Currency: 'USD',
                    DisplayAmount: '$99.99'
                  },
                  HighestPrice: {
                    Amount: 119.99,
                    Currency: 'USD',
                    DisplayAmount: '$119.99'
                  },
                  OfferCount: 5
                }
              ]
            },
            Images: {
              Primary: {
                Small: { URL: 'https://example.com/small.jpg' },
                Medium: { URL: 'https://example.com/medium.jpg' },
                Large: { URL: 'https://example.com/large.jpg' }
              }
            }
          }
        ]
      }
    };

    it('当ASIN列表为空时应该抛出错误', async () => {
      await expect(amazonService.getItemsByAsins([])).rejects.toThrow('ASIN列表必须是非空数组');
      expect(ProductAdvertisingAPIv1.GetItems).not.toHaveBeenCalled();
    });

    it('当ASIN列表超过10个时应该抛出错误', async () => {
      const tooManyAsins = Array(11).fill(mockValidAsin);
      await expect(amazonService.getItemsByAsins(tooManyAsins)).rejects.toThrow('ASIN列表最多支持10个商品');
      expect(ProductAdvertisingAPIv1.GetItems).not.toHaveBeenCalled();
    });

    it('应该成功获取商品信息', async () => {
      (ProductAdvertisingAPIv1.GetItems as jest.Mock).mockResolvedValue(mockValidResponse);

      const result = await amazonService.getItemsByAsins([mockValidAsin]);

      expect(result).toHaveLength(1);
      const product = result[0];
      expect(product.asin).toBe(mockValidAsin);
      expect(product.title).toBe('测试商品');
      expect(product.image).toBe('https://example.com/medium.jpg');
      expect(product.price).toBe('$99.99');
      expect(product.priceDetails).toMatchObject({
        amount: 99.99,
        currency: 'USD',
        displayAmount: '$99.99',
        savingBasis: {
          amount: 20.00,
          currency: 'USD',
          displayAmount: '$20.00'
        }
      });
      expect(product.merchantInfo).toEqual({
        name: 'Amazon.com',
        id: 'ATVPDKIKX0DER'
      });
      expect(product.deliveryInfo).toEqual({
        isAmazonFulfilled: true,
        isFreeShippingEligible: true,
        isPrimeEligible: true
      });
      expect(product.isBuyBoxWinner).toBe(true);

      expect(ProductAdvertisingAPIv1.GetItems).toHaveBeenCalledWith(
        expect.objectContaining({
          AccessKey: config.amazon.accessKey,
          SecretKey: config.amazon.secretKey,
          PartnerTag: config.amazon.associateTag
        }),
        expect.objectContaining({
          ItemIds: [mockValidAsin],
          ItemIdType: 'ASIN',
          Condition: 'New',
          Resources: expect.any(Array)
        })
      );
    });

    it('当API返回错误时应该抛出错误', async () => {
      const mockErrorResponse = {
        Errors: [
          { 
            Code: 'InvalidParameterValue',
            Message: '无效的参数值'
          }
        ]
      };
      (ProductAdvertisingAPIv1.GetItems as jest.Mock).mockResolvedValue(mockErrorResponse);

      await expect(amazonService.getItemsByAsins([mockValidAsin]))
        .rejects
        .toThrow('API 返回错误: [{"code":"InvalidParameterValue","message":"无效的参数值"}]');
    });
  });

  describe('scrapeDealsPage', () => {
    const mockContext = {
      newPage: jest.fn()
    };

    const mockPage = {
      setViewport: jest.fn(),
      setUserAgent: jest.fn(),
      setRequestInterception: jest.fn(),
      evaluateOnNewDocument: jest.fn(),
      goto: jest.fn(),
      waitForSelector: jest.fn(),
      on: jest.fn(),
      evaluate: jest.fn(),
      content: jest.fn(),
      close: jest.fn()
    };

    const mockBrowser = {
      createIncognitoBrowserContext: jest.fn().mockResolvedValue(mockContext),
      close: jest.fn()
    };

    beforeEach(() => {
      jest.clearAllMocks();
      
      // Mock UserAgent
      (UserAgent as jest.Mock).mockImplementation(() => ({
        toString: () => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }));

      // 设置基本的mock返回值
      mockContext.newPage.mockResolvedValue(mockPage);
      mockPage.setViewport.mockResolvedValue(undefined);
      mockPage.setUserAgent.mockResolvedValue(undefined);
      mockPage.setRequestInterception.mockResolvedValue(undefined);
      mockPage.evaluateOnNewDocument.mockResolvedValue(undefined);
      mockPage.goto.mockResolvedValue(undefined);
      mockPage.waitForSelector.mockResolvedValue(undefined);
      mockPage.on.mockImplementation((event, callback) => {
        if (event === 'request') {
          callback({ 
            resourceType: () => 'document', 
            continue: jest.fn(),
            abort: jest.fn()
          });
        }
      });

      (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);
    });

    it('应该成功获取折扣商品的ASIN列表', async () => {
      const mockAsinList = ['B0B9XB57XM'];
      mockPage.evaluate.mockImplementation(() => Promise.resolve(mockAsinList));

      const result = await amazonService.scrapeDealsPage();

      expect(result).toEqual(mockAsinList);
      expect(puppeteer.launch).toHaveBeenCalledWith(expect.objectContaining({
        headless: true,
        args: expect.arrayContaining([
          '--no-sandbox',
          '--disable-setuid-sandbox'
        ])
      }));
      expect(mockPage.setViewport).toHaveBeenCalledWith({
        width: 1920,
        height: 1080
      });
      expect(mockPage.goto).toHaveBeenCalledWith(
        'https://www.amazon.com/deals',
        expect.objectContaining({
          waitUntil: 'networkidle0',
          timeout: 30000
        })
      );
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('应该在页面评估失败时使用备用方法', async () => {
      // 模拟页面加载和滚动
      mockPage.goto.mockResolvedValue(undefined);
      mockPage.waitForSelector.mockResolvedValue(undefined);
      
      // 模拟页面评估返回空数组，触发备用方法
      mockPage.evaluate.mockImplementation(() => Promise.resolve([]));

      // 模拟备用方法成功
      const mockContent = '<div data-asin="B0B9XB57XM"></div>';
      mockPage.content.mockResolvedValue(mockContent);

      const result = await amazonService.scrapeDealsPage();
      
      // 验证结果
      expect(result).toEqual(['B0B9XB57XM']);
      expect(mockPage.content).toHaveBeenCalled();
      expect(mockPage.close).toHaveBeenCalled();
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('应该处理网络错误', async () => {
      mockPage.goto.mockRejectedValue(new Error('网络错误'));

      await expect(amazonService.scrapeDealsPage()).rejects.toThrow('网络错误');
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('应该在代理启用时使用代理', async () => {
      const originalConfig = { ...config.proxy };
      config.proxy.enabled = true;
      config.proxy.list = ['http://proxy1.example.com'];

      // 模拟页面加载和滚动
      mockPage.goto.mockResolvedValue(undefined);
      mockPage.waitForSelector.mockResolvedValue(undefined);
      mockPage.evaluate.mockImplementation((fn) => {
        if (typeof fn === 'function') {
          return Promise.resolve([]);  // 返回空数组而不是undefined
        }
        return Promise.resolve([]);
      });

      await amazonService.scrapeDealsPage();

      expect(puppeteer.launch).toHaveBeenCalledWith(
        expect.objectContaining({
          args: expect.arrayContaining([
            '--proxy-server=http://proxy1.example.com'
          ])
        })
      );

      // 恢复原始配置
      Object.assign(config.proxy, originalConfig);
    });

    it('应该正确处理资源拦截', async () => {
      const mockRequests = [
        {
          resourceType: () => 'image',
          abort: jest.fn(),
          continue: jest.fn()
        },
        {
          resourceType: () => 'document',
          abort: jest.fn(),
          continue: jest.fn()
        }
      ];

      // 模拟请求拦截
      mockPage.on.mockImplementation((event, callback) => {
        if (event === 'request') {
          mockRequests.forEach(req => callback(req));
        }
      });

      // 模拟页面加载和滚动
      mockPage.goto.mockResolvedValue(undefined);
      mockPage.waitForSelector.mockResolvedValue(undefined);
      mockPage.evaluate.mockImplementation((fn) => {
        if (typeof fn === 'function') {
          return Promise.resolve([]);  // 返回空数组而不是undefined
        }
        return Promise.resolve([]);
      });

      await amazonService.scrapeDealsPage();

      // 验证图片请求被阻止
      expect(mockRequests[0].abort).toHaveBeenCalled();
      expect(mockRequests[0].continue).not.toHaveBeenCalled();

      // 验证文档请求被允许
      expect(mockRequests[1].continue).toHaveBeenCalled();
      expect(mockRequests[1].abort).not.toHaveBeenCalled();
    });

    it('应该正确清理资源', async () => {
      // 模拟页面加载和滚动
      mockPage.goto.mockResolvedValue(undefined);
      mockPage.waitForSelector.mockResolvedValue(undefined);
      
      // 模拟页面评估返回空数组，触发备用方法
      mockPage.evaluate.mockImplementation(() => Promise.resolve([]));

      // 模拟备用方法失败
      mockPage.content.mockRejectedValue(new Error('内容获取失败'));

      // 模拟关闭方法
      mockPage.close.mockResolvedValue(undefined);
      mockBrowser.close.mockResolvedValue(undefined);

      await expect(amazonService.scrapeDealsPage()).rejects.toThrow('内容获取失败');

      // 验证资源清理
      expect(mockPage.close).toHaveBeenCalled();
      expect(mockBrowser.close).toHaveBeenCalled();
    });
  });
}); 