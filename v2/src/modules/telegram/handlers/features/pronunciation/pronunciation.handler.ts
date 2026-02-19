import { CallbackQueryContext } from 'grammy'
import type { IUserStateStore } from '../../../../user/stores/user-state/user-state.store'
import { CallbackQueryId } from '../../../shared/constants/callback-query.constants'
import type { MyBot, BotContext } from '../../../shared/types/bot.types'
import { getBackToMainMenuButton } from '../../../shared/keyboards/menus.keyboard'
import { verifyEnabledUser } from '../../middleware/auth.middleware'
import { MODE_CONFIG } from '../../../shared/constants/mode.constants'
import { PronunciationAssessmentStore } from '../../../../pronunciation'
/**
 * 註冊發音評估模式 Handler
 *
 * 職責：
 * 1. 監聽模式選擇按鈕
 * 2. 驗證用戶
 * 3. 清空評估內容並切換到評估模式
 */
export const registerPronunciationHandler = (
  bot: MyBot,
  userStateStore: IUserStateStore,
  pronunciationAssessmentStore: PronunciationAssessmentStore
): void => {
  // 模式選擇「發音評估」按鈕 - 進入評估模式
  bot.callbackQuery(CallbackQueryId.MAIN_PRONUNCIATION, async (context: CallbackQueryContext<BotContext>) => {
    const result = await verifyEnabledUser(context, userStateStore)
    if (!result) return
    const { userId } = result
    const modeConfig = MODE_CONFIG.pronunciation
    // 清空之前的評估內容
    await pronunciationAssessmentStore.clearContent(userId)
    // 切換模式
    await userStateStore.updateMode(userId, 'pronunciation')
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
