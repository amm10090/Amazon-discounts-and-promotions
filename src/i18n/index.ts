import i18next from 'i18next';
import i18nextHttpMiddleware from 'i18next-http-middleware';
import { config } from '../config/config';

// 中文翻译
const zhTranslations = {
  translation: {
    errors: {
      internal: '内部服务器错误',
      notFound: '未找到资源',
      invalidRequest: '无效的请求',
      amazonApiError: '亚马逊API调用失败',
    },
    success: {
      search: '搜索成功',
      getProduct: '获取商品信息成功',
    },
  },
};

// 英文翻译
const enTranslations = {
  translation: {
    errors: {
      internal: 'Internal Server Error',
      notFound: 'Resource Not Found',
      invalidRequest: 'Invalid Request',
      amazonApiError: 'Amazon API Call Failed',
    },
    success: {
      search: 'Search Successful',
      getProduct: 'Product Information Retrieved Successfully',
    },
  },
};

// 初始化i18next
i18next
  .use(i18nextHttpMiddleware.LanguageDetector)
  .init({
    debug: config.server.env === 'development',
    fallbackLng: config.i18n.defaultLanguage,
    supportedLngs: config.i18n.supportedLanguages,
    resources: {
      zh: zhTranslations,
      en: enTranslations,
    },
  });

export default i18next; 