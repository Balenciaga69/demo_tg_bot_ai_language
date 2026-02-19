/**
 * Edge 模組類型定義
 */
/**
 * TTS (文字轉語音) 請求
 */
export interface TTSRequest {
  /** 要合成的文字 */
  text: string
  /** 聲音角色 (例: en-US-AriaNeural) */
  voice: string
}
/**
 * TTS 合成結果
 */
export interface TTSSynthesizeResult {
  /** 生成的音訊檔案路徑 */
  filePath: string
  /** 音訊資料 Buffer */
  buffer: Buffer
  /** 檔案大小（位元組） */
  fileSize: number
}
/**
 * Edge TTS 引擎設定
 */
export interface EdgeTTSConfig {
  /** 輸出目錄 */
  outputDir: string
  /** 逾時時間（毫秒） */
  timeoutMs: number
  /** 臨時檔案保留時間（毫秒） */
  tempFileRetentionMs?: number
}
