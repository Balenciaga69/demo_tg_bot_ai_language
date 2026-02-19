import { Injectable, Logger } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { firstValueFrom } from 'rxjs'
import { EnvironmentKey } from 'src/shared/environment-key'
import type { TranslateRequest, TranslateResponse, OllamaApiResponse } from './types/ollama.types'
import { mapLanguageToPromptName } from './utils/language-mapper'
import { cleanOllamaResponse } from './utils/response-parser'
import { PromptBuilder } from './utils/prompt-builder'
@Injectable()
export class OllamaService {
  private readonly logger = new Logger(OllamaService.name)
  private readonly ollamaApiUrl: string
  private readonly ollamaModel: string
  private readonly promptBuilder: PromptBuilder
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {
    this.ollamaApiUrl = this.configService.getOrThrow<string>(EnvironmentKey.OLLAMA_API_URL)
    this.ollamaModel = this.configService.getOrThrow<string>(EnvironmentKey.OLLAMA_MODEL)
    this.promptBuilder = new PromptBuilder()
  }
  /**
   * 翻譯文本 (含 Prompt Injection 防護)
   */
  async translate(request: TranslateRequest): Promise<TranslateResponse> {
    try {
      const { originalText, targetLanguage, sourceLanguage } = request
      // 1️⃣ 檢查 Prompt 安全性
      const safetyCheck = this.promptBuilder.isPromptSafe(originalText)
      if (!safetyCheck.safe) {
        this.logger.warn(`Prompt safety check failed: ${safetyCheck.risks.join('; ')}`)
        // 根據政策決定是否拒絕或只是警告
        // 這裡我們選擇只警告，讓翻譯繼續進行（可改為拒絕）
      }
      // 2️⃣ 構造提示詞 (使用淨化和結構化方案)
      const targetLanguageName = mapLanguageToPromptName(targetLanguage)
      const sourceLanguageName = sourceLanguage === undefined ? '自動檢測' : mapLanguageToPromptName(sourceLanguage)
      const prompt = this.promptBuilder.buildTranslationPrompt({
        text: originalText,
        sourceLanguage: sourceLanguageName,
        targetLanguage: targetLanguageName,
      })
      this.logger.debug(`Translating text from ${sourceLanguageName} to ${targetLanguageName}`)
      // 3️⃣ 調用 Ollama API
      const response = await this.callOllamaApi(prompt)
      // 4️⃣ 清理回應
      const translatedText = cleanOllamaResponse(response.response)
      return {
        translatedText,
        success: true,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知錯誤'
      this.logger.error(`Translation failed: ${errorMessage}`, error)
      return {
        translatedText: '',
        success: false,
        error: errorMessage,
      }
    }
  }
  /**
   * 調用 Ollama API
   */
  private async callOllamaApi(prompt: string): Promise<OllamaApiResponse> {
    const payload = {
      model: this.ollamaModel,
      prompt,
      stream: false,
    }
    const result = await firstValueFrom(
      this.httpService.post<OllamaApiResponse>(this.ollamaApiUrl, payload, {
        timeout: 300_000,
      })
    )
    return result.data
  }
}
