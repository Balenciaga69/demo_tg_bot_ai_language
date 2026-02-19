import * as mm from 'music-metadata'
import { PRONUNCIATION_LIMITS } from '../constants/pronunciation.constant'
/**
 * Azure 發音評估音頻驗證結果
 */
export interface PronunciationAudioValidationResult {
  isValid: boolean
  duration?: number // 秒數
  sampleRate?: number // 採樣率 (Hz)
  fileSize?: number
  errors: string[]
}
/**
 * Azure 發音評估專用音頻驗證器
 */
export class PronunciationAudioValidator {
  private readonly MIN_DURATION_SECONDS = PRONUNCIATION_LIMITS.AUDIO_MIN_DURATION
  private readonly MAX_DURATION_SECONDS = PRONUNCIATION_LIMITS.AUDIO_MAX_DURATION
  private readonly MIN_FILE_SIZE = PRONUNCIATION_LIMITS.AUDIO_MIN_FILE_SIZE
  private readonly MAX_FILE_SIZE = PRONUNCIATION_LIMITS.AUDIO_MAX_FILE_SIZE
  private readonly REQUIRED_SAMPLE_RATE = 16_000 // 16kHz
  private readonly REQUIRED_BITS_PER_SAMPLE = 16 // 16-bit
  /**
   * 驗證音頻檔案是否符合 Azure 要求
   * @param audioBuffer 音頻 Buffer
   * @returns 驗證結果
   */
  async validate(audioBuffer: Buffer): Promise<PronunciationAudioValidationResult> {
    // 基本檢查
    const basicCheckResult = this.validateBasicCheck(audioBuffer)
    if (basicCheckResult) {
      return basicCheckResult
    }
    // 檔案大小檢查
    const errors: string[] = []
    this.validateFileSize(audioBuffer, errors)
    // WAV 格式檢查
    if (!this.isWavFormat(audioBuffer)) {
      errors.push('必須是 WAV 格式（Azure Speech SDK 要求）')
      return {
        isValid: false,
        fileSize: audioBuffer.length,
        errors,
      }
    }
    // 元資料驗證
    const metadataResult = await this.validateMetadata(audioBuffer)
    return {
      isValid: errors.length === 0 && metadataResult.errors.length === 0,
      duration: metadataResult.duration,
      sampleRate: metadataResult.sampleRate,
      fileSize: audioBuffer.length,
      errors: [...errors, ...metadataResult.errors],
    }
  }
  /**
   * 基本檢查：是否為空
   */
  private validateBasicCheck(audioBuffer: Buffer): PronunciationAudioValidationResult | undefined {
    if (!audioBuffer || audioBuffer.length === 0) {
      return {
        isValid: false,
        errors: ['音頻檔案為空'],
      }
    }
    return undefined
  }
  /**
   * 檔案大小檢查
   */
  private validateFileSize(audioBuffer: Buffer, errors: string[]): void {
    if (audioBuffer.length < this.MIN_FILE_SIZE) {
      errors.push(
        `檔案太小 (最少 ${this.formatBytes(this.MIN_FILE_SIZE)}，實際: ${this.formatBytes(audioBuffer.length)})`
      )
    }
    if (audioBuffer.length > this.MAX_FILE_SIZE) {
      errors.push(
        `檔案太大 (最多 ${this.formatBytes(this.MAX_FILE_SIZE)}，實際: ${this.formatBytes(audioBuffer.length)})`
      )
    }
  }
  /**
   * 驗證音頻元資料（時長、採樣率、位元深度）
   */
  private async validateMetadata(audioBuffer: Buffer): Promise<{
    duration: number | undefined
    sampleRate: number | undefined
    errors: string[]
  }> {
    const errors: string[] = []
    let duration: number | undefined
    let sampleRate: number | undefined
    try {
      const metadata = await mm.parseBuffer(
        audioBuffer,
        { mimeType: 'audio/wav', size: audioBuffer.length },
        { duration: true }
      )
      duration = metadata.format.duration
      sampleRate = metadata.format.sampleRate
      this.validateDuration(duration, errors)
      this.validateSampleRate(sampleRate, errors)
      this.validateBitsPerSample(metadata.format.bitsPerSample, errors)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知錯誤'
      errors.push(`無法解析音頻元資料: ${errorMessage}`)
    }
    return { duration, sampleRate, errors }
  }
  /**
   * 驗證時長
   */
  private validateDuration(duration: number | undefined, errors: string[]): void {
    if (!duration) {
      errors.push('無法解析音頻時長')
    } else if (duration < this.MIN_DURATION_SECONDS) {
      errors.push(`音頻時長過短（需至少 ${this.MIN_DURATION_SECONDS} 秒，實際: ${duration.toFixed(2)}s）`)
    } else if (duration > this.MAX_DURATION_SECONDS) {
      errors.push(`音頻時長過長（最多 ${this.MAX_DURATION_SECONDS} 秒，實際: ${duration.toFixed(2)}s）`)
    }
  }
  /**
   * 驗證採樣率
   */
  private validateSampleRate(sampleRate: number | undefined, errors: string[]): void {
    if (!sampleRate) {
      errors.push('無法解析採樣率')
    } else if (sampleRate !== this.REQUIRED_SAMPLE_RATE) {
      errors.push(`採樣率不符合要求（需 ${this.REQUIRED_SAMPLE_RATE}Hz，實際: ${sampleRate}Hz）`)
    }
  }
  /**
   * 驗證位元深度
   */
  private validateBitsPerSample(bitsPerSample: number | undefined, errors: string[]): void {
    if (bitsPerSample && bitsPerSample !== this.REQUIRED_BITS_PER_SAMPLE) {
      errors.push(`位元深度不符合要求（需 ${this.REQUIRED_BITS_PER_SAMPLE}-bit，實際: ${bitsPerSample}-bit）`)
    }
  }
  /**
   * 檢查是否為 WAV 格式
   * WAV 檔案以 "RIFF" 開頭，並在偏移 8-11 位置包含 "WAVE" 字串
   */
  private isWavFormat(buffer: Buffer): boolean {
    if (buffer.length < 12) return false
    // 檢查 RIFF header (0-3)
    const riffHeader = buffer.toString('ascii', 0, 4)
    if (riffHeader !== 'RIFF') return false
    // 檢查 WAVE 標籤 (8-11)
    const waveTag = buffer.toString('ascii', 8, 12)
    return waveTag === 'WAVE'
  }
  /**
   * 格式化位元組大小
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
