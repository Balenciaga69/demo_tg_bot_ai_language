/**
 * 聲音驗證工具
 * 驗證聲音角色是否被支援
 */
import { SUPPORTED_VOICES } from '../constants/edge.constant'
/**
 * 聲音驗證器
 */
export const VoiceValidator = {
  /**
   * 驗證聲音是否被支援
   */
  isSupported(voice: string): boolean {
    return Object.values(SUPPORTED_VOICES).includes(voice as (typeof SUPPORTED_VOICES)[keyof typeof SUPPORTED_VOICES])
  },
  /**
   * 取得預設聲音（英文美國）
   */
  getDefaultVoice(): string {
    return SUPPORTED_VOICES.EN_IN_PRABHAT
  },
  /**
   * 根據語言代碼取得預設聲音
   */
  getVoiceByLanguage(languageCode: string): string {
    // 簡化邏輯，可根據需要擴展
    if (languageCode.startsWith('zh-TW')) {
      return SUPPORTED_VOICES.ZH_CN_YUNXI
    }
    if (languageCode.startsWith('zh-CN')) {
      return SUPPORTED_VOICES.ZH_CN_YUNXI
    }
    if (languageCode.startsWith('en-GB')) {
      return SUPPORTED_VOICES.EN_GB_LIBBY
    }
    if (languageCode.startsWith('fr-FR')) {
      return SUPPORTED_VOICES.FR_FR_DENISE
    }
    return VoiceValidator.getDefaultVoice()
  },
}
