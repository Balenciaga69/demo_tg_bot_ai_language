import { Injectable } from '@nestjs/common'
/**
 * 音訊驗證結果 (回傳給調用方)
 */
export interface AudioValidationResult {
  isValid: boolean
  errors: string[]
  duration?: number // seconds
  mimeType?: string
  fileSize?: number
}
export const AudioValidationConstants = {
  MAX_AUDIO_DURATION: 55,
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  ALLOWED_MIME_TYPES: ['audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/opus', 'audio/wav', 'audio/x-m4a', 'audio/mp4'],
}
@Injectable()
export class AudioValidationService {
  /**
   * 驗證音訊 Buffer
   */
  async validate(audioBuffer: Buffer): Promise<AudioValidationResult> {
    const fileSize = audioBuffer?.length ?? 0
    // 1️⃣ 基本檢查
    if (!audioBuffer || audioBuffer.length === 0) {
      return { isValid: false, errors: ['音頻檔案為空'], duration: undefined, mimeType: undefined, fileSize }
    }
    // 2️⃣ 檔案大小檢查
    const fileSizeErrors = this.getFileSizeErrors(audioBuffer.length)
    if (fileSizeErrors.length > 0) {
      return { isValid: false, errors: fileSizeErrors, duration: undefined, mimeType: undefined, fileSize }
    }
    // 3️⃣ MIME Type 檢查
    const mimeType = await this.detectMimeType(audioBuffer)
    const mimeTypeErrors = this.getMimeTypeErrors(mimeType)
    if (mimeTypeErrors.length > 0) {
      return { isValid: false, errors: mimeTypeErrors, duration: undefined, mimeType, fileSize }
    }
    // 4️⃣ 時長檢查
    const duration = await this.checkDuration(audioBuffer, mimeType)
    const durationErrors = this.getDurationErrors(duration)
    return { isValid: durationErrors.length === 0, errors: durationErrors, duration, mimeType, fileSize }
  }
  private getFileSizeErrors(fileSize: number): string[] {
    const errors: string[] = []
    if (fileSize > AudioValidationConstants.MAX_FILE_SIZE) {
      errors.push(`檔案大小超過限制 (${this.formatBytes(AudioValidationConstants.MAX_FILE_SIZE)})`)
    }
    return errors
  }
  private getMimeTypeErrors(mimeType: string | undefined): string[] {
    const errors: string[] = []
    this.checkMimeType(mimeType, errors)
    return errors
  }
  private getDurationErrors(duration: number | undefined): string[] {
    const errors: string[] = []
    if (!duration) {
      errors.push('無法解析音頻時長')
    } else if (duration > AudioValidationConstants.MAX_AUDIO_DURATION) {
      errors.push(`音頻超過 ${AudioValidationConstants.MAX_AUDIO_DURATION} 秒 (實際: ${duration.toFixed(2)}s)`)
    }
    return errors
  }
  private formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const dm = Math.max(decimals, 0)
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const sizeIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1)
    return Number.parseFloat((bytes / Math.pow(k, sizeIndex)).toFixed(dm)) + ' ' + sizes[sizeIndex]
  }
  private async detectMimeType(buffer: Buffer): Promise<string | undefined> {
    if (!buffer || buffer.length < 4) return undefined
    try {
      const { fileTypeFromBuffer } = await import('file-type')
      const ft = await fileTypeFromBuffer(buffer)
      return ft?.mime
    } catch {
      return undefined
    }
  }
  private checkMimeType(mimeType: string | undefined, errors: string[]): void {
    if (!mimeType) {
      errors.push('無法識別音頻格式 (不是有效的音頻檔案)')
      return
    }
    if (!AudioValidationConstants.ALLOWED_MIME_TYPES.includes(mimeType)) {
      errors.push(`不支援的音頻格式: ${mimeType}`)
    }
  }
  private async checkDuration(audioBuffer: Buffer, mimeType: string | undefined): Promise<number | undefined> {
    try {
      const { parseBuffer } = await import('music-metadata')
      const metadata = await parseBuffer(audioBuffer, { mimeType, size: audioBuffer.length }, { duration: true })
      const duration = metadata.format.duration
      if (!duration || Number.isNaN(duration)) {
        return undefined
      }
      return duration
    } catch {
      return undefined
    }
  }
}
