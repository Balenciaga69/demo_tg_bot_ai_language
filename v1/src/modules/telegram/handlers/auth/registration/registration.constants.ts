/**
 * 註冊流程相關常數
 */
export const REGISTRATION_MESSAGES = {
  // 狀態檢查相關訊息
  ALREADY_APPROVED: '✅ 你已被核准，無需再申請',
  ALREADY_REJECTED: '❌ 你已被拒絕申請，無法再次申請',
  PENDING_OVERRIDE: '📋 你有待處理的申請，新申請將覆蓋舊申請。\n\n請輸入新的申請描述（限制 100 字以內）：',
  // 初始提示
  INITIAL_PROMPT: '📋 請輸入你的申請描述（限制 100 字以內）：',
  // 驗證相關訊息
  INVALID_LENGTH: '⚠️ 申請描述必須在 1-100 字之間，請重新輸入。輸入 /menu 返回主菜單',
  // 成功提交訊息
  SUBMIT_SUCCESS: (description: string): string =>
    `✅ 申請已提交！\n\n` + `描述: ${description}\n\n` + `我們會盡快審核，請稍候。\n\n` + `輸入 /menu 返回主菜單`,
}
export const REGISTRATION_CONFIG = {
  DESCRIPTION_MIN_LENGTH: 1,
  DESCRIPTION_MAX_LENGTH: 100,
}
