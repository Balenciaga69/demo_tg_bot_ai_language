import { CallbackQueryContext, CommandContext } from 'grammy'
import type { BotContext } from '../../shared/types/bot.types'
import type { IUserStateStore } from '../../../user/stores/user-state/user-state.store'
import type { UserState } from '../../../user/entities/user-state.type'
// ============================================================================
// 🔐 Context 驗證中間件
// ============================================================================
/**
 * 基礎驗證：確認用戶ID存在
 * 用於：菜單、設定、註冊等基本功能
 * @returns userId 或 undefined
 */
export function verifyUserId(
  context: CallbackQueryContext<BotContext> | CommandContext<BotContext>
): number | undefined {
  const userId = context.from?.id
  return userId
}
/**
 * 進階驗證：確認用戶是已認證會員且已啟用（含點數檢查）
 * 用於：需消耗 GPU/Token 或點數的功能（翻譯、語音轉文字、發音評分）
 * 若驗證失敗會自動透過 callback 回覆使用者提示，返回 undefined 代表驗證失敗
 * @returns { userId, userState } 或 undefined
 */
export async function verifyEnabledUser(
  context: CallbackQueryContext<BotContext>,
  userStateStore: IUserStateStore
): Promise<{ userId: number; userState: UserState } | undefined> {
  const userId = context.from?.id
  if (!userId) return undefined
  const userState = await userStateStore.getOrCreate(userId)
  // 未啟用已認證會員功能
  if (!userState.isEnabled) {
    await context.answerCallbackQuery({
      text: '⚠️ 需啟用已認證會員功能才能使用此功能哦！',
      show_alert: true,
    })
    return undefined
  }
  // 點數不足阻擋（0 或負數視為沒有點數）
  if ((userState.points ?? 0) <= 0) {
    await context.answerCallbackQuery({
      text: '⚠️ 目前你已花光點數, 請補充點數才能使用此功能哦！',
      show_alert: true,
    })
    return undefined
  }
  return { userId, userState }
}
/**
 * 基礎驗證：確認用戶存在並獲取其狀態
 * 用於：不需驗證溢價、但需要用戶狀態的功能（設定、查看狀態）
 * @returns { userId, userState } 或 undefined
 */
export async function verifyTGUser(
  context: CallbackQueryContext<BotContext>,
  userStateStore: IUserStateStore
): Promise<{ userId: number; userState: UserState } | undefined> {
  const userId = context.from?.id
  if (!userId) return undefined
  const userState = await userStateStore.getOrCreate(userId)
  return { userId, userState }
}
