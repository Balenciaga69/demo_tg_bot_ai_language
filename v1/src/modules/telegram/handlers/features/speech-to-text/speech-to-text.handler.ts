import { CallbackQueryContext } from 'grammy'
import type { IUserStateStore } from '../../../../user/stores/user-state/user-state.store'
import { CallbackQueryId } from '../../../shared/constants/callback-query.constants'
import type { MyBot, BotContext } from '../../../shared/types/bot.types'
import { getBackToMainMenuButton } from '../../../shared/keyboards/menus.keyboard'
import { verifyEnabledUser } from '../../middleware/auth.middleware'
import { MODE_CONFIG } from '../../../shared/constants/mode.constants'
/**
 * 註冊語音轉文字模式 Handler
 *
 * 職責：
 * 1. 監聽模式選擇按鈕
 * 2. 驗證用戶
 * 3. 切換到 STT 模式
 */
export const registerSpeechToTextHandler = (bot: MyBot, userStateStore: IUserStateStore): void => {
  // 模式選擇「語音轉文字」按鈕 - 進入 STT 模式
  bot.callbackQuery(CallbackQueryId.MAIN_SPEECH_TO_TEXT, async (context: CallbackQueryContext<BotContext>) => {
    const result = await verifyEnabledUser(context, userStateStore)
    if (!result) return
    const { userId } = result
    const modeConfig = MODE_CONFIG.stt
    // 切換模式
    await userStateStore.updateMode(userId, 'stt')
    // 顯示模式提示
    const message = `${modeConfig.emoji} ${modeConfig.name}\n\n${modeConfig.description}`
    try {
      await context.editMessageText(message, {
        reply_markup: getBackToMainMenuButton(),
      })
    } catch {
      // 如果編輯失敗（例如訊息中沒有文本），則發送新訊息
      await context.reply(message, {
        reply_markup: getBackToMainMenuButton(),
      })
    }
  })
}
