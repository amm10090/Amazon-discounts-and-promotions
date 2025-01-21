import { AmazonService } from '../src/services/amazon.service';
import ProductAdvertisingAPIv1 from 'amazon-paapi';
import { config } from '../src/config/config';

// Mock ProductAdvertisingAPIv1
jest.mock('amazon-paapi');

describe('AmazonService', () => {
  let amazonService: AmazonService;
  
  beforeEach(() => {
    // 清除所有mock
    jest.clearAllMocks();
    // 设置默认mock返回undefined
    (ProductAdvertisingAPIv1.GetItems as jest.Mock).mockRejectedValue(new Error('API不应该被调用'));
    amazonService = new AmazonService();
  });

  describe('getItemsByAsins', () => {
    const mockValidAsin = 'B07H65KP63';
    const mockValidResponse = {
      ItemsResult: {
        Items: [
          {
            ASIN: mockValidAsin,
            ItemInfo: {
              Title: { DisplayValue: '测试商品' },
              Features: { DisplayValues: ['特性1', '特性2'] }
            },
            Offers: {
              Listings: [
                {
                  Price: { DisplayAmount: '¥99.99' },
                  Promotions: [{ Type: 'Deal' }],
                  SavingBasis: { Amount: '20.00' }
                }
              ]
            },
            Images: {
              Primary: {
                Medium: { URL: 'https://example.com/image.jpg' }
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
      // Mock API响应
      (ProductAdvertisingAPIv1.GetItems as jest.Mock).mockResolvedValue(mockValidResponse);

      const result = await amazonService.getItemsByAsins([mockValidAsin]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        asin: mockValidAsin,
        title: '测试商品',
        price: '¥99.99',
        image: 'https://example.com/image.jpg',
        features: ['特性1', '特性2'],
        promotions: [{ Type: 'Deal' }],
        savings: { Amount: '20.00' }
      });

      // 验证API调用参数
      expect(ProductAdvertisingAPIv1.GetItems).toHaveBeenCalledWith(
        expect.objectContaining({
          AccessKey: config.amazon.accessKey,
          SecretKey: config.amazon.secretKey,
          PartnerTag: config.amazon.associateTag
        }),
        expect.objectContaining({
          ItemIds: [mockValidAsin],
          ItemIdType: 'ASIN',
          Condition: 'New'
        })
      );
    });

    it('当所有商品都无法访问时应该抛出错误', async () => {
      const mockErrorResponse = {
        Errors: [
          { Code: 'ItemNotAccessible' }
        ]
      };
      (ProductAdvertisingAPIv1.GetItems as jest.Mock).mockResolvedValue(mockErrorResponse);

      await expect(amazonService.getItemsByAsins([mockValidAsin])).rejects.toThrow('所有请求的商品都无法访问');
    });

    it('当部分商品出错时应该继续处理可用的商品', async () => {
      const mockPartialErrorResponse = {
        Errors: [
          { Code: 'OtherError' }
        ],
        ItemsResult: {
          Items: [mockValidResponse.ItemsResult.Items[0]]
        }
      };
      (ProductAdvertisingAPIv1.GetItems as jest.Mock).mockResolvedValue(mockPartialErrorResponse);

      const result = await amazonService.getItemsByAsins([mockValidAsin]);
      expect(result).toHaveLength(1);
      expect(result[0].asin).toBe(mockValidAsin);
    });

    it('当API返回格式错误时应该抛出错误', async () => {
      const mockInvalidResponse = {};
      (ProductAdvertisingAPIv1.GetItems as jest.Mock).mockResolvedValue(mockInvalidResponse);

      await expect(amazonService.getItemsByAsins([mockValidAsin])).rejects.toThrow('API返回数据格式错误');
    });
  });
}); 