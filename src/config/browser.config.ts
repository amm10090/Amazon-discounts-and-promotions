import { PuppeteerLaunchOptions } from 'puppeteer';

export const browserConfig = {
  // 启动选项
  headless: false,
  defaultViewport: {
    width: 1920,
    height: 1080
  },
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--start-maximized',
    '--window-size=1920,1080',
    `--display=${process.env.DISPLAY}`,
    // 设置美国地区
    '--lang=en-US,en',
    '--accept-lang=en-US,en'
  ],
  // 设置地理位置为美国（纽约）
  ignoreHTTPSErrors: true,
  // 设置默认语言为英语
  env: {
    LANG: 'en_US.UTF-8'
  }
};

// 页面超时配置
export const pageConfig = {
  navigationTimeout: 60000,
  waitForTimeout: 10000
};

// 用户代理配置
export const userAgentConfig = {
  // 常用的桌面浏览器 User-Agent
  desktop: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ]
};

// 代理配置
export const proxyConfig = {
  enabled: false,
  host: '',
  port: '',
  username: '',
  password: ''
};
