/**
 * 用戶使用紀錄存儲 interface 和實現
 * 記錄：userId, pointsDeducted, timestamp, status, parameters
 */
/**
 * 單筆使用紀錄
 */
export interface UserUsageLog {
  /** 使用紀錄 ID */
  id: string
  /** 用戶 ID */
  userId: number
  /** 扣除的點數 */
  pointsDeducted: number
  /** 發生時間 (Unix timestamp ms) */
  timestamp: number
  /** 操作狀態 */
  status: 'success' | 'failed'
  /** 使用的參數（文字內容，如轉錄結果或參考文字） */
  parameters: string
  /** 功能類型 */
  feature: 'transcription' | 'pronunciation' | 'translation' | 'tts'
}
export const I_USAGE_LOG_STORE = 'I_USAGE_LOG_STORE'
/**
 * 使用紀錄存儲 interface
 */
export interface IUsageLogStore {
  /**
   * 記錄一筆使用紀錄
   * @param log 使用紀錄
   */
  record(log: Omit<UserUsageLog, 'id'>): Promise<void>
  /**
   * 獲取用戶的使用歷史
   * @param userId 用戶 ID
   * @param limit 返回數量限制 (默認 100)
   * @returns 使用記錄列表 (按時間倒序)
   */
  getHistory(userId: number, limit?: number): Promise<UserUsageLog[]>
  /**
   * 獲取用戶某日統計
   * @param userId 用戶 ID
   * @param date 日期 (YYYY-MM-DD)
   * @returns 該日統計數據
   */
  getDailyStats(userId: number, date: string): Promise<Record<string, number>>
  /**
   * 清除過期的使用記錄 (>90天)
   */
  cleanup(): Promise<void>
}
