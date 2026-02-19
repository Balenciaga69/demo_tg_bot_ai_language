import type { Language } from '../../../../shared/constants/language.constants'
import { LANGUAGE_CONFIG } from '../../../../shared/constants/language.constants'
/**
 * 語言設定相關常數
 */
type LanguageTypes = 'native' | 'target'
interface LanguageTypeConfig {
  emoji: string
  label: string
  label_en: string
}
const LANGUAGE_TYPE_CONFIG: Record<LanguageTypes, LanguageTypeConfig> = {
  native: {
    emoji: '🇨🇳',
    label: '母語',
    label_en: 'native',
  },
  target: {
    emoji: '🗣️',
    label: '外語',
    label_en: 'target',
  },
}
export const LANGUAGE_SETTING_MESSAGES = {
  // 選擇母語/外語提示
  SELECT_NATIVE: '🇨🇳 選擇你的母語:',
  SELECT_TARGET: '🗣️ 選擇你的外語:',
  SETTINGS_MENU: '⚙️ 設定菜單:',
  // 成功設定確認
  SET_SUCCESS: (languageType: LanguageTypes, langName: string): string => {
    const config = LANGUAGE_TYPE_CONFIG[languageType]
    return `${config.emoji} ${config.label}已設定為: ${langName}\n\n← 返回設定菜單`
  },
  // Toast 提示
  TOAST_SET_SUCCESS: (langName: string): string => `已設定為: ${langName}`,
  TOAST_ERROR: '⚠️ 設定失敗，請重試',
}
/**
 * 獲取語言類型的配置
 */
export function getLanguageTypeConfig(languageType: LanguageTypes): LanguageTypeConfig {
  return LANGUAGE_TYPE_CONFIG[languageType]
}
/**
 * 根據語言列表生成回調 pattern
 * 用於匹配 set_native_zh、set_target_en 等
 */
export function generateLanguageCallbackPattern(languageType: LanguageTypes): RegExp {
  const languages = Object.keys(LANGUAGE_CONFIG).join('|')
  return new RegExp(`^set_${languageType}_(${languages})$`)
}
/**
 * 從回調字符串提取語言碼
 * 例：set_native_zh → zh
 */
export function extractLanguageFromCallback(callbackData: string): Language | undefined {
  const match = /^set_(?:native|target)_(.+)$/.exec(callbackData)
  if (!match) return undefined
  const languageCode = match[1] as Language
  return LANGUAGE_CONFIG[languageCode] ? languageCode : undefined
}
