import { DealsService } from './services/deals.service.js';
import { Logger } from './utils/logger.utils.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  try {
    Logger.info('开始测试 Amazon Deals 页面抓取...');
    
    // 记录开始时间
    const startTime = new Date();
    Logger.info(`开始时间: ${startTime.toLocaleString()}`);

    // 执行抓取
    const result = await DealsService.captureDealsPage();
    
    // 记录结束时间
    const endTime = new Date();
    const duration = (endTime.getTime() - startTime.getTime()) / 1000;
    
    // 保存ASIN列表到文件
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const dataDir = join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
    }

    // 创建结果对象
    const testResult = {
      timestamp: timestamp,
      duration: duration,
      totalAsins: result.asins.length,
      asins: result.asins,
      screenshotPath: result.screenshotPath,
      averageSpeed: (result.asins.length / duration).toFixed(2)
    };

    // 写入文件
    const asinFilePath = join(dataDir, `asins-${timestamp}.json`);
    fs.writeFileSync(
      asinFilePath, 
      JSON.stringify(testResult, null, 2)
    );

    Logger.summary('测试完成', {
      '截图保存路径': result.screenshotPath,
      '收集到的ASIN数量': result.asins.length,
      '耗时': `${duration.toFixed(2)}秒`,
      '平均采集速度': `${testResult.averageSpeed} 个/秒`,
      'ASIN数据保存位置': asinFilePath
    });

    Logger.asinSample(result.asins);

  } catch (error) {
    Logger.error(`测试过程中发生错误: ${error}`);
    process.exit(1);
  }
}

// 执行测试
Logger.info('Amazon Deals 自动化测试开始...\n');
main(); 