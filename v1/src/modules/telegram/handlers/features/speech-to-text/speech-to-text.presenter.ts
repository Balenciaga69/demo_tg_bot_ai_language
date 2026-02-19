import type { Context } from 'grammy'
import { getBackToMainMenuButton } from '../../../shared/keyboards/menus.keyboard'
import type { TranscriptionResult } from '../shared/audio-transcriber'
import { STT_MESSAGES } from './speech-to-text.constants'
/**
 * 語音轉文字（STT）- UI Presenter 層
 * 職責：所有 context.reply 邏輯，純 UI 呈現
 * 被調用方：SpeechToTextProcessorFeature
 */
export class SpeechToTextPresenter {
  /**
   * 提示無效輸入
   */
  async replyInvalidInput(context: Context): Promise<void> {
    await context.reply(STT_MESSAGES.ERROR_INVALID_INPUT, {
      reply_markup: getBackToMainMenuButton(),
    })
  }
  /**
   * 提示下載失敗
   */
  async replyDownloadFailed(context: Context): Promise<void> {
    await context.reply(STT_MESSAGES.ERROR_DOWNLOAD_FAILED, {
      reply_markup: getBackToMainMenuButton(),
    })
  }
  /**
   * 呈現轉錄結果
   */
  async replyResult(context: Context, result: TranscriptionResult): Promise<void> {
    await context.reply(
      result.success ? STT_MESSAGES.SUCCESS(result.text!) : STT_MESSAGES.ERROR_STT_FAILED(result.error!),
      {
        reply_markup: getBackToMainMenuButton(),
      }
    )
  }
}
