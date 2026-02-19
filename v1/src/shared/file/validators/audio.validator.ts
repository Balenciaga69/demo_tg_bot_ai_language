import { Logger } from '@nestjs/common'
import * as mm from 'music-metadata'
import { fileTypeFromBuffer } from 'file-type'
/**
 * 音頻驗證結果
 */
export interface AudioValidationResult {
  isValid: boolean
  duration?: number // 秒數
  mimeType?: string
  fileSize?: number
  errors: string[]
}
/**
 * 音頻驗證器 - 獨立職責
 * 驗證：MIME type、檔案大小、時長
 */
export class AudioValidator {
  private readonly logger = new Logger(AudioValidator.name)
  private readonly MAX_AUDIO_DURATION = 55 // 秒
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
  private readonly ALLOWED_MIME_TYPES = [
    'audio/mpeg', // MP3
    'audio/mp3',
    'audio/ogg', // OGG/Opus
    'audio/opus',
    'audio/wav',
    'audio/x-m4a', // M4A (AAC)
    'audio/mp4', // m4a/mp4 (file-type returns audio/mp4)
  ]
  /**
   * 驗證音頻檔案
   * @param audioBuffer 音頻 Buffer
   * @returns 驗證結果
   */
  async validate(audioBuffer: Buffer): Promise<AudioValidationResult> {
    const errors: string[] = []
    // 1️⃣ 基本檢查
    const basicCheckResult = this.performBasicCheck(audioBuffer)
    if (basicCheckResult) return basicCheckResult
    // 2️⃣ 檔案大小檢查
    this.checkFileSize(audioBuffer, errors)
    // 3️⃣ MIME Type 檢查
    const mimeType = await this.detectMimeType(audioBuffer)
    const mimeCheckResult = this.checkMimeType(mimeType, audioBuffer, errors)
    if (mimeCheckResult) return mimeCheckResult
    // 4️⃣ 時長檢查
    const duration = await this.checkDuration(audioBuffer, errors)
    return {
      isValid: errors.length === 0,
      duration,
      mimeType,
      fileSize: audioBuffer.length,
      errors,
    }
  }
  /**
   * 基本檢查：音頻是否為空
   */
  private performBasicCheck(audioBuffer: Buffer): AudioValidationResult | undefined {
    if (!audioBuffer || audioBuffer.length === 0) {
      return {
        isValid: false,
        errors: ['音頻檔案為空'],
      }
    }
    return undefined
  }
  /**
   * 檢查檔案大小
   */
  private checkFileSize(audioBuffer: Buffer, errors: string[]): void {
    if (audioBuffer.length > this.MAX_FILE_SIZE) {
      errors.push(`檔案大小超過限制 (${this.formatBytes(this.MAX_FILE_SIZE)})`)
    }
  }
  /**
   * 檢查 MIME Type
   */
  private checkMimeType(
    mimeType: string | undefined,
    audioBuffer: Buffer,
    errors: string[]
  ): AudioValidationResult | undefined {
    if (!mimeType) {
      errors.push('無法識別音頻格式 (不是有效的音頻檔案)')
      return {
        isValid: false,
        fileSize: audioBuffer.length,
        errors,
      }
    }
    if (!this.ALLOWED_MIME_TYPES.includes(mimeType)) {
      errors.push(`不支援的音頻格式: ${mimeType}`)
    }
    return undefined
  }
  /**
   * 檢查音頻時長
   */
  private async checkDuration(audioBuffer: Buffer, errors: string[]): Promise<number | undefined> {
    let duration: number | undefined
    try {
      const metadata = await mm.parseBuffer(
        audioBuffer,
        { mimeType: await this.detectMimeType(audioBuffer), size: audioBuffer.length },
        { duration: true } // 強制計算完整時長
      )
      duration = metadata.format.duration
      if (!duration) {
        errors.push('無法解析音頻時長')
      } else if (duration > this.MAX_AUDIO_DURATION) {
        errors.push(`音頻超過 ${this.MAX_AUDIO_DURATION} 秒 (實際: ${duration.toFixed(2)}s)`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知錯誤'
      this.logger.warn(`無法完全解析音頻元資料: ${errorMessage}`)
    }
    return duration
  }
  /**
   * 使用 `file-type` 檢測 MIME Type（取代手寫 magic-bytes）
   */
  private async detectMimeType(buffer: Buffer): Promise<string | undefined> {
    if (buffer.length < 4) return undefined
    try {
      const ft = await fileTypeFromBuffer(buffer)
      return ft?.mime
    } catch (error) {
      this.logger.warn(`file-type 無法偵測 mime: ${error instanceof Error ? error.message : String(error)}`)
      return undefined
    }
  }
  // magic-bytes helpers removed — detection delegated to `file-type`
  /**
   * 格式化位元組
   */
  private formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const dm = Math.max(decimals, 0)
    const sizes = ['Bytes', 'KB', 'MB']
    const sizeIndex = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, sizeIndex)).toFixed(dm)) + ' ' + sizes[sizeIndex]
  }
}
