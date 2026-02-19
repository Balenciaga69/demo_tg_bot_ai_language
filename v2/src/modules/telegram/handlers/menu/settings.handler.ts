import { CallbackQueryContext } from 'grammy'
import type { IUserStateStore } from '../../../user/stores/user-state/user-state.store'
import { CallbackQueryId } from '../../shared/constants/callback-query.constants'
import type { BotContext, MyBot } from '../../shared/types/bot.types'
import {
  NATIVE_LANGUAGE_KEYBOARD,
  SETTINGS_MENU_KEYBOARD,
  TARGET_LANGUAGE_KEYBOARD,
} from '../../shared/keyboards/menus.keyboard'
import { verifyEnabledUser } from '../middleware/auth.middleware'
import { LanguageSettingService } from './language-setting.service'
import { LANGUAGE_SETTING_MESSAGES, generateLanguageCallbackPattern } from './language-setting.constants'
/**
 * 設定 Handler
 *
 * 職責：
 * 1. 監聽回調
 * 2. 展示菜單和選項
 * 3. 委託 service 處理實際的設定邏輯
 */
export const registerSettingsHandler = (bot: MyBot, userStateStore: IUserStateStore): void => {
  // 主設定菜單
  bot.callbackQuery(CallbackQueryId.MAIN_SETTINGS, async (context: CallbackQueryContext<BotContext>) => {
    const result = await verifyEnabledUser(context, userStateStore)
    if (!result) return
    await context.editMessageText(LANGUAGE_SETTING_MESSAGES.SETTINGS_MENU, {
      reply_markup: SETTINGS_MENU_KEYBOARD,
    })
  })
  // 母語選擇菜單
  bot.callbackQuery(CallbackQueryId.SETTINGS_NATIVE, async (context: CallbackQueryContext<BotContext>) => {
    await context.editMessageText(LANGUAGE_SETTING_MESSAGES.SELECT_NATIVE, {
      reply_markup: NATIVE_LANGUAGE_KEYBOARD,
    })
  })
  // 外語選擇菜單
  bot.callbackQuery(CallbackQueryId.SETTINGS_TARGET, async (context: CallbackQueryContext<BotContext>) => {
    await context.editMessageText(LANGUAGE_SETTING_MESSAGES.SELECT_TARGET, {
      reply_markup: TARGET_LANGUAGE_KEYBOARD,
    })
  })
  // 返回設定菜單
  bot.callbackQuery(CallbackQueryId.BACK_TO_SETTINGS, async (context: CallbackQueryContext<BotContext>) => {
    await context.editMessageText(LANGUAGE_SETTING_MESSAGES.SETTINGS_MENU, {
      reply_markup: SETTINGS_MENU_KEYBOARD,
    })
  })
  // 母語設定
  bot.callbackQuery(generateLanguageCallbackPattern('native'), async (context: CallbackQueryContext<BotContext>) => {
    const service = new LanguageSettingService(context, userStateStore)
    await service.setSetting('native')
  })
  // 外語設定
  bot.callbackQuery(generateLanguageCallbackPattern('target'), async (context: CallbackQueryContext<BotContext>) => {
    const service = new LanguageSettingService(context, userStateStore)
    await service.setSetting('target')
  })
}
