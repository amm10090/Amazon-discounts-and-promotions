import { Request, Response, NextFunction } from 'express';
import { ProductController } from '../../src/controllers/product.controller';
import { AmazonService } from '../../src/services/amazon.service';
import { AppError } from '../../src/middlewares/error.middleware';
import { TFunction } from 'i18next';

// Mock AmazonService
jest.mock('../../src/services/amazon.service');

describe('ProductController', () => {
  let productController: ProductController;
  let mockRequest: Partial<Request> & { t: TFunction };
  let mockResponse: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    // 重置所有mock
    jest.clearAllMocks();
    
    // 创建mock请求对象
    mockRequest = {
      params: {},
      t: jest.fn().mockImplementation((key: string) => key) as unknown as TFunction
    };

    // 创建mock响应对象
    mockResponse = {
      json: jest.fn()
    };

    // 创建mock next函数
    mockNext = jest.fn();

    // 创建控制器实例
    productController = new ProductController();
  });

  describe('getProductDetails', () => {
    const mockAsin = 'B07H65KP63';
    const mockProduct = {
      asin: mockAsin,
      title: '测试商品',
      image: 'https://example.com/image.jpg',
      price: '¥99.99',
      features: ['特性1', '特性2'],
      promotions: [
        {
          Type: 'Deal',
          Description: '优惠描述'
        }
      ],
      savings: {
        Amount: '20.00'
      }
    };

    it('当ASIN参数缺失时应该抛出400错误', async () => {
      // 设置请求参数
      mockRequest.params = {};

      // 调用控制器方法
      await productController.getProductDetails(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // 验证错误处理
      expect(mockNext).toHaveBeenCalledWith(
        expect.any(AppError)
      );
      const error = mockNext.mock.calls[0][0] as unknown as AppError;
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('errors.invalidRequest');
    });

    it('当商品不存在时应该抛出404错误', async () => {
      // 设置请求参数
      mockRequest.params = { asin: mockAsin };

      // Mock AmazonService返回空数组
      (AmazonService.prototype.getItemsByAsins as jest.Mock).mockResolvedValue([]);

      // 调用控制器方法
      await productController.getProductDetails(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // 验证错误处理
      const error = mockNext.mock.calls[0][0] as unknown as AppError;
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('errors.notFound');
    });

    it('应该成功返回格式化的商品信息', async () => {
      // 设置请求参数
      mockRequest.params = { asin: mockAsin };

      // Mock AmazonService返回商品数据
      (AmazonService.prototype.getItemsByAsins as jest.Mock).mockResolvedValue([mockProduct]);

      // 调用控制器方法
      await productController.getProductDetails(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // 验证响应
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'success.getProduct',
        data: {
          product: expect.objectContaining({
            asin: mockAsin,
            title: '测试商品',
            image: expect.objectContaining({
              small: 'https://example.com/image.jpg',
              medium: 'https://example.com/image.jpg',
              large: 'https://example.com/image.jpg'
            }),
            price: expect.objectContaining({
              current: 99.99,
              original: 20.00,
              currency: 'CNY',
              formatted: '¥99.99',
              savings: expect.objectContaining({
                amount: 20.00,
                percentage: expect.any(Number)
              })
            }),
            promotions: [
              {
                type: 'Deal',
                description: '优惠描述'
              }
            ],
            features: ['特性1', '特性2'],
            url: `https://www.amazon.com/dp/${mockAsin}`
          })
        }
      });
    });

    it('当发生错误时应该传递给错误处理中间件', async () => {
      // 设置请求参数
      mockRequest.params = { asin: mockAsin };

      // Mock AmazonService抛出错误
      const mockError = new Error('测试错误');
      (AmazonService.prototype.getItemsByAsins as jest.Mock).mockRejectedValue(mockError);

      // 调用控制器方法
      await productController.getProductDetails(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // 验证错误处理
      expect(mockNext).toHaveBeenCalledWith(mockError);
    });
  });
}); 