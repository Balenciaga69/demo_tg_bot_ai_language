/**
 * Edge 模組常數定義
 */
/**
 * TTS 相關常數
 */
export const TTS_CONSTANTS = {
  /** 持久化輸出目錄（供下載/串流） */
  DEFAULT_OUTPUT_DIR: './public/tts',
  /** 預設逾時時間 (毫秒) */
  DEFAULT_TIMEOUT_MS: 60_000,
  /** 檔案快取時間 (毫秒) */
  FILE_CACHE_TTL_MS: 7 * 24 * 60 * 60 * 1000, // 7 天
} as const
/**
 * 支援的聲音列表（Edge TTS 支援的聲音）
 * 可根據需要擴展
 */
export const SUPPORTED_VOICES = {
  // 英文 - 美國
  EN_US_ARIA: 'en-US-AriaNeural',
  EN_US_GUY: 'en-US-GuyNeural',
  EN_US_JENNY: 'en-US-JennyNeural',
  // 英文 - 印度
  EN_IN_PRABHAT: 'en-IN-PrabhatNeural',
  // 英文 - 英國
  EN_GB_LIBBY: 'en-GB-LibbyNeural',
  EN_GB_RYAN: 'en-GB-RyanNeural',
  // 繁體中文
  ZH_TW_HSIAO_CHEN: 'zh-TW-HsiaoChenNeural',
  ZH_TW_HSIAO_YU: 'zh-TW-HsiaoYuNeural',
  // 簡體中文
  ZH_CN_XIAOXIAO: 'zh-CN-XiaoxiaoNeural',
  ZH_CN_YUNXI: 'zh-CN-YunxiNeural',
  // 法文 - 法國
  FR_FR_DENISE: 'fr-FR-DeniseNeural',
} as const
/**
 * 聲音語言對應
 */
export const VOICE_LANGUAGE_MAP: Record<string, string> = {
  [SUPPORTED_VOICES.EN_IN_PRABHAT]: 'en-IN',
  [SUPPORTED_VOICES.EN_US_ARIA]: 'en-US',
  [SUPPORTED_VOICES.EN_US_GUY]: 'en-US',
  [SUPPORTED_VOICES.EN_US_JENNY]: 'en-US',
  [SUPPORTED_VOICES.EN_GB_LIBBY]: 'en-GB',
  [SUPPORTED_VOICES.EN_GB_RYAN]: 'en-GB',
  [SUPPORTED_VOICES.ZH_TW_HSIAO_CHEN]: 'zh-TW',
  [SUPPORTED_VOICES.ZH_TW_HSIAO_YU]: 'zh-TW',
  [SUPPORTED_VOICES.ZH_CN_XIAOXIAO]: 'zh-CN',
  [SUPPORTED_VOICES.ZH_CN_YUNXI]: 'zh-CN',
  [SUPPORTED_VOICES.FR_FR_DENISE]: 'fr-FR',
} as const
