import type { Context } from 'grammy'
import { getBackToMainMenuButton } from '../../../shared/keyboards/menus.keyboard'
import type { InputFile } from 'grammy'
/**
 * TTS - UI Presenter 層
 * 職責：所有 context.reply 邏輯，純 UI 呈現
 * 被調用方：TTSProcessor
 */
export class TTSPresenter {
  /**
   * 回覆 TTS 成功結果
   */
  async replyTTSSuccess(
    context: Context,
    audioFile: InputFile,
    originalText: string,
    targetLanguage: string
  ): Promise<void> {
    await context.replyWithAudio(audioFile, {
      caption: `🔊 已合成語音\n📝 文字：${originalText}\n🌍 語言：${targetLanguage}`,
      reply_markup: getBackToMainMenuButton(),
    })
  }
  /**
   * 回覆 TTS 失敗
   */
  async replyTTSFailed(context: Context, errorMessage: string): Promise<void> {
    await context.reply(`❌ TTS 合成失敗：${errorMessage}`, {
      reply_markup: getBackToMainMenuButton(),
    })
  }
  /**
   * 提示無效輸入（只接受文字）
   */
  async replyInvalidInput(context: Context): Promise<void> {
    await context.reply('⚠️ TTS 模式只接受文字消息', {
      reply_markup: getBackToMainMenuButton(),
    })
  }
  /**
   * 提示文字長度超過限制
   */
  async replyTextTooLong(context: Context, current: number, max: number): Promise<void> {
    await context.reply(`⚠️ 文字過長：目前 ${current} 字，限制 ${max} 字`, {
      reply_markup: getBackToMainMenuButton(),
    })
  }
  /**
   * 提示文字為空
   */
  async replyTextEmpty(context: Context): Promise<void> {
    await context.reply('⚠️ 文字不能為空', {
      reply_markup: getBackToMainMenuButton(),
    })
  }
}
