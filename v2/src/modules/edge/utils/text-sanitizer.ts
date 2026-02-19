/**
 * 文字清理工具
 * 用於處理和驗證要合成的文字
 */
/**
 * 清理文字以便 TTS 使用
 * - 移除特殊字元
 * - 移除多餘空白
 * - 限制文字長度
 */
export class TextSanitizer {
  /** 最大文本長度 */
  private static readonly MAX_TEXT_LENGTH = 5000
  /**
   * 清理文字
   */
  static sanitize(text: string): string {
    if (!text) {
      return ''
    }
    return text
      .trim() // 移除前後空白
      .replaceAll(/\s+/g, ' ') // 合併多個空白為單一空白
      .slice(0, Math.max(0, this.MAX_TEXT_LENGTH)) // 限制長度
  }
  /**
   * 驗證文字
   * @returns 如果有效返回 true，並返回錯誤信息（如有）
   */
  static validate(text: string): {
    isValid: boolean
    error?: string
  } {
    if (!text || text.trim().length === 0) {
      return {
        isValid: false,
        error: 'Text cannot be empty',
      }
    }
    if (text.length > this.MAX_TEXT_LENGTH) {
      return {
        isValid: false,
        error: `Text exceeds maximum length of ${this.MAX_TEXT_LENGTH} characters`,
      }
    }
    return {
      isValid: true,
    }
  }
}
