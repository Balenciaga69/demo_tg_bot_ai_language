import { CommandContext } from 'grammy'
import type { IUserStateStore } from '../../../user/stores/user-state/user-state.store'
import { CallbackQueryId } from '../../shared/constants/callback-query.constants'
import type { MyBot, BotContext } from '../../shared/types/bot.types'
import { MAIN_MENU_KEYBOARD, MODE_SELECTION_KEYBOARD } from '../../shared/keyboards/menus.keyboard'
import { verifyUserId } from '../middleware/auth.middleware'
export const registerMainMenuHandler = (bot: MyBot, userStateStore: IUserStateStore): void => {
  bot.command('start', async (context: CommandContext<BotContext>) => {
    const userId = verifyUserId(context)
    if (!userId) return
    await userStateStore.getOrCreate(userId)
    await context.reply('👋 歡迎！選擇你要執行的操作:', {
      reply_markup: MAIN_MENU_KEYBOARD,
    })
  })
  bot.command('menu', async (context: CommandContext<BotContext>) => {
    const userId = verifyUserId(context)
    if (!userId) return
    await userStateStore.getOrCreate(userId)
    await context.reply('🎯 主菜單:', {
      reply_markup: MAIN_MENU_KEYBOARD,
    })
  })
  bot.callbackQuery(CallbackQueryId.BACK_TO_MAIN, async (context) => {
    const userId = verifyUserId(context)
    if (!userId) return
    try {
      await context.editMessageText('👋 主菜單:', {
        reply_markup: MAIN_MENU_KEYBOARD,
      })
    } catch {
      // 如果編輯失敗（例如訊息中沒有文本），則發送新訊息
      await context.reply('👋 主菜單:', {
        reply_markup: MAIN_MENU_KEYBOARD,
      })
    }
  })
  bot.callbackQuery(CallbackQueryId.MAIN_MODE_SELECTION, async (context) => {
    const userId = verifyUserId(context)
    if (!userId) return
    try {
      await context.editMessageText('🎛️ 模式選擇:', {
        reply_markup: MODE_SELECTION_KEYBOARD,
      })
    } catch {
      // 如果編輯失敗（例如訊息中沒有文本），則發送新訊息
      await context.reply('🎛️ 模式選擇:', {
        reply_markup: MODE_SELECTION_KEYBOARD,
      })
    }
  })
}
