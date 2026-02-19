/**
 * Redis Key 命名策略工具
 * 集中管理所有 key 的構建邏輯，便於維護和修改
 * 遵循命名約定: namespace:domain:identifier
 */
export const RedisKeys = {
  // =============== UserState ===============
  /**
   * 用戶狀態存儲 key
   * @param userId 用戶 ID
   * @returns key: user:state:{userId}
   */
  userState: (userId: number): string => `user:state:${userId}`,
  // =============== RegistrationRequest ===============
  /**
   * 單個註冊申請存儲 key
   * @param id 申請 ID
   * @returns key: registration:request:{id}
   */
  registrationRequest: (id: string): string => `registration:request:${id}`,
  /**
   * 待審核申請集合 key
   * 使用 Set 存儲，支持 O(1) 檢查狀態
   * @returns key: registration:requests:pending
   */
  registrationRequestsPending: (): string => 'registration:requests:pending',
  /**
   * 已處理申請集合 key
   * 使用 Set 存儲，涵蓋 approved 和 rejected
   * @returns key: registration:requests:processed
   */
  registrationRequestsProcessed: (): string => 'registration:requests:processed',
  /**
   * 用戶申請索引 key
   * 快速查詢某用戶是否有申請，及最新申請 ID
   * @param userId 用戶 ID
   * @returns key: registration:request:user:{userId}
   */
  registrationRequestUser: (userId: number): string => `registration:request:user:${userId}`,
  // =============== PronunciationAssessment ===============
  /**
   * 發音評估內容暫存 key
   * 用於存儲用戶在發音評估模式中輸入的要評估文字
   * @param userId 用戶 ID
   * @returns key: pronunciation:assessment:content:{userId}
   */
  pronunciationAssessmentContent: (userId: number): string => `pronunciation:assessment:content:${userId}`,
  // =============== UsageLog ===============
  /**
   * 用戶使用紀錄列表 key (Sorted Set by timestamp)
   * 存儲用戶的所有使用記錄，按時間排序
   * @param userId 用戶 ID
   * @returns key: user:usage-log:{userId}
   */
  usageLogList: (userId: number): string => `user:usage-log:${userId}`,
  /**
   * 單日使用統計 key (Hash: 功能 -> 使用次數)
   * @param userId 用戶 ID
   * @param date 日期 (YYYY-MM-DD)
   * @returns key: user:usage-stat:daily:{userId}:{date}
   */
  usageStatDaily: (userId: number, date: string): string => `user:usage-stat:daily:${userId}:${date}`,
} as const
