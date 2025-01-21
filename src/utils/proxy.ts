import { config } from '../config/config';

export class ProxyRotator {
  private proxyList: string[];
  private currentIndex: number;

  constructor() {
    this.proxyList = config.proxy.list || [];
    this.currentIndex = 0;
  }

  /**
   * 获取下一个代理
   */
  async getNextProxy(): Promise<string> {
    if (this.proxyList.length === 0) {
      throw new Error('No proxies available');
    }

    const proxy = this.proxyList[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.proxyList.length;
    return proxy;
  }

  /**
   * 添加新代理
   */
  addProxy(proxy: string): void {
    if (!this.proxyList.includes(proxy)) {
      this.proxyList.push(proxy);
    }
  }

  /**
   * 移除失效代理
   */
  removeProxy(proxy: string): void {
    const index = this.proxyList.indexOf(proxy);
    if (index > -1) {
      this.proxyList.splice(index, 1);
      if (this.currentIndex >= this.proxyList.length) {
        this.currentIndex = 0;
      }
    }
  }
} 