import { Page } from 'puppeteer';
import { BrowserUtils } from '../utils/browser.utils';
import * as fs from 'fs';
import * as path from 'path';

interface ProductInfo {
  asin: string;
  index: number;
}

export class DealsService {
  private static readonly AMAZON_DEALS_URL = 'https://www.amazon.com/deals';
  private static MAX_PRODUCTS = 200; // 移除readonly，允许通过方法修改
  private static readonly SELECTORS = {
    LOAD_MORE_FOOTER: '[data-testid="load-more-footer"]',
    LOAD_MORE_BUTTON: '[data-testid="load-more-view-more-button"]',
    LOAD_MORE_SPINNER: '[data-testid="load-more-spinner"]',
    PRODUCT_GRID: '.a-section.a-spacing-none.feed-carousel',
    PRODUCT_ITEMS: '.a-carousel-card',
    PRODUCT_LIST_CONTAINER: '[data-testid="virtuoso-item-list"]',
    PRODUCT_CONTAINER: '[data-viewport-type="window"]',
    PRODUCT_ITEM: '[data-index]'
  };

  /**
   * 设置最大商品数量
   */
  private static setMaxProducts(maxProducts: number): void {
    if (maxProducts > 0) {
      this.MAX_PRODUCTS = maxProducts;
    }
  }

  /**
   * 获取当前可见产品的ASIN列表
   */
  private static async getVisibleProductsInfo(page: Page): Promise<ProductInfo[]> {
    return await page.evaluate(() => {
      const products: ProductInfo[] = [];
      // 获取所有商品卡片
      const productCards = document.querySelectorAll('[data-testid="product-card"]');
      
      productCards.forEach((card, index) => {
        // 优先从卡片的data-asin属性获取
        let asin = card.getAttribute('data-asin') || '';
        
        // 如果没有data-asin，尝试从父元素的data-testid获取
        if (!asin) {
          const parentElement = card.closest('[data-testid]');
          if (parentElement) {
            asin = parentElement.getAttribute('data-testid') || '';
          }
        }
        
        // 如果还是没有，尝试从商品链接中获取
        if (!asin) {
          const link = card.querySelector('a[href*="/dp/"]');
          if (link) {
            const href = link.getAttribute('href') || '';
            const match = href.match(/\/dp\/([A-Z0-9]{10})/);
            if (match) {
              asin = match[1];
            }
          }
        }
        
        if (asin) {
          products.push({ 
            asin,
            index 
          });
        }
      });
      
      return products;
    });
  }

  /**
   * 获取产品列表容器的padding信息
   */
  private static async getListContainerPadding(page: Page): Promise<{ top: number; bottom: number }> {
    return await page.evaluate((selector) => {
      const container = document.querySelector(selector);
      if (!container) return { top: 0, bottom: 0 };
      
      const style = window.getComputedStyle(container);
      return {
        top: parseInt(style.paddingTop, 10),
        bottom: parseInt(style.paddingBottom, 10)
      };
    }, this.SELECTORS.PRODUCT_LIST_CONTAINER);
  }

  /**
   * 自动滚动并收集产品ASIN
   */
  private static async autoScrollAndCollectAsins(page: Page): Promise<Set<string>> {
    const MAX_SCROLL_ATTEMPTS = 50;
    let scrollAttempts = 0;
    let lastHeight = 0;
    const INITIAL_SCROLL_STEP = 400; // 首次滚动步长更小
    const NORMAL_SCROLL_STEP = 600; // 正常滚动步长
    const collectedAsins = new Set<string>();
    let lastAsinCount = 0;
    let noNewAsinCount = 0;
    const MAX_NO_NEW_ASIN_ATTEMPTS = 3;
    let isFirstScroll = true; // 标记是否为首次滚动
    
    // 首次加载后等待更长时间
    console.log('等待页面初始内容完全加载...');
    await page.waitForTimeout(3000);
    
    while (scrollAttempts < MAX_SCROLL_ATTEMPTS) {
      // 检查是否达到目标数量
      if (collectedAsins.size >= this.MAX_PRODUCTS) {
        console.log(`已达到目标商品数量 ${this.MAX_PRODUCTS}，停止收集`);
        break;
      }

      // 获取当前可见的产品信息
      const products = await this.getVisibleProductsInfo(page);
      const currentAsins = new Set(products.map(p => p.asin));
      
      // 计算新收集到的ASIN数量
      const newAsins = [...currentAsins].filter(asin => !collectedAsins.has(asin));
      
      // 将新的ASIN添加到收集集合中
      newAsins.forEach(asin => collectedAsins.add(asin));
      
      // 如果这次没有新的ASIN，可能需要滚动或者点击加载更多
      if (newAsins.length === 0) {
        noNewAsinCount++;
        console.log(`连续 ${noNewAsinCount} 次没有发现新的ASIN`);
        
        if (noNewAsinCount >= MAX_NO_NEW_ASIN_ATTEMPTS) {
          console.log(`连续 ${MAX_NO_NEW_ASIN_ATTEMPTS} 次没有新ASIN，可能已到达有效内容底部`);
          break;
        }

        // 检查是否到达"View more deals"按钮
        const viewMoreButton = await page.$(this.SELECTORS.LOAD_MORE_BUTTON);
        if (viewMoreButton) {
          console.log('已到达"View more deals"按钮，尝试点击加载更多...');
          try {
            await viewMoreButton.click();
            // 点击加载更多后等待更长时间
            await page.waitForTimeout(3000);
            noNewAsinCount = 0;
            continue;
          } catch (error) {
            console.log('点击加载更多按钮失败:', error);
            break;
          }
        }

        // 执行滚动
        console.log(`当前视口无新产品，执行${isFirstScroll ? '首次' : ''}滚动...`);
        const scrollStep = isFirstScroll ? INITIAL_SCROLL_STEP : NORMAL_SCROLL_STEP;
        
        // 使用平滑滚动
        await page.evaluate((step) => {
          window.scrollBy({
            top: step,
            behavior: 'smooth'
          });
        }, scrollStep);

        // 首次滚动后等待更长时间
        await page.waitForTimeout(isFirstScroll ? 2500 : 1500);
        isFirstScroll = false;

        // 检查高度变化
        const currentHeight = await page.evaluate(() => document.documentElement.scrollHeight);
        if (currentHeight === lastHeight) {
          const spinner = await page.$(this.SELECTORS.LOAD_MORE_SPINNER);
          if (!spinner) {
            console.log('页面高度未变化且无加载动画，可能已到达底部');
            const finalProducts = await this.getVisibleProductsInfo(page);
            finalProducts.forEach(p => collectedAsins.add(p.asin));
            break;
          }
        }
        lastHeight = currentHeight;
        scrollAttempts++;
      } else {
        // 有新的ASIN被收集到
        console.log(`本次收集到 ${newAsins.length} 个新ASIN，当前总数: ${collectedAsins.size}/${this.MAX_PRODUCTS}`);
        noNewAsinCount = 0;
        
        // 如果连续两次收集到的总数相同，说明可能需要滚动了
        if (collectedAsins.size === lastAsinCount) {
          console.log('连续两次收集数量相同，准备滚动...');
          const scrollStep = isFirstScroll ? INITIAL_SCROLL_STEP : NORMAL_SCROLL_STEP;
          
          // 使用平滑滚动
          await page.evaluate((step) => {
            window.scrollBy({
              top: step,
              behavior: 'smooth'
            });
          }, scrollStep);
          
          await page.waitForTimeout(isFirstScroll ? 2500 : 1500);
          isFirstScroll = false;
        }
        
        lastAsinCount = collectedAsins.size;
      }

      // 获取并显示当前进度
      const padding = await this.getListContainerPadding(page);
      console.log(`列表容器padding - 上: ${padding.top}px, 下: ${padding.bottom}px`);
    }

    if (scrollAttempts >= MAX_SCROLL_ATTEMPTS) {
      console.log('达到最大滚动次数限制');
    }

    return collectedAsins;
  }

  /**
   * 等待页面加载完成
   */
  private static async waitForPageLoad(page: Page): Promise<void> {
    console.log('等待页面加载...');
    
    try {
      // 等待页面的核心内容加载
      await Promise.race([
        // 等待商品网格出现
        page.waitForSelector(this.SELECTORS.PRODUCT_GRID, { timeout: 10000 }),
        // 或者等待商品项出现
        page.waitForSelector(this.SELECTORS.PRODUCT_ITEMS, { timeout: 10000 })
      ]);

      // 快速检查是否被反爬
      const content = await page.content();
      if (content.includes('Robot Check')) {
        throw new Error('被亚马逊反爬虫系统检测');
      }

      console.log('页面核心内容已加载完成');
    } catch (error: any) {
      console.error('页面加载出现异常:', error.message);
      throw error;
    }
  }

  /**
   * 自动滚动并等待加载
   */
  private static async autoScrollAndWait(page: Page): Promise<void> {
    const MAX_SCROLL_ATTEMPTS = 20;
    let scrollAttempts = 0;
    let lastHeight = 0;
    const SCROLL_STEP = 1200;

    while (scrollAttempts < MAX_SCROLL_ATTEMPTS) {
      // 获取当前页面高度和产品数量
      const { height, productCount } = await page.evaluate((selectors) => {
        const products = document.querySelectorAll(selectors.PRODUCT_ITEMS);
        return {
          height: document.documentElement.scrollHeight,
          productCount: products.length
        };
      }, this.SELECTORS);

      console.log(`当前页面高度: ${height}px, 产品数量: ${productCount}`);

      // 检查是否到达"View more deals"按钮
      const viewMoreButton = await page.$(this.SELECTORS.LOAD_MORE_BUTTON);
      if (viewMoreButton) {
        console.log('已到达"View more deals"按钮');
        break;
      }

      // 如果页面高度没有变化且没有加载动画,可能已经到底
      if (height === lastHeight) {
        const spinner = await page.$(this.SELECTORS.LOAD_MORE_SPINNER);
        if (!spinner) {
          console.log('页面高度未变化且无加载动画,可能已到达底部');
          break;
        }
      }

      // 记录滚动前的状态
      const beforeScrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      const beforeScrollProducts = await page.$$eval(this.SELECTORS.PRODUCT_ITEMS, items => items.length);

      // 执行滚动
      await page.evaluate((step) => {
        window.scrollBy(0, step);
      }, SCROLL_STEP);

      // 等待短暂时间让页面响应
      await page.waitForTimeout(500);

      try {
        // 等待页面高度变化或新产品出现
        await Promise.race([
          // 检查页面高度是否变化
          page.waitForFunction(
            (prevHeight) => document.documentElement.scrollHeight > prevHeight,
            { timeout: 3000 },
            beforeScrollHeight
          ),
          // 检查产品数量是否增加
          page.waitForFunction(
            (selector, prevCount) => document.querySelectorAll(selector).length > prevCount,
            { timeout: 3000 },
            this.SELECTORS.PRODUCT_ITEMS,
            beforeScrollProducts
          )
        ]).catch(() => {
          console.log('未检测到页面更新');
          scrollAttempts++;
        });

        // 给页面一点时间完成渲染
        await page.waitForTimeout(500);

      } catch (error: any) {
        console.log('本次滚动加载出现异常:', error.message);
        scrollAttempts++;
      }

      // 更新上一次高度
      lastHeight = height;
    }

    if (scrollAttempts >= MAX_SCROLL_ATTEMPTS) {
      console.log('达到最大滚动次数限制');
    }
  }

  /**
   * 加载Amazon Deals页面并截图
   */
  static async captureDealsPage(maxProducts?: number): Promise<{screenshotPath: string; asins: string[]}> {
    if (maxProducts) {
      this.setMaxProducts(maxProducts);
    }
    
    console.log(`开始加载Amazon Deals页面，目标商品数量: ${this.MAX_PRODUCTS}`);
    const page = await BrowserUtils.createPage();

    try {
      // 访问页面
      console.log('正在访问页面:', this.AMAZON_DEALS_URL);
      await page.goto(this.AMAZON_DEALS_URL);

      // 等待页面加载完成
      await this.waitForPageLoad(page);

      // 自动滚动加载更多内容并收集ASIN
      console.log('开始自动滚动加载更多内容并收集ASIN...');
      const collectedAsins = await this.autoScrollAndCollectAsins(page);
      
      // 最后等待一段时间确保所有内容都已加载
      await BrowserUtils.delay(5000);

      // 创建screenshots目录
      const screenshotsDir = path.join(process.cwd(), 'screenshots');
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir);
      }

      // 生成文件名
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const screenshotPath = path.join(screenshotsDir, `amazon-deals-${timestamp}.png`);

      // 截取页面截图
      console.log('正在截取页面...');
      await page.screenshot({
        path: screenshotPath,
        fullPage: true
      });

      console.log('截图已保存至:', screenshotPath);
      console.log('总共收集到的ASIN数量:', collectedAsins.size);
      
      return {
        screenshotPath,
        asins: Array.from(collectedAsins)
      };

    } catch (error) {
      console.error('页面加载或截图过程中出错:', error);
      throw error;
    } finally {
      await BrowserUtils.closeBrowser();
    }
  }
} 