/**
 * 生成随机延迟时间
 * @param min 最小延迟(毫秒)
 * @param max 最大延迟(毫秒)
 */
export function randomDelay(min: number = 2000, max: number = 5000): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * 生成随机的桌面版User-Agent
 */
export function generateRandomUserAgent(): string {
  const browsers = [
    {
      name: 'Chrome',
      minVersion: 90,
      maxVersion: 120,
      structure: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{version} Safari/537.36'
    },
    {
      name: 'Firefox',
      minVersion: 90,
      maxVersion: 120,
      structure: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:{version}.0) Gecko/20100101 Firefox/{version}.0'
    },
    {
      name: 'Edge',
      minVersion: 90,
      maxVersion: 120,
      structure: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/{version} Safari/537.36 Edg/{version}'
    }
  ];

  const browser = browsers[Math.floor(Math.random() * browsers.length)];
  const version = Math.floor(Math.random() * (browser.maxVersion - browser.minVersion + 1)) + browser.minVersion;
  
  return browser.structure.replace(/\{version\}/g, version.toString());
}

/**
 * 生成随机IP地址
 */
export function generateRandomIP(): string {
  const ip = [];
  for (let i = 0; i < 4; i++) {
    ip.push(Math.floor(Math.random() * 256));
  }
  return ip.join('.');
}

/**
 * 检查是否被Amazon封禁
 * @param html 页面HTML内容
 */
export function isBlocked(html: string): boolean {
  const blockPatterns = [
    'Sorry, we just need to make sure you\'re not a robot',
    'Enter the characters you see below',
    'Your IP address has been blocked',
    'To discuss automated access to Amazon data please contact'
  ];

  return blockPatterns.some(pattern => html.includes(pattern));
} 