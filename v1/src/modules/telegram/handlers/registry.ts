import { CallbackQueryContext } from 'grammy'
import type { IRegistrationRequestStore } from '../../user/stores/registration/registration.store'
import type { IUserStateStore } from '../../user/stores/user-state/user-state.store'
import { WhisperService } from '../../whisper/whisper.service'
import { OllamaService } from '../../ollama/ollama.service'
import { CallbackQueryId } from '../shared/constants/callback-query.constants'
import { MODE_MESSAGES } from '../shared/constants/mode.constants'
import { getBackToMainMenuButton } from '../shared/keyboards/menus.keyboard'
import type { BotContext, MyBot } from '../shared/types/bot.types'
import { PronunciationAssessmentStore } from '../../pronunciation'
import * as AuthHandlers from './auth'
import * as FeatureHandlers from './features'
import * as MenuHandlers from './menu'
/**
 * 統一的 Handler 註冊函數
 * 集中管理所有 Telegram Bot 的指令和回調處理器
 * @param bot Bot 實例
 * @param userStateStore 用戶狀態儲存
 * @param registrationRequestStore 註冊申請儲存
 * @param whisperService Whisper 服務
 * @param ollamaService Ollama 服務
 * @param pronunciationAssessmentStore 發音評估存儲
 */
export function registerAllHandlers(
  bot: MyBot,
  userStateStore: IUserStateStore,
  registrationRequestStore: IRegistrationRequestStore,
  whisperService: WhisperService,
  ollamaService: OllamaService,
  pronunciationAssessmentStore: PronunciationAssessmentStore
): void {
  // 註冊菜單相關 handlers
  MenuHandlers.registerMainMenuHandler(bot, userStateStore)
  MenuHandlers.registerSettingsHandler(bot, userStateStore)
  // 註冊功能性 handlers
  FeatureHandlers.registerSpeechToTextHandler(bot, userStateStore)
  FeatureHandlers.registerTranslationHandler(bot, userStateStore)
  FeatureHandlers.registerPronunciationHandler(bot, userStateStore, pronunciationAssessmentStore)
  FeatureHandlers.registerTTSHandler(bot, userStateStore)
  // 註冊認證相關 handlers
  AuthHandlers.registerUserStateViewHandler(bot, userStateStore)
  AuthHandlers.registerRegisterHandler(bot, userStateStore, registrationRequestStore)
  // 註冊 Idle 模式回調
  bot.callbackQuery(CallbackQueryId.SWITCH_TO_IDLE, async (context: CallbackQueryContext<BotContext>) => {
    const userId = context.from?.id
    if (!userId) return
    const userState = await userStateStore.getById(userId)
    if (!userState) return
    // 若已在 idle 模式
    if (userState.mode === 'idle') {
      await context.answerCallbackQuery({
        text: MODE_MESSAGES.ALREADY_IN_MODE('空閒模式'),
      })
      return
    }
    // 清空評估內容（如果之前在評估模式）
    if (userState.mode === 'pronunciation') {
      await pronunciationAssessmentStore.clearContent(userId)
    }
    // 切換回 idle 模式
    await userStateStore.updateMode(userId, 'idle')
    try {
      await context.editMessageText(MODE_MESSAGES.IDLE_MODE_PROMPT, {
        reply_markup: getBackToMainMenuButton(),
      })
    } catch {
      // 如果編輯失敗（例如訊息中沒有文本），則發送新訊息
      await context.reply(MODE_MESSAGES.IDLE_MODE_PROMPT, {
        reply_markup: getBackToMainMenuButton(),
      })
    }
  })
}
