import { Injectable, Logger } from '@nestjs/common'
import { v4 as uuidv4 } from 'uuid'
import { FfmpegService } from 'src/shared/ffmpeg'
import type { IPronunciationService } from '../pronunciation.service.interface'
import type { AssessmentJobRequest, AssessmentJobResult } from '../types/pronunciation.types'
import { PronunciationAudioValidator } from '../validators/pronunciation-audio.validator'
import { AzureCoreService } from './azure/azure-core.service'
import { PRONUNCIATION_LANGUAGES } from '../constants/pronunciation.constant'
/**
 * Azure 發音評估服務實現
 *
 * 職責分層：
 * - AzurePronunciationService (本類): API 層，音訊轉檔、驗證、Job ID、錯誤處理
 * - FfmpegService: 音訊轉檔層（OGG/Opus → WAV）
 * - AzureCoreService: SDK 調度層
 * - azure.helper: 計分邏輯層（textHelpers, scoringHelpers, matchingHelpers 等）
 *
 * 流程：音訊轉檔 → 驗證 → SDK 呼叫 → 返回結果
 * 同步處理，不使用隊列
 */
@Injectable()
export class AzurePronunciationService implements IPronunciationService {
  private readonly logger = new Logger(AzurePronunciationService.name)
  private readonly validator = new PronunciationAudioValidator()
  constructor(
    private readonly azureCoreService: AzureCoreService,
    private readonly ffmpegService: FfmpegService
  ) {}
  /**
   * 進行發音評估
   * 流程：音訊轉檔 → 驗證 → 呼叫 AzureCoreService → 返回結果
   */
  async assessPronunciation(request: AssessmentJobRequest): Promise<AssessmentJobResult> {
    const jobId = uuidv4()
    this.logger.log(`[${jobId}] 開始評估: userId=${request.userId}, text="${request.referenceText.slice(0, 30)}..."`)
    try {
      // 0️⃣ 音訊轉檔（如需要）
      const audioBuffer = await this.convertAudioToWavIfNeeded(jobId, request.audioBuffer)
      if (!audioBuffer) {
        return {
          jobId,
          status: 'failed',
          progress: 100,
          error: '音訊轉檔失敗',
        }
      }
      // 1️⃣ 驗證音頻檔案
      const validationResult = await this.validateAudio(jobId, audioBuffer)
      if (validationResult) {
        return validationResult
      }
      // 2️⃣ 進行 Azure 評估
      const language = request.language || PRONUNCIATION_LANGUAGES.DEFAULT
      const result = await this.azureCoreService.assess(audioBuffer, request.referenceText, language)
      this.logger.log(`[${jobId}] 評估完成: pronScore=${result.pronScore}`)
      return {
        jobId,
        status: 'completed',
        progress: 100,
        result,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知錯誤'
      this.logger.error(`[${jobId}] 評估失敗: ${errorMessage}`, error instanceof Error ? error.stack : undefined)
      return {
        jobId,
        status: 'failed',
        progress: 100,
        error: errorMessage,
      }
    }
  }
  /**
   * 私有方法：轉檔音訊為 WAV（如需要）
   */
  private async convertAudioToWavIfNeeded(jobId: string, audioBuffer: Buffer): Promise<Buffer | undefined> {
    if (this.ffmpegService.isWavFormat(audioBuffer)) {
      return audioBuffer
    }
    this.logger.log(`[${jobId}] 檢測到非 WAV 格式，進行轉檔...`)
    try {
      const convertedBuffer = await this.ffmpegService.convertToWav(audioBuffer)
      this.logger.log(`[${jobId}] 轉檔完成，新檔案大小: ${convertedBuffer.length} bytes`)
      return convertedBuffer
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.logger.error(`[${jobId}] 音訊轉檔失敗: ${errorMessage}`)
      return undefined
    }
  }
  /**
   * 私有方法：驗證音訊檔案
   * @returns 若驗證失敗，返回失敗結果；否則返回 undefined
   */
  private async validateAudio(jobId: string, audioBuffer: Buffer): Promise<AssessmentJobResult | undefined> {
    const validation = await this.validator.validate(audioBuffer)
    if (!validation.isValid) {
      this.logger.warn(`[${jobId}] 音頻驗證失敗: ${validation.errors.join('; ')}`)
      return {
        jobId,
        status: 'failed',
        progress: 100,
        error: `音頻驗證失敗: ${validation.errors.join('; ')}`,
      }
    }
    this.logger.debug(
      `[${jobId}] 音頻驗證通過: ${validation.sampleRate}Hz, ${validation.duration?.toFixed(2)}s, ${validation.fileSize} bytes`
    )
    return undefined
  }
  /**
   * 獲取評估結果狀態
   * 因為是同步處理，直接返回完成狀態
   */
  getAssessmentStatus(jobId: string): Promise<AssessmentJobResult> {
    return Promise.resolve({
      jobId,
      status: 'completed',
      progress: 100,
      error: '此服務為同步處理，請直接使用 assessPronunciation 返回的結果',
    })
  }
}
