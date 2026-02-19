import type { WhisperTranscribeResult } from '../../../../whisper/whisper.service'
import { WhisperService } from '../../../../whisper/whisper.service'
export interface TranscriptionResult {
  success: boolean
  text?: string
  duration?: number // 音頻時長（秒）
  error?: string
}
/**
 * 音頻轉錄器 - 共用邏輯層
 * 職責：純粹的語音轉文字轉錄
 * 設計原則：
 * - 無狀態，不涉及點數管理
 * - 只負責音頻 → 文字轉錄
 * - 點數邏輯交由調用方（Feature Processor）管理
 */
export class AudioTranscriber {
  constructor(private whisperService: WhisperService) {}
  /**
   * 轉錄語音
   * @param audioBuffer 音頻 Buffer
   * @param nativeLanguage 用戶母語代碼
   * @returns 轉錄結果 { success, text, duration, error }
   */
  async transcribe(audioBuffer: Buffer, nativeLanguage: string): Promise<TranscriptionResult> {
    try {
      const whisperResult: WhisperTranscribeResult = await this.whisperService.transcribe(nativeLanguage, audioBuffer)
      if (!whisperResult.success) {
        return {
          success: false,
          error: whisperResult.error || '轉錄失敗',
        }
      }
      return {
        success: true,
        text: whisperResult.text,
        duration: whisperResult.duration,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知錯誤'
      return {
        success: false,
        error: errorMessage,
      }
    }
  }
}
