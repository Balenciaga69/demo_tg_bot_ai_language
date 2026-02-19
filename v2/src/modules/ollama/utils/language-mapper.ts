import { LANGUAGE_CONFIG, Language } from '../../../shared/constants/language.constants'
/**
 * 將項目語言映射為提示詞中的完整語言名稱
 * 確保 LLM 對語言有精確理解
 */
export function mapLanguageToPromptName(language: Language): string {
  return LANGUAGE_CONFIG[language].ollamaLang
}
/**
 * 取得 Azure Speech SDK 支持的語言碼
 * @example getAzureLanguageCode('zh') -> 'zh-TW'
 */
export function getAzureLanguageCode(language: Language): string {
  return LANGUAGE_CONFIG[language].azureCode
}
/**
 * 檢查特定語言是否支持某項功能
 * @param language 語言代碼
 * @param feature 功能：'pronunciation' | 'translation' | 'stt'
 */
export function isLanguageSupportedFor(language: Language, feature: 'pronunciation' | 'translation' | 'stt'): boolean {
  return LANGUAGE_CONFIG[language].isSupported[feature]
}
