import { CallbackQueryContext } from 'grammy'
import type { BotContext } from '../../shared/types/bot.types'
import type { IUserStateStore } from '../../../user/stores/user-state/user-state.store'
// ============================================================================
// ✅ 驗證器中間件
// ============================================================================
/**
 * 檢查用戶是否已有轉錄在處理中
 * 用於：防止用戶同時發起多個 Whisper 請求
 * @returns true 代表未在處理中（可以繼續），false 代表已在處理中（阻擋）
 */
export async function verifyProcessing(
  context: CallbackQueryContext<BotContext>,
  userStateStore: IUserStateStore
): Promise<boolean> {
  const userId = context.from?.id
  if (!userId) return false
  const userState = await userStateStore.getOrCreate(userId)
  if (userState.processingStatus === 'processing') {
    await context.answerCallbackQuery({
      text: '⏳ 已有請求在排隊中，請稍候...',
      show_alert: true,
    })
    return false
  }
  return true
}
