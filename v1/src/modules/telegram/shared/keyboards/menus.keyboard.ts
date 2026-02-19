import { InlineKeyboard } from 'grammy'
import { CallbackQueryId } from '../constants/callback-query.constants'
// ============================================================================
// 🎨 Telegram 鍵盤/按鈕模板
// ============================================================================
/** 主菜單 - 首頁顯示的4個主要選項 */
export const MAIN_MENU_KEYBOARD = new InlineKeyboard()
  .text('🎛️ 模式選擇', CallbackQueryId.MAIN_MODE_SELECTION)
  .text('⚙️ 設定', CallbackQueryId.MAIN_SETTINGS)
  .row()
  .text('👤 我的狀態', CallbackQueryId.MAIN_USER_STATE)
  .text('📋 註冊', CallbackQueryId.MAIN_REGISTER)
/** 模式選擇菜單 - 進入模式選擇後的菜單 */
export const MODE_SELECTION_KEYBOARD = new InlineKeyboard()
  .text('📝 語音轉文字', CallbackQueryId.MAIN_SPEECH_TO_TEXT)
  .text('🌍 母語轉外語', CallbackQueryId.MAIN_TRANSLATE)
  .row()
  .text('🎤 發音評分', CallbackQueryId.MAIN_PRONUNCIATION)
  .text('🔊 文字轉語音', CallbackQueryId.MAIN_TTS)
  .row()
  .text('🟢 解除模式', CallbackQueryId.SWITCH_TO_IDLE)
  .row()
  .text('← 返回主菜單', CallbackQueryId.BACK_TO_MAIN)
/** 設定菜單 - 進入設定後的主菜單 */
export const SETTINGS_MENU_KEYBOARD = new InlineKeyboard()
  .text('🇨🇳 母語設定', CallbackQueryId.SETTINGS_NATIVE)
  .text('🗣️ 外語設定', CallbackQueryId.SETTINGS_TARGET)
  .row()
  .text('← 返回主菜單', CallbackQueryId.BACK_TO_MAIN)
/** 母語選擇菜單 - 選擇native language */
export const NATIVE_LANGUAGE_KEYBOARD = new InlineKeyboard()
  .text('中文', `${CallbackQueryId.SET_NATIVE_PREFIX}zh`)
  .text('英文', `${CallbackQueryId.SET_NATIVE_PREFIX}en`)
  .row()
  .text('法文', `${CallbackQueryId.SET_NATIVE_PREFIX}fr`)
  .row()
  .text('← 返回設定', CallbackQueryId.BACK_TO_SETTINGS)
/** 外語選擇菜單 - 選擇target language */
export const TARGET_LANGUAGE_KEYBOARD = new InlineKeyboard()
  .text('中文', `${CallbackQueryId.SET_TARGET_PREFIX}zh`)
  .text('英文', `${CallbackQueryId.SET_TARGET_PREFIX}en`)
  .row()
  .text('法文', `${CallbackQueryId.SET_TARGET_PREFIX}fr`)
  .row()
  .text('← 返回設定', CallbackQueryId.BACK_TO_SETTINGS)
// ============================================================================
// 🔘 單按鈕組件
// ============================================================================
/** 返回設定按鈕 */
export const getBackToSettingsButton = (): InlineKeyboard => {
  return new InlineKeyboard().text('← 返回設定', CallbackQueryId.BACK_TO_SETTINGS)
}
/** 返回主菜單按鈕 */
export const getBackToMainMenuButton = (): InlineKeyboard => {
  return new InlineKeyboard().text('← 返回主菜單', CallbackQueryId.BACK_TO_MAIN)
}
