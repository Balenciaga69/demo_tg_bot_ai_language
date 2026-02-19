import { Injectable, Logger } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { firstValueFrom } from 'rxjs'
import FormData from 'form-data'
import { EnvironmentKey } from 'src/shared/environment-key'
import { AudioValidator } from 'src/shared/file/validators/audio.validator'
export interface WhisperTranscribeResult {
  success: boolean
  text?: string
  error?: string
  duration?: number // 音頻時長（秒）
}
@Injectable()
export class WhisperService {
  private readonly logger = new Logger(WhisperService.name)
  private readonly whisperApiUrl: string
  private readonly audioValidator: AudioValidator
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {
    this.whisperApiUrl = this.configService.getOrThrow<string>(EnvironmentKey.WHISPER_LOCAL_API_URL)
    this.audioValidator = new AudioValidator()
  }
  /**
   * 轉錄語音 (含驗證)
   * @param language 語言代碼
   * @param buffer 音頻 Buffer
   * @returns 轉錄結果
   */
  async transcribe(language: string, buffer: Buffer): Promise<WhisperTranscribeResult> {
    try {
      // 1️⃣ 驗證音頻檔案
      const validation = await this.audioValidator.validate(buffer)
      if (!validation.isValid) {
        this.logger.warn(`Audio validation failed: ${validation.errors.join(', ')}`)
        return {
          success: false,
          error: `音頻驗證失敗: ${validation.errors.join('; ')}`,
        }
      }
      this.logger.debug(
        `Audio validated: ${validation.mimeType}, ${validation.duration?.toFixed(2)}s, ${validation.fileSize} bytes`
      )
      // 2️⃣ 調用 Whisper API
      const text = await this.callWhisperApi(language, buffer)
      return {
        success: true,
        text,
        duration: validation.duration,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知錯誤'
      this.logger.error(`Transcription failed: ${errorMessage}`, error)
      return {
        success: false,
        error: errorMessage,
      }
    }
  }
  /**
   * 調用 Whisper API
   */
  private async callWhisperApi(language: string, buffer: Buffer): Promise<string> {
    const formData = new FormData()
    const fileName = `audio_${Date.now()}.mp3`
    formData.append('file', buffer, {
      filename: fileName,
      contentType: 'audio/mpeg',
    })
    formData.append('model', 'Systran/faster-whisper-large-v3')
    formData.append('language', language)
    formData.append('response_format', 'text')
    formData.append('temperature', 0)
    formData.append('stream', 'false')
    const result = await firstValueFrom(
      this.httpService.post<string>(this.whisperApiUrl, formData, {
        headers: formData.getHeaders(),
        timeout: 300_000,
      })
    )
    return result.data
  }
}
