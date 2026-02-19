import { Injectable, Logger } from '@nestjs/common'
import { execFile } from 'node:child_process'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'
import {
  AUDIO_DURATION_MAX_SECONDS,
  AUDIO_DURATION_MIN_SECONDS,
  AUDIO_FILE_SIZE_MAX_BYTES,
  AUDIO_FILE_SIZE_MIN_BYTES,
  AZURE_AUDIO_SPEC,
  FFMPEG_TEMP_DIR,
  FFMPEG_TIMEOUT_MS,
} from './ffmpeg.constant'
const execFileAsync = promisify(execFile)
@Injectable()
export class FfmpegService {
  private readonly logger = new Logger(FfmpegService.name)
  /**
   * 檢查是否為 WAV 格式（通過 RIFF 標誌）
   */
  isWavFormat(buffer: Buffer): boolean {
    if (buffer.length < 4) return false
    return buffer.toString('ascii', 0, 4) === 'RIFF'
  }
  /**
   * 驗證音樂檔案是否符合要求
   * @param buffer 音訊 Buffer
   * @param filename 原始檔名（用於提取副檔名）
   * @returns 無效傳回 Error，否則通過
   */
  async validateAudioFile(buffer: Buffer, filename: string): Promise<void> {
    if (!buffer || buffer.length === 0) {
      throw new Error('音訊 Buffer 為空')
    }
    // 檔案大小檢查
    if (buffer.length < AUDIO_FILE_SIZE_MIN_BYTES) {
      throw new Error('音訊檔案過小（< 1KB）')
    }
    if (buffer.length > AUDIO_FILE_SIZE_MAX_BYTES) {
      throw new Error('音訊檔案過大（> 50MB）')
    }
    // 提取副檔名
    const extension = path.extname(filename).toLowerCase()
    // 寫入臨時檔案，供 ffprobe 分析
    const temporaryDirectory = path.join(process.cwd(), FFMPEG_TEMP_DIR)
    const temporaryFile = path.join(temporaryDirectory, `ffmpeg_check_${Date.now()}${extension}`)
    try {
      await fs.writeFile(temporaryFile, buffer)
      this.logger.debug(`[FFmpeg] 臨時檔案寫入: ${temporaryFile}`)
      // 使用 ffprobe 獲取 duration
      const duration = await this.getAudioDuration(temporaryFile)
      // 檢查 duration 是否符合要求
      if (duration < AUDIO_DURATION_MIN_SECONDS || duration > AUDIO_DURATION_MAX_SECONDS) {
        throw new Error(
          `音訊時長不符合要求（${AUDIO_DURATION_MIN_SECONDS}-${AUDIO_DURATION_MAX_SECONDS} 秒），實際: ${duration.toFixed(2)} 秒`
        )
      }
    } finally {
      // 刪除臨時檔案
      try {
        await fs.unlink(temporaryFile)
        this.logger.debug(`[FFmpeg] 臨時檔案刪除: ${temporaryFile}`)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        this.logger.warn(`[FFmpeg] 無法刪除臨時檔案 ${temporaryFile}: ${errorMessage}`)
      }
    }
  }
  /**
   * 轉換音訊為 WAV 格式（16kHz, 16-bit PCM, Mono）
   * @param inputBuffer 輸入音訊 Buffer
   * @returns 轉換後的 WAV Buffer（Azure 相容格式）
   */
  async convertToWav(inputBuffer: Buffer): Promise<Buffer> {
    this.logger.debug('[FFmpeg] 開始轉檔')
    // 若已是 WAV 格式，直接返回
    if (this.isWavFormat(inputBuffer)) {
      this.logger.debug('[FFmpeg] 已是 WAV 格式，無需轉檔')
      return inputBuffer
    }
    const temporaryDirectory = path.join(process.cwd(), FFMPEG_TEMP_DIR)
    const inputFile = path.join(temporaryDirectory, `ffmpeg_in_${Date.now()}.tmp`)
    const outputFile = path.join(temporaryDirectory, `ffmpeg_out_${Date.now()}.wav`)
    try {
      await this.executeConversion(inputFile, outputFile, inputBuffer)
      const outputBuffer = await fs.readFile(outputFile)
      this.logger.log(`[FFmpeg] 轉檔成功: ${outputBuffer.length} bytes`)
      return outputBuffer
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.logger.error(`[FFmpeg] 轉檔失敗: ${errorMessage}`)
      throw new Error(`音訊轉檔失敗: ${errorMessage}`)
    } finally {
      // 清理臨時檔案
      await Promise.all([fs.unlink(inputFile).catch(() => {}), fs.unlink(outputFile).catch(() => {})])
    }
  }
  /**
   * 執行 FFmpeg 轉檔命令
   */
  private async executeConversion(inputFile: string, outputFile: string, inputBuffer: Buffer): Promise<void> {
    // 寫入輸入檔案
    await fs.writeFile(inputFile, inputBuffer)
    this.logger.debug(`[FFmpeg] 輸入檔案寫入: ${inputFile}`)
    // 執行 FFmpeg 轉檔
    const ffmpegArguments = [
      '-i',
      inputFile,
      '-acodec',
      'pcm_s16le',
      '-ar',
      String(AZURE_AUDIO_SPEC.SAMPLE_RATE),
      '-ac',
      String(AZURE_AUDIO_SPEC.CHANNELS),
      '-y',
      outputFile,
    ]
    await execFileAsync('ffmpeg', ffmpegArguments, {
      timeout: FFMPEG_TIMEOUT_MS,
      maxBuffer: 10 * 1024 * 1024,
    })
    this.logger.debug(`[FFmpeg] 轉檔完成: ${outputFile}`)
  }
  /**
   * 私有方法：使用 ffprobe 獲取音訊時長
   * @param filePath 音訊檔案路徑
   * @returns 音訊時長（秒）
   */
  private async getAudioDuration(filePath: string): Promise<number> {
    try {
      const { stdout } = await execFileAsync('ffprobe', [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1:noinput=1',
        filePath,
      ])
      const duration = Number.parseFloat(stdout.trim())
      if (Number.isNaN(duration)) {
        throw new TypeError('無法解析音訊時長')
      }
      this.logger.debug(`[FFmpeg] 音訊時長: ${duration.toFixed(2)} 秒`)
      return duration
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.logger.error(`[FFmpeg] 無法獲取音訊時長: ${errorMessage}`)
      throw new Error(`無法獲取音訊時長: ${errorMessage}`)
    }
  }
}
