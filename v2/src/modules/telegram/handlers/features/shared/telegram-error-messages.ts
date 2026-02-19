/**
 * 統一的 Telegram 錯誤訊息常數
 * 供 pronunciation、translation、stt 等多個 processor 使用
 * 確保使用者看到的錯誤訊息一致且清晰
 */
export const TELEGRAM_ERROR_MESSAGES = {
  // 通用錯誤
  EMPTY_INPUT: '⚠️ 輸入不能為空',
  INVALID_INPUT: '⚠️ 輸入無效',
  // 文字相關錯誤
  TEXT_TOO_LONG: (max: number, actual: number) => `❌ 文字超過限制。最多 ${max} 字，目前 ${actual} 字`,
  TEXT_TOO_SHORT: (min: number) => `⚠️ 文字至少需要 ${min} 字`,
  // 音頻相關錯誤
  AUDIO_DOWNLOAD_FAILED: '❌ 語音檔案下載失敗',
  AUDIO_VALIDATION_FAILED: (error: string) => `❌ 音頻驗證失敗：${error}`,
  AUDIO_TOO_SMALL: (min: number) => `❌ 音檔太小（最少 ${min}KB）`,
  AUDIO_TOO_LARGE: (max: number) => `❌ 音檔太大（最多 ${max}MB）`,
  AUDIO_DURATION_TOO_SHORT: (min: number) => `❌ 音頻太短（最少 ${min} 秒）`,
  AUDIO_DURATION_TOO_LONG: (max: number) => `❌ 音頻太長（最多 ${max} 秒）`,
  // 服務相關錯誤
  MISSING_REFERENCE_TEXT: '⚠️ 請先輸入要評估的文字',
  SERVICE_ERROR: (error: string) => `❌ 服務錯誤：${error}`,
  UNSUPPORTED_LANGUAGE: (supported: string[]) => `❌ 不支持的語言。支持的語言：${supported.join(', ')}`,
  // 格式相關錯誤
  CONTAINS_EMOJI: '❌ 文字不支持 Emoji',
  CONTAINS_HTML: '❌ 文字不支持 HTML 標籤',
} as const
