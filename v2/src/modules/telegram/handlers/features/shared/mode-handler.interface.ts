import type { Context } from 'grammy'
/**
 * Feature Mode 處理器介面
 * 所有 mode handler 應實現此介面
 *
 * @interface IModeHandler
 * @method process - 根據用戶當前模式，處理不同的輸入類型
 */
export interface IModeHandler {
  /**
   * 處理模式輸入
   * @param context Bot context
   * @param userId 用戶 ID
   */
  process(context: Context, userId: number): Promise<void>
}
