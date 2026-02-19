import type { Context } from 'grammy'
import type { SpeechToTextProcessorFeature } from '../speech-to-text/speech-to-text.processor'
import type { TranslationProcessor } from '../translation/translation.processor'
import type { PronunciationProcessor } from '../pronunciation/pronunciation.processor'
import type { TTSProcessor } from '../text-to-speech/tts.processor'
import type { IModeHandler } from './mode-handler.interface'
/**
 * 特性模式路由器
 * 職責：根據用戶 mode 路由到對應的 feature processor
 * 設計：使用 Map-based 路由，易於擴展
 */
export class FeatureModeRouter {
  private modeHandlers: Map<string, IModeHandler>
  constructor(
    speechToTextProcessor: SpeechToTextProcessorFeature,
    translationProcessor: TranslationProcessor,
    pronunciationProcessor: PronunciationProcessor,
    ttsProcessor: TTSProcessor
  ) {
    // 初始化 mode 處理器映射表
    this.modeHandlers = new Map<string, IModeHandler>([
      ['stt', speechToTextProcessor],
      ['translate', translationProcessor],
      ['pronunciation', pronunciationProcessor],
      ['tts', ttsProcessor],
    ])
  }
  /**
   * 根據用戶 mode 路由到對應的處理邏輯
   * @param context Bot context
   * @param userMode 用戶當前模式
   * @param userId 用戶 ID
   */
  async route(context: Context, userMode: string, userId: number): Promise<void> {
    const handler = this.modeHandlers.get(userMode)
    if (!handler) {
      // idle 模式或未知模式，不處理
      return
    }
    await handler.process(context, userId)
  }
}
