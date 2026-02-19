/**
 * Prompt 淨化器 - 防止 Prompt Injection 攻擊
 *
 * 策略：
 * 1. 限制輸入長度
 * 2. 移除危險字符和指令模式
 * 3. 使用清晰邊界分離用戶輸入
 */
export interface SanitizationResult {
  sanitized: string
  warnings: string[]
  lengthExceeded: boolean
}
export class PromptSanitizer {
  private readonly MAX_INPUT_LENGTH = 500 // 最多 500 字
  private readonly DANGEROUS_PATTERNS = [
    /ignore\s+previous\s+instructions?/gi, // Ignore previous instructions
    /forget\s+\S+\s+instructions?/gi, // Forget instructions (fixed: no superlinear backtracking)
    /system\s+prompt/gi, // System prompt
    /new\s+instructions?:/gi, // New instructions
    /override\s+the\s+above/gi, // Override
    /disregard\s+the\s+above/gi, // Disregard
    /pretend\s+you\s+are/gi, // Role play
    /act\s+as/gi, // Act as
    /you\s+are\s+now/gi, // You are now
    /beginning\s+of\s+conversation/gi, // Start of conversation
    /end\s+of\s+conversation/gi, // End of conversation
  ]
  /**
   * 淨化用戶輸入文本
   */
  sanitize(userInput: string): SanitizationResult {
    const warnings: string[] = []
    let text = userInput.trim()
    // 1️⃣ 長度檢查
    const lengthExceeded = text.length > this.MAX_INPUT_LENGTH
    if (lengthExceeded) {
      warnings.push(`輸入超過 ${this.MAX_INPUT_LENGTH} 字元 (實際: ${text.length})`)
      text = text.slice(0, Math.max(0, this.MAX_INPUT_LENGTH))
    }
    // 2️⃣ 檢測危險模式
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(text)) {
        warnings.push(`檢測到潛在注入模式: ${pattern.source}`)
        // 不移除，只記錄警告，讓系統決定是否拒絕
      }
    }
    // 3️⃣ 基本淨化 (保持內容不變，只做最小化處理)
    // - 移除多余空白
    text = text.replaceAll(/\s+/g, ' ')
    return {
      sanitized: text,
      warnings,
      lengthExceeded,
    }
  }
  /**
   * 檢查是否包含注入風險
   */
  hasInjectionRisk(userInput: string): boolean {
    return this.DANGEROUS_PATTERNS.some((pattern) => pattern.test(userInput))
  }
}
