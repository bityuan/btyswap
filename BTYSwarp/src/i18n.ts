import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import XHR from 'i18next-xhr-backend'

// 从 localStorage 获取保存的语言设置，默认为英文
const getStoredLanguage = (): string => {
  const stored = localStorage.getItem('i18nextLng')
  if (stored === 'zh-CN' || stored === 'zh') {
    return 'zh-CN'
  }
  return 'en'
}

i18next
  .use(XHR)
  .use(initReactI18next)
  .init({
    backend: {
      loadPath: `./locales/{{lng}}.json`
    },
    react: {
      useSuspense: true
    },
    lng: getStoredLanguage(),
    fallbackLng: 'en',
    preload: ['en', 'zh-CN'],
    keySeparator: false,
    interpolation: { escapeValue: false }
  })

export default i18next
