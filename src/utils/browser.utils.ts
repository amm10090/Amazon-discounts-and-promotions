import puppeteer, { Browser, Page } from 'puppeteer';
import { browserConfig, pageConfig, userAgentConfig } from '../config/browser.config.js';

export class BrowserUtils {
  private static browser: Browser | null = null;

  /**
   * 获取浏览器实例
   */
  static async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch(browserConfig);
    }
    return this.browser;
  }

  /**
   * 创建新的页面实例
   */
  static async createPage(): Promise<Page> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    
    // 拦截请求
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      // 拦截图片资源
      if (['image'].includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });

    // 设置页面视图大小
    await page.setViewport(browserConfig.defaultViewport!);
    
    // 设置 User-Agent
    await page.setUserAgent(userAgentConfig.desktop[0]);

    // 设置美国地区和语言
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9'
    });

    // 设置地理位置为美国（纽约）
    await page.setGeolocation({
      latitude: 40.7128,
      longitude: -74.0060
    });

    // 设置时区为美国东部时间
    await page.emulateTimezone('America/New_York');
    
    // 设置页面超时
    page.setDefaultNavigationTimeout(pageConfig.navigationTimeout);
    page.setDefaultTimeout(pageConfig.waitForTimeout);

    return page;
  }

  /**
   * 关闭浏览器实例
   */
  static async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * 等待指定时间
   */
  static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private static async getX11Display(): Promise<string | null> {
    if (process.platform === 'linux' && process.env.WSL_DISTRO_NAME) {
      try {
        const { execSync } = require('child_process');
        
        // 首先尝试获取 DISPLAY 环境变量
        const display = process.env.DISPLAY;
        if (display) {
          console.log('使用现有 DISPLAY 环境变量:', display);
          return display;
        }

        // 如果没有 DISPLAY 环境变量，则尝试获取 WSL2 IP
        const cmd = "cat /etc/resolv.conf | grep nameserver | awk '{print $2}'";
        const ip = execSync(cmd, { encoding: 'utf8' }).trim();
        
        if (!ip) {
          console.warn('无法获取 WSL2 IP 地址');
          return null;
        }
        
        // 设置默认显示为 :0
        const displayAddress = `${ip}:0`;
        console.log('已配置 WSL2 显示地址:', displayAddress);
        return displayAddress;
      } catch (error) {
        console.error('获取 X11 显示配置时发生错误:', error);
        return null;
      }
    }
    return null;
  }
}
