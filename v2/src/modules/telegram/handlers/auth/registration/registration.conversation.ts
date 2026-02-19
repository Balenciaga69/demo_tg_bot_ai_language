import { getBackToMainMenuButton } from 'src/modules/telegram/shared/keyboards'
import { BotConversation, ConversationContext } from 'src/modules/telegram/shared/types'
import { IRegistrationRequestStore } from 'src/modules/user/stores'
import { REGISTRATION_MESSAGES } from './registration.constants'
import { RegistrationService } from './registration.service'
/**
 * 註冊對話流程
 *
 * 流程：
 * 1. 檢查現存申請狀態（已核准/已拒絕/待處理/無申請）
 * 2. 顯示相應提示並等待用戶輸入描述
 * 3. 驗證輸入長度
 * 4. 建立或更新申請
 * 5. 顯示確認訊息
 */
export async function registrationConversation(
  conversation: BotConversation,
  context: ConversationContext,
  registrationRequestStore: IRegistrationRequestStore
): Promise<void> {
  const userId = context.from?.id
  if (!userId) return
  const service = new RegistrationService(registrationRequestStore)
  // --- Phase 1: 檢查現存申請 ---
  const existingRequest = await conversation.external(() => service.getExistingRequest(userId))
  const approvalStatus = service.getApprovalStatus(existingRequest)
  // --- Phase 2: 顯示初始提示 ---
  const initialMessage = getInitialMessage(approvalStatus)
  if (!initialMessage) {
    // 已核准或已拒絕，無法進行申請
    const replyMessage =
      approvalStatus === 'approved' ? REGISTRATION_MESSAGES.ALREADY_APPROVED : REGISTRATION_MESSAGES.ALREADY_REJECTED
    await context.reply(replyMessage, { reply_markup: getBackToMainMenuButton() })
    return
  }
  await context.reply(initialMessage)
  // --- Phase 3: 等待用戶輸入 ---
  const { message } = await conversation.waitFor('message:text')
  const description = message.text.trim()
  // --- Phase 4: 驗證描述 ---
  const validation = service.validateDescription(description)
  if (!validation.isValid) {
    await context.reply(REGISTRATION_MESSAGES.INVALID_LENGTH, { reply_markup: getBackToMainMenuButton() })
    return
  }
  // --- Phase 5: 建立或更新申請 ---
  await conversation.external(() => service.upsertRequest(userId, description, existingRequest))
  // --- Phase 6: 成功提示 ---
  await context.reply(REGISTRATION_MESSAGES.SUBMIT_SUCCESS(description), { reply_markup: getBackToMainMenuButton() })
}
/**
 * 根據現存申請狀態決定初始提示訊息
 * @returns 提示訊息 或 undefined（若用戶無法進行申請）
 */
function getInitialMessage(approvalStatus: 'approved' | 'rejected' | 'pending' | undefined): string | undefined {
  if (approvalStatus === 'pending') {
    return REGISTRATION_MESSAGES.PENDING_OVERRIDE
  }
  if (!approvalStatus) {
    return REGISTRATION_MESSAGES.INITIAL_PROMPT
  }
  // approved 或 rejected → 無法進行
  return undefined
}
