/** STT 服務消息模式 */
export const STT_SERVICE_TOKEN = 'STT_SERVICE'

export const STT_PATTERNS = {
  TRANSCRIBE: { cmd: 'stt.transcribe' },
} as const

/** 轉錄請求 (Buffer 透過 base64 字串跨網路傳送) */
export interface TranscribeRequest {
  language: string
  audioBase64: string
}

/** 轉錄響應 */
export interface TranscribeResponse {
  success: boolean
  text?: string
  error?: string
  duration?: number
}
