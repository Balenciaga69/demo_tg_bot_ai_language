/**
 * Edge TTS 服務
 * 提供文字轉語音的高層 API
 *
 * 職責：
 * - 驗證輸入（文字、聲音）
 * - 呼叫 TTS 引擎進行合成
 * - 管理合成結果和持久化儲存
 * - 協調資源清理
 */
import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import type { ITTSEngine } from '../engines/tts.engine'
import type { TTSSynthesizeResult } from '../types/edge.types'
import { TextSanitizer } from '../utils/text-sanitizer'
import { VoiceValidator } from '../utils/voice-validator'
/**
 * Edge TTS 服務實現
 */
@Injectable()
export class EdgeTTSService {
  private readonly logger = new Logger(EdgeTTSService.name)
  constructor(private readonly ttsEngine: ITTSEngine) {}
  /**
   * 合成文字為語音
   * 流程：驗證 → 合成 → 返回
   *
   * @param text 要合成的文字
   * @param voice 聲音角色
   * @returns 合成結果（含 buffer 可供下載）
   */
  async synthesize(text: string, voice?: string): Promise<TTSSynthesizeResult> {
    // 清理和驗證輸入
    const sanitizedText = TextSanitizer.sanitize(text)
    const validation = TextSanitizer.validate(sanitizedText)
    if (!validation.isValid) {
      throw new BadRequestException(validation.error)
    }
    // 驗證或設定聲音
    const selectedVoice = voice || VoiceValidator.getDefaultVoice()
    if (!VoiceValidator.isSupported(selectedVoice)) {
      this.logger.warn(`Unsupported voice: ${selectedVoice}, using default`)
    }
    // 合成語音
    this.logger.log(`[TTS] 開始合成: textLength=${sanitizedText.length}, voice=${selectedVoice}`)
    const result = await this.ttsEngine.synthesize({
      text: sanitizedText,
      voice: selectedVoice,
    })
    this.logger.log(`[TTS] 合成完成: size=${result.fileSize} bytes`)
    return result
  }
  /**
   * 根據語言代碼合成語音
   * 會自動選擇適配的聲音
   */
  async synthesizeWithLanguage(text: string, languageCode: string): Promise<TTSSynthesizeResult> {
    const voice = VoiceValidator.getVoiceByLanguage(languageCode)
    return this.synthesize(text, voice)
  }
}
