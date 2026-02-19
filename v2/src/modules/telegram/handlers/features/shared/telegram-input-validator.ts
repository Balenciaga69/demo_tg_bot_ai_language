import { PRONUNCIATION_LIMITS } from '../../../../../modules/pronunciation/constants/pronunciation.constant'
/**
 * 統一的 Telegram 輸入驗證工具
 * 供 pronunciation、translation、stt 等多個 processor 使用
 * 確保驗證邏輯的一致性和可維護性
 */
export const TelegramInputValidator = {
  /**
   * 驗證文字輸入
   * 檢查：空白、長度、字符集
   * @param text 輸入文字
   * @param limits 自訂限制（可選）
   */
  validateText(
    text: string,
    limits?: { min?: number; max?: number }
  ): {
    isValid: boolean
    error?: string
  } {
    const trimmed = text.trim()
    // 檢查空白
    if (!trimmed) {
      return { isValid: false, error: '輸入不能為空' }
    }
    // 檢查長度
    const minLength = limits?.min ?? PRONUNCIATION_LIMITS.REFERENCE_TEXT_MIN_LENGTH
    const maxLength = limits?.max ?? PRONUNCIATION_LIMITS.REFERENCE_TEXT_MAX_LENGTH
    if (trimmed.length < minLength) {
      return {
        isValid: false,
        error: `至少需要 ${minLength} 個字`,
      }
    }
    if (trimmed.length > maxLength) {
      return {
        isValid: false,
        error: `超過 ${maxLength} 字限制（目前 ${trimmed.length} 字）`,
      }
    }
    return { isValid: true }
  },
  /**
   * 驗證音頻 Buffer
   * 檢查：存在、文件大小
   * @param buffer 音頻 Buffer
   * @param limits 自訂限制（可選）
   */
  validateAudio(
    buffer: Buffer | undefined,
    limits?: { min?: number; max?: number }
  ): {
    isValid: boolean
    error?: string
  } {
    if (!buffer) {
      return { isValid: false, error: '無法取得音頻' }
    }
    const minSize = limits?.min ?? PRONUNCIATION_LIMITS.AUDIO_MIN_FILE_SIZE
    const maxSize = limits?.max ?? PRONUNCIATION_LIMITS.AUDIO_MAX_FILE_SIZE
    if (buffer.length < minSize) {
      return {
        isValid: false,
        error: `音檔太小（最少 ${(minSize / 1024).toFixed(1)}KB）`,
      }
    }
    if (buffer.length > maxSize) {
      return {
        isValid: false,
        error: `音檔太大（最多 ${(maxSize / (1024 * 1024)).toFixed(1)}MB）`,
      }
    }
    return { isValid: true }
  },
}
