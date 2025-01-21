declare module 'user-agents' {
  interface UserAgentOptions {
    deviceCategory?: 'desktop' | 'mobile' | 'tablet';
    platform?: string;
    vendor?: string;
    type?: string;
  }

  class UserAgent {
    constructor(options?: UserAgentOptions);
    toString(): string;
    data: {
      deviceCategory: string;
      platform: string;
      vendor: string;
      type: string;
      userAgent: string;
    };
  }

  export = UserAgent;
} 