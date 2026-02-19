import type { IUserStateStore } from '../../../user/stores/user-state/user-state.store'
import { LANGUAGE_CONFIG } from '../../../../shared/constants/language.constants'
import type { CallbackQueryContext } from 'grammy'
import type { BotContext } from '../../shared/types/bot.types'
import { verifyEnabledUser } from '../middleware/auth.middleware'
import { LANGUAGE_SETTING_MESSAGES, extractLanguageFromCallback } from './language-setting.constants'
import { getBackToSettingsButton } from '../../shared/keyboards/menus.keyboard'
type LanguageTypes = 'native' | 'target'
/**
 * 語言設定服務
 * 職責：驗證、設定、狀態管理
 */
export class LanguageSettingService {
  constructor(
    private context: CallbackQueryContext<BotContext>,
    private userStateStore: IUserStateStore
  ) {}
  /**
   * 執行語言設定流程
   * @returns 是否成功
   */
  async setSetting(languageType: LanguageTypes): Promise<boolean> {
    try {
      // 驗證用戶和權限
      const result = await verifyEnabledUser(this.context, this.userStateStore)
      if (!result) return false
      const { userId, userState } = result
      // 提取語言碼
      const language = extractLanguageFromCallback(this.context.match?.[0] ?? '')
      if (!language) {
        await this.context.answerCallbackQuery({
          text: LANGUAGE_SETTING_MESSAGES.TOAST_ERROR,
        })
        return false
      }
      const langName = LANGUAGE_CONFIG[language].name
      // 設定語言
      if (languageType === 'native') {
        userState.nativeLanguage = language
      } else {
        userState.targetLanguage = language
      }
      // 儲存
      await this.userStateStore.setById(userId, userState)
      // 提示 Toast
      await this.context.answerCallbackQuery({
        text: LANGUAGE_SETTING_MESSAGES.TOAST_SET_SUCCESS(langName),
      })
      // 更新訊息
      await this.context.editMessageText(LANGUAGE_SETTING_MESSAGES.SET_SUCCESS(languageType, langName), {
        reply_markup: getBackToSettingsButton(),
      })
      return true
    } catch {
      await this.context.answerCallbackQuery({
        text: LANGUAGE_SETTING_MESSAGES.TOAST_ERROR,
      })
      return false
    }
  }
}
