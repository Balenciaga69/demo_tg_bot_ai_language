import type { Context } from 'grammy'
import { InputFile } from 'grammy'
import { getBackToMainMenuButton } from '../../../shared/keyboards/menus.keyboard'
import { AssessmentFormatter } from '../shared/formatters'
import type { AssessmentJobResult } from '../../../../../modules/pronunciation'
import type { TTSSynthesizeResult } from '../../../../../modules/edge'
/**
 * 發音評估 - UI Presenter 層
 * 職責：所有 context.reply 邏輯，純 UI 呈現
 * 被調用方：PronunciationProcessor
 */
export class PronunciationPresenter {
  /**
   * 提示已保存評估內容
   */
  async replySaveContent(context: Context, text: string): Promise<void> {
    await context.reply(`✅ 已保存要評估的內容：\n\n"${text}"\n\n現在請發送語音進行評估`, {
      reply_markup: getBackToMainMenuButton(),
    })
  }
  /**
   * 提示缺少要評估的文字
   */
  async replyMissingContent(context: Context): Promise<void> {
    await context.reply('⚠️ 請先輸入要評估的文字', {
      reply_markup: getBackToMainMenuButton(),
    })
  }
  /**
   * 提示下載失敗
   */
  async replyDownloadFailed(context: Context): Promise<void> {
    await context.reply('❌ 語音檔案下載失敗', {
      reply_markup: getBackToMainMenuButton(),
    })
  }
  /**
   * 提示評估結果
   */
  async replyEvaluationResult(context: Context, result: AssessmentJobResult): Promise<void> {
    if (!result.result) {
      await context.reply('❌ 評估失敗，請重試', {
        reply_markup: getBackToMainMenuButton(),
      })
      return
    }
    const assessmentData = result.result
    const message = AssessmentFormatter.formatEvaluationMessage(assessmentData)
    await context.reply(message, {
      reply_markup: getBackToMainMenuButton(),
      parse_mode: 'Markdown',
    })
  }
  /**
   * 回傳評估結果附帶發音示範語音
   */
  async replyEvaluationResultWithVoice(
    context: Context,
    result: AssessmentJobResult,
    ttsResult: TTSSynthesizeResult
  ): Promise<void> {
    if (!result.result) {
      await context.reply('❌ 評估失敗，請重試', {
        reply_markup: getBackToMainMenuButton(),
      })
      return
    }
    // 發送評分結果文字
    const assessmentData = result.result
    const message = AssessmentFormatter.formatEvaluationMessage(assessmentData)
    await context.reply(message, {
      reply_markup: getBackToMainMenuButton(),
      parse_mode: 'Markdown',
    })
    // 發送標準發音示範語音檔案
    try {
      const voiceFile = new InputFile(ttsResult.buffer, 'pronunciation-reference.mp3')
      await context.replyWithVoice(voiceFile, {
        caption: '🔊 標準發音示範',
      })
    } catch (error) {
      // 如果語音發送失敗，只記錄，不影響評估結果
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.warn(`[TTS] 語音發送失敗: ${errorMessage}`)
    }
  }
  /**
   * 提示無效輸入
   */
  async replyInvalidInput(context: Context): Promise<void> {
    await context.reply('⚠️ 評估模式先輸入文字，再發送語音', {
      reply_markup: getBackToMainMenuButton(),
    })
  }
}
