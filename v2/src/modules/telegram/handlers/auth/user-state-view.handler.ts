import { CallbackQueryContext } from 'grammy'
import type { IUserStateStore } from '../../../user/stores/user-state/user-state.store'
import { LANGUAGE_CONFIG } from '../../../../shared/constants/language.constants'
import { CallbackQueryId } from '../../shared/constants/callback-query.constants'
import type { BotContext, MyBot } from '../../shared/types/bot.types'
import { getBackToMainMenuButton } from '../../shared/keyboards/menus.keyboard'
import { verifyEnabledUser } from '../middleware/auth.middleware'
export const registerUserStateViewHandler = (bot: MyBot, userStateStore: IUserStateStore): void => {
  bot.callbackQuery(CallbackQueryId.MAIN_USER_STATE, async (context: CallbackQueryContext<BotContext>) => {
    const result = await verifyEnabledUser(context, userStateStore)
    if (!result) return
    const { userState } = result
    // 狀態指示符
    const statusIndicator = userState.processingStatus === 'processing' ? '⏳' : '✅'
    const enabledStatus = userState.isEnabled ? '🟢 已啟用' : '🔴 未啟用'
    await context.editMessageText(
      `👤 我的狀態\n\n` +
        `━━━━━━━━━━━━━━━\n` +
        `🆔 用戶 ID: ${userState.userId}\n\n` +
        `🇨🇳 母語: ${LANGUAGE_CONFIG[userState.nativeLanguage].name}\n` +
        `🗣️ 目標語言: ${LANGUAGE_CONFIG[userState.targetLanguage].name}\n\n` +
        `💰 剩餘點數: ${userState.points}\n` +
        `${statusIndicator} 處理狀態: ${userState.processingStatus === 'processing' ? '處理中...' : '閒置'}\n` +
        `${enabledStatus}\n` +
        `━━━━━━━━━━━━━━━`,
      { reply_markup: getBackToMainMenuButton() }
    )
  })
}
