import type { Context } from 'grammy'
/**
 * 添加消息反應 Helper
 * 用於在處理消息時異步添加表情反應（不阻塞業務邏輯）
 * @param context Grammy context
 */
export async function addMessageReaction(context: Context): Promise<void> {
  try {
    if (context.msgId && context.chat?.id) {
      // 使用豎起大拇指表情表示正在處理
      await context.api.setMessageReaction(context.chat.id, context.msgId, [{ type: 'emoji', emoji: '👍' }])
    }
  } catch {
    // 靜默忽略反應失敗，不影響業務流程
  }
}
