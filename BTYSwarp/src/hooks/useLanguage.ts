import { useCallback, useState, useEffect } from 'react'
import i18next from '../i18n'

/**
 * 语言切换 Hook
 */
export default function useLanguage() {
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'zh-CN'>(() => {
    const lng = i18next.language || localStorage.getItem('i18nextLng') || 'en'
    return lng === 'zh-CN' || lng === 'zh' ? 'zh-CN' : 'en'
  })

  // 监听语言变化
  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      const lang = lng === 'zh-CN' || lng === 'zh' ? 'zh-CN' : 'en'
      setCurrentLanguage(lang)
    }

    i18next.on('languageChanged', handleLanguageChanged)

    return () => {
      i18next.off('languageChanged', handleLanguageChanged)
    }
  }, [])

  /**
   * 切换语言
   */
  const changeLanguage = useCallback((lng: 'en' | 'zh-CN') => {
    i18next.changeLanguage(lng)
    // 保存到 localStorage
    localStorage.setItem('i18nextLng', lng)
  }, [])

  /**
   * 切换中英文
   */
  const toggleLanguage = useCallback(() => {
    const newLang = currentLanguage === 'en' ? 'zh-CN' : 'en'
    changeLanguage(newLang)
  }, [currentLanguage, changeLanguage])

  return {
    currentLanguage,
    changeLanguage,
    toggleLanguage,
  }
}

