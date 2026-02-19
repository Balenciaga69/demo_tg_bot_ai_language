import type { UserState } from '../entities/user-state.type'
import type { Language } from '../../../shared/constants/language.constants'
/**
 * 用戶狀態預設值常數
 * 集中管理所有硬編碼的初始值，便於未來調整
 */
export const USER_STATE_DEFAULTS = {
  /** 母語預設值 */
  nativeLanguage: 'zh' as Language,
  /** 目標語言預設值 */
  targetLanguage: 'en' as Language,
  /** 初始積分 */
  points: 0,
  /** 初始啟用狀態 */
  isEnabled: false,
} as const
/**
 * 建立新用戶狀態物件
 * @param userId 用戶 ID
 * @returns 初始化的 UserState
 */
export function createDefaultUserState(userId: number): UserState {
  return {
    userId,
    nativeLanguage: USER_STATE_DEFAULTS.nativeLanguage,
    targetLanguage: USER_STATE_DEFAULTS.targetLanguage,
    points: USER_STATE_DEFAULTS.points,
    isEnabled: USER_STATE_DEFAULTS.isEnabled,
    processingStatus: 'idle',
    mode: 'idle',
  }
}
