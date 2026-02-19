import type { Context } from 'grammy'
import { getBackToMainMenuButton } from '../../../shared/keyboards/menus.keyboard'
import type { TranslateResponse } from '../../../../ollama/types/ollama.types'
/**
 * 翻譯 - UI Presenter 層
 * 職責：所有 context.reply 邏輯，純 UI 呈現
 * 被調用方：TranslationProcessor
 */
export class TranslationPresenter {
  /**
   * 提示文字翻譯結果 - 拆成兩條消息
   */
  async replyTextTranslation(context: Context, originalText: string, result: TranslateResponse): Promise<void> {
    await this.replyTranslationResult(context, originalText, result)
  }
  /**
   * 提示語音翻譯結果 - 拆成兩條消息
   */
  async replyVoiceTranslation(context: Context, originalText: string, result: TranslateResponse): Promise<void> {
    await this.replyTranslationResult(context, originalText, result)
  }
  /**
   * 私有方法：顯示翻譯結果 - 拆成兩條消息
   * 回應1：原文
   * 回應2：翻譯結果
   * 每條都附帶返回主菜單按鈕
   */
  private async replyTranslationResult(
    context: Context,
    originalText: string,
    result: TranslateResponse
  ): Promise<void> {
    if (!result.success) {
      await context.reply(`❌ 翻譯失敗：${result.error}`, {
        reply_markup: getBackToMainMenuButton(),
      })
      return
    }
    // 回應1：原文
    await context.reply(originalText, {
      reply_markup: getBackToMainMenuButton(),
    })
    // 回應2：翻譯結果
    await context.reply(result.translatedText, {
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
   * 提示 STT 轉錄失敗
   */
  async replySTTError(context: Context, error: string): Promise<void> {
    await context.reply(`❌ ${error}`, {
      reply_markup: getBackToMainMenuButton(),
    })
  }
  /**
   * 提示無效輸入
   */
  async replyInvalidInput(context: Context): Promise<void> {
    await context.reply('⚠️ 翻譯模式接受語音或文字', {
      reply_markup: getBackToMainMenuButton(),
    })
  }
}
