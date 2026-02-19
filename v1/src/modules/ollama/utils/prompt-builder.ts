/**
 * Prompt 構建器 - 創建結構化且安全的 prompt
 *
 * 使用清晰邊界原則：
 * - 系統指令與用戶輸入明確分離
 * - 使用 XML 標籤標記邊界
 * - 減少注入攻擊成功的可能性
 */
import { Logger } from '@nestjs/common'
import { PromptSanitizer } from './prompt-sanitizer'
export interface PromptBuildOptions {
  text: string
  sourceLanguage: string
  targetLanguage: string
  maxLength?: number
}
export class PromptBuilder {
  private readonly sanitizer: PromptSanitizer
  private readonly logger = new Logger(PromptBuilder.name)
  constructor() {
    this.sanitizer = new PromptSanitizer()
  }
  /**
   * 構建翻譯 Prompt (結構化格式)
   *
   * 設計原則：
   * 1. 清晰的系統邊界 (不會被用戶輸入破壞)
   * 2. XML 標籤作為邊界標記
   * 3. 明確區分指令和用戶內容
   */
  buildTranslationPrompt(options: PromptBuildOptions): string {
    const { text, sourceLanguage, targetLanguage } = options
    // 淨化用戶輸入
    const sanitizationResult = this.sanitizer.sanitize(text)
    // 如果檢測到風險，在 log 中記錄 (實際應用中可以拒絕)
    if (sanitizationResult.warnings.length > 0) {
      this.logger.warn(`Prompt sanitization warnings: ${sanitizationResult.warnings.join(', ')}`)
    }
    // 構建結構化 Prompt (使用清晰邊界)
    // 這種格式較難被注入破壞，因為：
    // - 系統指令與用戶內容分離
    // - 邊界標記明確
    // - 格式限制了攻擊空間
    const prompt = this.constructStructuredPrompt(sanitizationResult.sanitized, sourceLanguage, targetLanguage)
    return prompt
  }
  /**
   * 構建結構化 Prompt 模板
   */
  private constructStructuredPrompt(userText: string, sourceLanguage: string, targetLanguage: string): string {
    // 優化後的 Prompt 策略：
    // 1. 強調角色定位
    // 2. 使用 XML 標籤明確包裹輸入，防止 User Input 被當成指令執行
    // 3. 少樣本提示 (Few-shot)，強制引導輸出格式
    // 4. 極簡化輸出指令，避免小型模型混淆
    return `You are a high-precision translation engine.
Source: ${sourceLanguage}
Target: ${targetLanguage}
Rules:
- Output ONLY the translated text.
- Do NOT provide explanations, commentary, or labels.
- Do NOT repeat the input.
- Maintain the original tone and intent.
Examples:
Input: <text>你好，這是一支筆。</text>
Output: Bonjour, c'est un stylo.
Input: <text>我很喜歡漢堡。</text>
Output: J'aime beaucoup les hamburgers.
Input: <text>今天天氣如何？</text>
Output: Quel temps fait-il aujourd'hui ?
Current Task:
Input: <text>${userText}</text>
Output:`
  }
  /**
   * 構建簡化 Prompt (備選方案，風險稍高)
   * 適合環境受限的情況
   */
  buildSimpleTranslationPrompt(text: string, sourceLanguage: string, targetLanguage: string): string {
    const sanitizationResult = this.sanitizer.sanitize(text)
    if (sanitizationResult.warnings.length > 0) {
      this.logger.warn(`⚠️ Potential injection risk detected: ${sanitizationResult.warnings.join(', ')}`)
    }
    // 簡化格式，但仍有邊界保護
    return `Translate from ${sourceLanguage} to ${targetLanguage}. Correct grammar if needed.
TEXT TO TRANSLATE:
${sanitizationResult.sanitized}
TRANSLATION:`
  }
  /**
   * 檢查 Prompt 是否安全
   */
  isPromptSafe(text: string): { safe: boolean; risks: string[] } {
    const sanitizationResult = this.sanitizer.sanitize(text)
    const risks: string[] = []
    // 檢查是否超出長度
    if (sanitizationResult.lengthExceeded) {
      risks.push('Input exceeds maximum length')
    }
    // 檢查是否有警告
    if (sanitizationResult.warnings.length > 0) {
      risks.push(...sanitizationResult.warnings)
    }
    return {
      safe: risks.length === 0,
      risks,
    }
  }
}
