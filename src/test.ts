import { AmazonService } from './services/amazon.service';
import { logInfo } from './utils/logger';

async function testScrapeDealsPage() {
  try {
    const amazonService = new AmazonService();
    
    logInfo('开始测试爬取 Amazon Deals 页面');
    
    // 测试爬取折扣商品ASIN
    const asinList = await amazonService.scrapeDealsPage();
    
    logInfo('爬取结果', {
      totalAsins: asinList.length,
      firstFiveAsins: asinList.slice(0, 5)
    });

    // 验证结果
    if (asinList.length > 0) {
      logInfo('测试成功: 成功获取折扣商品ASIN列表');
    } else {
      logInfo('测试失败: 未获取到任何ASIN');
    }

    // 验证ASIN格式
    const validAsinFormat = asinList.every(asin => /^[A-Z0-9]{10}$/.test(asin));
    if (validAsinFormat) {
      logInfo('测试成功: 所有ASIN格式正确');
    } else {
      logInfo('测试失败: 存在格式不正确的ASIN');
    }

  } catch (error) {
    logInfo('测试失败', { error });
  }
}

// 运行测试
testScrapeDealsPage(); 