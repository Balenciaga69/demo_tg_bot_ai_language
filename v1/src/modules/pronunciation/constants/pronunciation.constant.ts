/**
 * 發音評估相關常數
 */
export const PRONUNCIATION_LIMITS = {
  // 文字限制
  REFERENCE_TEXT_MIN_LENGTH: 1,
  REFERENCE_TEXT_MAX_LENGTH: 500,
  // 音頻限制（秒）
  AUDIO_MAX_DURATION: 55,
  AUDIO_MIN_DURATION: 0.5,
  // 檔案大小限制（位元組）
  AUDIO_MIN_FILE_SIZE: 1024, // 1KB
  AUDIO_MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
}
/**
 * 發音評估支持的語言
 */
export const PRONUNCIATION_LANGUAGES = {
  DEFAULT: 'zh-TW' as const,
  SUPPORTED: ['zh-TW', 'en-US', 'fr-FR'] as const,
} as const
export type SupportedLanguage = (typeof PRONUNCIATION_LANGUAGES.SUPPORTED)[number]
