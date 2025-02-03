import i18next from 'i18next';
import { config } from './config/config.js';

await i18next.init({
    lng: config.i18n.defaultLanguage,
    fallbackLng: config.i18n.fallbackLanguage,
    supportedLngs: config.i18n.supportedLanguages,
    resources: {
        en: {
            translation: {
                welcome: 'Welcome to Amazon Discounts and Promotions',
                error: {
                    notFound: 'Resource not found',
                    serverError: 'Internal server error',
                    invalidLanguage: 'Invalid language code'
                }
            }
        },
        zh: {
            translation: {
                welcome: '欢迎使用亚马逊折扣和促销',
                error: {
                    notFound: '未找到资源',
                    serverError: '服务器内部错误',
                    invalidLanguage: '无效的语言代码'
                }
            }
        }
    }
});

export default i18next; 