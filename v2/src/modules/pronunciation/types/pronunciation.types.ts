/**
 * 發音評估相關類型定義
 */
/**
 * 發音評估請求
 */
export interface AssessmentJobRequest {
  /** 用戶 ID */
  userId: number
  /** 參考文字（用戶輸入的要評估的內容） */
  referenceText: string
  /** 語音檔案 Buffer */
  audioBuffer: Buffer
  /** 評估語言（可選，默認為 zh-TW） */
  language?: string
}
/**
 * 發音評估單字結果
 */
export interface PronunciationWord {
  /** 單字 */
  word: string
  /** 準確度分數 (0-100) */
  accuracyScore: number
  /** 錯誤類型 */
  errorType: 'None' | 'Omission' | 'Insertion'
}
/**
 * 發音評估整體結果（核心數據）
 */
export interface AssessmentResult {
  /** 語音識別狀態 */
  recognitionStatus: 'Success' | 'Failed'
  /** Whisper 識別的文字（可能有脫字、多字、錯字） */
  recognizedText: string
  /** 準確度分數 (0-100) */
  accuracyScore: number
  /** 流暢度分數 (0-100) */
  fluencyScore: number
  /** 完整度分數 (0-100) */
  completenessScore: number
  /** 發音分數 (0-100) */
  pronScore: number
  /** 韻律分數 (0-100) */
  prosodyScore: number
  /** 錯誤單字數量 */
  errorCount: number
  /** 逐字評估結果 */
  words: PronunciationWord[]
}
/**
 * 發音評估 Job 結果（返回給前端的格式）
 * 參考 React 前端的 PronunciationStatusResponse
 */
export interface AssessmentJobResult {
  /** Job ID */
  jobId: string
  /** 狀態：completed（Mock 總是完成） */
  status: 'completed' | 'processing' | 'failed'
  /** 進度 (0-100) */
  progress: number
  /** 評估結果（當 status='completed' 時存在） */
  result?: AssessmentResult
  /** 錯誤訊息（當 status='failed' 時存在） */
  error?: string
}
/**
 * TTS 合成請求（預留給後續實現）
 */
export interface TtsSynthesizeRequest {
  text: string
  language?: string
  voice?: string
}
/**
 * TTS 合成結果（預留給後續實現）
 */
export interface TtsSynthesizeResult {
  jobId: string
  status: 'completed' | 'processing' | 'failed'
  progress: number
  result?: {
    fileUrl: string
  }
  error?: string
}
