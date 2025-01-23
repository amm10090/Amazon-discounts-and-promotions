import { AmazonService } from './services/amazon.service';
import type { Product } from './types/amazon-paapi';

async function testGetItems() {
  try {
    console.log('开始获取商品详情...');
    const amazonService = new AmazonService();
    const asinList = ['B0BQR2BQYZ', 'B09V7Z4TJG', 'B0BBSP2JNQ', 'B0BPLB81LX'];
    const items = await amazonService.getItemsByAsins(asinList);
    
    console.log('\n获取到的商品详情：');
    items.forEach((item: Product, index: number) => {
      console.log(`\n商品 ${index + 1}:`);
      console.log('ASIN:', item.asin);
      console.log('标题:', item.title);
      console.log('价格:', item.price);
      console.log('图片:', item.image);
      if (item.priceDetails?.savingBasis) {
        console.log('原价:', item.priceDetails.savingBasis.displayAmount);
        console.log('节省:', (item.priceDetails.savingBasis.amount - item.priceDetails.amount).toFixed(2), 'USD');
      }
      if (item.merchantInfo) {
        console.log('卖家:', item.merchantInfo.name);
      }
      if (item.deliveryInfo) {
        console.log('Prime配送:', item.deliveryInfo.isPrimeEligible ? '是' : '否');
      }
    });
  } catch (error) {
    console.error('获取商品详情失败：', error);
  }
}

testGetItems(); 