/** 語言 */
export type Language = 'zh' | 'en' | 'fr'
/** 語言配置 */
export const LANGUAGE_CONFIG: Record<
  Language,
  {
    code: Language
    name: string
    emoji: string
    azureCode: string
    ollamaLang: string
    isSupported: {
      pronunciation: boolean
      translation: boolean
      stt: boolean
    }
  }
> = {
  zh: {
    code: 'zh',
    name: '中文',
    emoji: '🇨🇳',
    azureCode: 'zh-TW',
    ollamaLang: 'Traditional Chinese',
    isSupported: {
      pronunciation: true,
      translation: true,
      stt: true,
    },
  },
  en: {
    code: 'en',
    name: '英文',
    emoji: '🇬🇧',
    azureCode: 'en-US',
    ollamaLang: 'English',
    isSupported: {
      pronunciation: true,
      translation: true,
      stt: true,
    },
  },
  fr: {
    code: 'fr',
    name: '法文',
    emoji: '🇫🇷',
    azureCode: 'fr-FR',
    ollamaLang: 'French',
    isSupported: {
      pronunciation: false,
      translation: true,
      stt: true,
    },
  },
}
/** 支持的語言列表 */
export const SUPPORTED_LANGUAGES: Language[] = Object.keys(LANGUAGE_CONFIG) as Language[]
