import { Page } from 'puppeteer';
import { BrowserUtils } from '../utils/browser.utils.js';
import { Logger } from '../utils/logger.utils.js';
import fs from 'fs';
import { join } from 'path';

interface ProductInfo {
  asin: string;
  index: number;
}

interface ScrollMetrics {
  viewportHeight: number;
  pageHeight: number;
  scrollTop: number;
  visibleProducts: number;
}

export class DealsService {
  private static readonly AMAZON_DEALS_URL = 'https://www.amazon.com/deals';
  private static MAX_PRODUCTS = 200;
  private static readonly SCROLL_CONFIG = {
    MIN_STEP: 300,
    MAX_STEP: 800,
    INITIAL_DELAY: 2000,
    SCROLL_DELAY: 1500,
    LOAD_DELAY: 3000,
    SMOOTH_SCROLL_DURATION: 1000
  };
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
   * 获取页面滚动指标
   */
  private static async getScrollMetrics(page: Page): Promise<ScrollMetrics> {
    return await page.evaluate(() => {
      return {
        viewportHeight: window.innerHeight,
        pageHeight: document.documentElement.scrollHeight,
        scrollTop: window.scrollY,
        visibleProducts: document.querySelectorAll('[data-testid="product-card"]').length
      };
    });
  }

  /**
   * 计算最优滚动步长
   */
  private static calculateScrollStep(
    metrics: ScrollMetrics,
    newAsinCount: number,
    isFirstScroll: boolean
  ): number {
    // 基础步长基于视口高度
    let baseStep = metrics.viewportHeight * 0.6;
    
    // 根据新ASIN数量调整
    if (newAsinCount === 0) {
      // 如果没有新ASIN，增加步长
      baseStep *= 1.2;
    } else if (newAsinCount > 8) {
      // 如果发现很多新ASIN，减小步长以确保不会遗漏
      baseStep *= 0.6;
    }

    // 首次滚动使用更保守的步长
    if (isFirstScroll) {
      baseStep *= 0.7;
    }

    // 确保步长在合理范围内
    return Math.max(
      Math.min(baseStep, this.SCROLL_CONFIG.MAX_STEP),
      this.SCROLL_CONFIG.MIN_STEP
    );
  }

  /**
   * 执行平滑滚动
   */
  private static async smoothScroll(page: Page, scrollStep: number): Promise<void> {
    await page.evaluate(
      ({ step, duration }) => {
        return new Promise<void>((resolve) => {
          const startPosition = window.scrollY;
          const startTime = performance.now();
          
          function easeInOutQuad(t: number): number {
            return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
          }

          function animate(currentTime: number) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const easedProgress = easeInOutQuad(progress);
            const newPosition = startPosition + step * easedProgress;
            
            window.scrollTo(0, newPosition);

            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              resolve();
            }
          }

          requestAnimationFrame(animate);
        });
      },
      { 
        step: scrollStep, 
        duration: this.SCROLL_CONFIG.SMOOTH_SCROLL_DURATION 
      }
    );
  }

  /**
   * 自动滚动并收集产品ASIN
   */
  private static async autoScrollAndCollectAsins(page: Page): Promise<Set<string>> {
    const MAX_SCROLL_ATTEMPTS = 50;
    let scrollAttempts = 0;
    let lastHeight = 0;
    const collectedAsins = new Set<string>();
    let lastAsinCount = 0;
    let noNewAsinCount = 0;
    const MAX_NO_NEW_ASIN_ATTEMPTS = 3;
    let isFirstScroll = true;
    
    // 初始等待
    await BrowserUtils.delay(this.SCROLL_CONFIG.INITIAL_DELAY);
    
    while (scrollAttempts < MAX_SCROLL_ATTEMPTS) {
      if (collectedAsins.size >= this.MAX_PRODUCTS) {
        Logger.success(`已达到目标商品数量 ${this.MAX_PRODUCTS}，停止收集`);
        break;
      }

      // 获取当前可见产品
      const products = await this.getVisibleProductsInfo(page);
      const currentAsins = new Set(products.map(p => p.asin));
      const newAsins = [...currentAsins].filter(asin => !collectedAsins.has(asin));
      
      newAsins.forEach(asin => collectedAsins.add(asin));
      
      // 获取滚动指标
      const metrics = await this.getScrollMetrics(page);
      
      if (newAsins.length === 0) {
        noNewAsinCount++;
        Logger.debug(`连续 ${noNewAsinCount} 次没有发现新的ASIN`);
        
        if (noNewAsinCount >= MAX_NO_NEW_ASIN_ATTEMPTS) {
          Logger.warning(`连续 ${MAX_NO_NEW_ASIN_ATTEMPTS} 次没有新ASIN，可能已到达有效内容底部`);
          break;
        }

        // 检查"加载更多"按钮
        const viewMoreButton = await page.$(this.SELECTORS.LOAD_MORE_BUTTON);
        if (viewMoreButton) {
          Logger.info('发现"加载更多"按钮，尝试点击...');
          try {
            await viewMoreButton.click();
            await BrowserUtils.delay(this.SCROLL_CONFIG.LOAD_DELAY);
            noNewAsinCount = 0;
            continue;
          } catch (error) {
            Logger.error('点击加载更多按钮失败');
            break;
          }
        }

        // 计算并执行滚动
        const scrollStep = this.calculateScrollStep(metrics, newAsins.length, isFirstScroll);
        Logger.debug(`当前视口无新产品，执行${isFirstScroll ? '首次' : ''}平滑滚动 (${scrollStep}px)...`);
        
        await this.smoothScroll(page, scrollStep);
        await BrowserUtils.delay(isFirstScroll ? this.SCROLL_CONFIG.INITIAL_DELAY : this.SCROLL_CONFIG.SCROLL_DELAY);
        
        // 检查滚动后的页面状态
        const currentHeight = await page.evaluate(() => document.documentElement.scrollHeight);
        if (currentHeight === lastHeight) {
          const spinner = await page.$(this.SELECTORS.LOAD_MORE_SPINNER);
          if (!spinner) {
            Logger.warning('页面高度未变化且无加载动画，可能已到达底部');
            const finalProducts = await this.getVisibleProductsInfo(page);
            finalProducts.forEach(p => collectedAsins.add(p.asin));
            break;
          }
        }
        lastHeight = currentHeight;
        scrollAttempts++;
      } else {
        Logger.progress(collectedAsins.size, this.MAX_PRODUCTS, `本次收集到 ${newAsins.length} 个新ASIN`);
        noNewAsinCount = 0;
        
        if (collectedAsins.size === lastAsinCount) {
          const scrollStep = this.calculateScrollStep(metrics, newAsins.length, isFirstScroll);
          Logger.debug(`收集数量未增加，尝试平滑滚动 (${scrollStep}px)...`);
          
          await this.smoothScroll(page, scrollStep);
          await BrowserUtils.delay(isFirstScroll ? this.SCROLL_CONFIG.INITIAL_DELAY : this.SCROLL_CONFIG.SCROLL_DELAY);
        }
        
        lastAsinCount = collectedAsins.size;
      }

      const padding = await this.getListContainerPadding(page);
      Logger.debug(`列表容器padding - 上: ${padding.top}px, 下: ${padding.bottom}px`);
      isFirstScroll = false;
    }

    if (scrollAttempts >= MAX_SCROLL_ATTEMPTS) {
      Logger.warning('达到最大滚动次数限制');
    }

    return collectedAsins;
  }

  /**
   * 等待页面加载完成
   */
  private static async waitForPageLoad(page: Page): Promise<void> {
    Logger.info('等待页面加载...');
    
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

      Logger.success('页面核心内容已加载完成');
    } catch (error: any) {
      Logger.error(`页面加载出现异常: ${error.message}`);
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

      Logger.debug(`当前页面高度: ${height}px, 产品数量: ${productCount}`);

      // 检查是否到达"View more deals"按钮
      const viewMoreButton = await page.$(this.SELECTORS.LOAD_MORE_BUTTON);
      if (viewMoreButton) {
        Logger.info('已到达"View more deals"按钮');
        break;
      }

      // 如果页面高度没有变化且没有加载动画,可能已经到底
      if (height === lastHeight) {
        const spinner = await page.$(this.SELECTORS.LOAD_MORE_SPINNER);
        if (!spinner) {
          Logger.warning('页面高度未变化且无加载动画,可能已到达底部');
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
          Logger.info('未检测到页面更新');
          scrollAttempts++;
        });

        // 给页面一点时间完成渲染
        await page.waitForTimeout(500);

      } catch (error: any) {
        Logger.error(`本次滚动加载出现异常: ${error.message}`);
        scrollAttempts++;
      }

      // 更新上一次高度
      lastHeight = height;
    }

    if (scrollAttempts >= MAX_SCROLL_ATTEMPTS) {
      Logger.warning('达到最大滚动次数限制');
    }
  }

  /**
   * 加载Amazon Deals页面并截图
   */
  static async captureDealsPage(maxProducts?: number): Promise<{screenshotPath: string; asins: string[]}> {
    const startTime = Date.now();
    if (maxProducts) {
      this.setMaxProducts(maxProducts);
    }
    
    Logger.info(`开始加载Amazon Deals页面，目标商品数量: ${this.MAX_PRODUCTS}`);
    const page = await BrowserUtils.createPage();

    try {
      Logger.info(`正在访问页面: ${this.AMAZON_DEALS_URL}`);
      await page.goto(this.AMAZON_DEALS_URL);

      Logger.info('等待页面加载...');
      await this.waitForPageLoad(page);
      Logger.success('页面核心内容已加载完成');

      Logger.info('开始自动滚动加载更多内容并收集ASIN...');
      Logger.debug('等待页面初始内容完全加载...');
      const collectedAsins = await this.autoScrollAndCollectAsins(page);
      
      await BrowserUtils.delay(5000);

      // 创建screenshots目录
      const screenshotsDir = join(process.cwd(), 'screenshots');
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir);
      }

      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const screenshotPath = join(screenshotsDir, `amazon-deals-${timestamp}.png`);

      Logger.info('正在截取页面...');
      await page.screenshot({
        path: screenshotPath,
        fullPage: true
      });

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      Logger.summary('采集结果', {
        '截图保存路径': screenshotPath,
        '收集到的ASIN数量': collectedAsins.size,
        '耗时': `${duration}秒`,
        '平均采集速度': `${(collectedAsins.size / parseFloat(duration)).toFixed(2)} 个/秒`
      });

      Logger.asinSample(Array.from(collectedAsins));
      
      return {
        screenshotPath,
        asins: Array.from(collectedAsins)
      };

    } catch (error) {
      Logger.error(`页面加载或截图过程中出错: ${error}`);
      throw error;
    } finally {
      await BrowserUtils.closeBrowser();
    }
  }
} 