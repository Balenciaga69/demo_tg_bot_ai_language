/**
 * 語音轉文字相關常數
 */
export const STT_POINT_COST = 1
export const STT_MESSAGES = {
  // 初始提示
  INITIAL_PROMPT: '🎤 請發送語音訊息...',
  // 取消操作
  CANCEL: '✓ 已取消',
  // 處理中
  PROCESSING: '⏳ 處理中...',
  // 成功
  SUCCESS: (result: string): string => `${result}`,
  // 錯誤相關
  ERROR_DOWNLOAD_FAILED: '❌ 語音檔案下載失敗',
  ERROR_STT_FAILED: (error: string): string => `❌ ${error}`,
  ERROR_INVALID_INPUT: '⚠️ 請發送語音訊息',
}
