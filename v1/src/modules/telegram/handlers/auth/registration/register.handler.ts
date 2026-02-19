import { createConversation } from '@grammyjs/conversations'
import type { IUserStateStore } from '../../../../user/stores/user-state/user-state.store'
import type { IRegistrationRequestStore } from '../../../../user/stores/registration/registration.store'
import { CallbackQueryId } from '../../../shared/constants/callback-query.constants'
import type { MyBot, BotConversation, ConversationContext } from '../../../shared/types/bot.types'
import { verifyUserId } from '../../middleware/auth.middleware'
import { registrationConversation } from './registration.conversation'
/**
 * 註冊 Handler
 *
 * 職責：
 * 1. 註冊 conversation
 * 2. 監聽 callback query
 * 3. 驗證用戶
 * 4. 進入 conversation
 */
export const registerRegisterHandler = (
  bot: MyBot,
  userStateStore: IUserStateStore,
  registrationRequestStore: IRegistrationRequestStore
): void => {
  // 註冊對話
  bot.use(
    createConversation(
      (conversation: BotConversation, context: ConversationContext) =>
        registrationConversation(conversation, context, registrationRequestStore),
      'registration'
    )
  )
  // 主菜單「註冊」按鈕
  bot.callbackQuery(CallbackQueryId.MAIN_REGISTER, async (context) => {
    const userId = verifyUserId(context)
    if (!userId) return
    await context.editMessageText('📋 進入註冊流程...')
    await context.conversation.enter('registration')
  })
}
