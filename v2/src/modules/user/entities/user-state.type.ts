import type { Language } from '../../../shared/constants/language.constants'
/** 功能模式顛刨 */
export type FeatureMode = 'idle' | 'stt' | 'translate' | 'pronunciation' | 'tts'
/** 用戶架樓 */
export interface UserState {
  userId: number
  nativeLanguage: Language
  targetLanguage: Language
  isEnabled: boolean
  points: number
  processingStatus: 'idle' | 'processing'
  mode: FeatureMode
}
