import { DealsService } from './services/deals.service';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  try {
    console.log('开始测试 Amazon Deals 页面抓取...');
    
    // 记录开始时间
    const startTime = new Date();
    console.log('开始时间:', startTime.toLocaleString());

    // 执行抓取
    const result = await DealsService.captureDealsPage();
    
    // 记录结束时间
    const endTime = new Date();
    const duration = (endTime.getTime() - startTime.getTime()) / 1000;
    
    console.log('\n测试完成！');
    console.log('----------------------------------------');
    console.log(`截图保存在: ${result.screenshotPath}`);
    console.log(`收集到的ASIN数量: ${result.asins.length}`);
    console.log(`耗时: ${duration.toFixed(2)}秒`);
    
    // 验证结果
    if (result.asins.length === 0) {
      throw new Error('未收集到任何ASIN，可能存在问题');
    }

    // 保存ASIN列表到文件
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const asinFilePath = path.join(process.cwd(), 'data', `asins-${timestamp}.json`);
    
    // 确保data目录存在
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
    }

    // 创建结果对象
    const testResult = {
      timestamp: timestamp,
      duration: duration,
      totalAsins: result.asins.length,
      asins: result.asins,
      screenshotPath: result.screenshotPath
    };

    // 写入文件
    fs.writeFileSync(
      asinFilePath, 
      JSON.stringify(testResult, null, 2)
    );

    console.log(`ASIN列表已保存到: ${asinFilePath}`);
    console.log('----------------------------------------');
    
    // 输出前10个ASIN作为样本
    console.log('\n前10个ASIN样本:');
    result.asins.slice(0, 10).forEach((asin, index) => {
      console.log(`${index + 1}. ${asin}`);
    });

  } catch (error) {
    console.error('测试过程中发生错误:', error);
    process.exit(1);
  }
}

// 执行测试
console.log('Amazon Deals 自动化测试开始...\n');
main(); 