import { Injectable, Logger } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { ConfigService } from '@nestjs/config'
import { firstValueFrom } from 'rxjs'
import FormData from 'form-data'
import { AudioValidationService } from '@shared/audio'

/**
 * Whisper 轉錄結果
 */
export interface WhisperTranscribeResult {
  success: boolean
  text?: string
  error?: string
  duration?: number
}

/**
 * Whisper 服務 - 音頻轉文字
 */
@Injectable()
export class WhisperService {
  private readonly logger = new Logger(WhisperService.name)
  private readonly whisperApiUrl: string

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly audioValidator: AudioValidationService
  ) {
    this.whisperApiUrl = this.configService.getOrThrow<string>('WHISPER_API_URL')
  }

  /**
   * 轉錄語音 (含驗證)
   * @param language 語言代碼 (e.g., 'zh', 'en')
   * @param buffer 音頻 Buffer
   */
  async transcribe(language: string, buffer: Buffer): Promise<WhisperTranscribeResult> {
    try {
      // 1️⃣ 驗證音頻檔案
      const validation = await this.audioValidator.validate(buffer)
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', '),
        }
      }

      // 2️⃣ 調用 Whisper API
      const text = await this.callWhisperApi(language, buffer)
      return {
        success: true,
        text,
        duration: validation.duration,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.logger.error(`Transcription failed: ${errorMessage}`, error)
      return {
        success: false,
        error: errorMessage,
      }
    }
  }

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

    try {
      const result = await firstValueFrom(
        this.httpService.post<string>(this.whisperApiUrl, formData, {
          headers: formData.getHeaders(),
          timeout: 300_000, // 5 minutes
        })
      )
      return result.data
    } catch (error) {
      throw new Error(`Whisper API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}
