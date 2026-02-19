/**
 * Edge TTS 引擎實現
 * 使用 edge-tts CLI 工具進行語音合成
 *
 * 環境要求：
 * - Python 環境（安裝 edge-tts: pip install edge-tts）
 * - 系統可執行 edge-tts 命令
 */
import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import * as fs from 'node:fs/promises'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import type { ITTSEngine } from './tts.engine'
import type { TTSRequest, TTSSynthesizeResult } from '../types/edge.types'
const execFileAsync = promisify(execFile)
/**
 * Edge TTS 引擎實現
 * 透過執行 edge-tts 命令列工具進行語音合成
 *
 * 儲存策略：
 * - 檔案儲存到 ./public/tts（持久化，供下載）
 * - 檔案保留，不自動刪除
 * - 定期清理過期檔案應由外部 cron job 處理
 */
@Injectable()
export class EdgeTTSEngine implements ITTSEngine {
  private readonly logger = new Logger(EdgeTTSEngine.name)
  private readonly outputDirectory: string
  private readonly timeoutMs: number
  constructor(outputDirectory: string = './public/tts', timeoutMs: number = 60_000) {
    this.outputDirectory = outputDirectory
    this.timeoutMs = timeoutMs
  }
  /**
   * 合成語音
   * 流程：建立臨時檔案 → 執行 edge-tts → 讀取檔案 → 清理檔案
   */
  async synthesize(request: TTSRequest): Promise<TTSSynthesizeResult> {
    const filename = this.generateFilename()
    const filepath = path.join(this.outputDirectory, filename)
    // 確保輸出目錄存在
    await this.ensureOutputDirExists()
    try {
      this.logger.log(`[TTS] 開始合成: voice=${request.voice}, textLength=${request.text.length}`)
      // 執行 edge-tts 命令
      await this.executeEdgeTTS(request.text, request.voice, filepath)
      // 讀取生成的音訊檔案
      const buffer = await fs.readFile(filepath)
      const fileSize = buffer.length
      this.logger.log(`[TTS] 合成完成並持久化: filePath=${filepath}, size=${fileSize} bytes`)
      return {
        filePath: filepath,
        buffer,
        fileSize,
      }
    } catch (error) {
      // 清理只在失敗時進行
      await this.cleanupFile(filepath)
      if (error instanceof Error && error.message.includes('ETIMEDOUT')) {
        const message = 'Text-to-speech synthesis timed out. Try with shorter text.'
        this.logger.error(`[TTS] ${message}`)
        throw new InternalServerErrorException(message)
      }
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.logger.error(`[TTS] 合成失敗: ${errorMessage}`)
      throw new InternalServerErrorException(`Text-to-speech synthesis failed: ${errorMessage}`)
    }
  }
  /**
   * 執行 edge-tts 命令
   */
  private async executeEdgeTTS(text: string, voice: string, filepath: string): Promise<void> {
    // 標準化路徑（Windows 相容）
    const normalizedPath = filepath.replaceAll('\\', '/')
    try {
      const { stderr } = await execFileAsync(
        'edge-tts',
        ['--text', text, '--voice', voice, '--write-media', normalizedPath],
        {
          timeout: this.timeoutMs,
          maxBuffer: 50 * 1024 * 1024, // 50MB 緩衝區
        }
      )
      // 檢查標準錯誤（忽略信息級別的）
      if (stderr && !stderr.includes('INFO')) {
        this.logger.warn(`[TTS] 標準錯誤: ${stderr}`)
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('ETIMEDOUT')) {
          throw new Error('ETIMEDOUT')
        }
        throw error
      }
      throw error
    }
  }
  /**
   * 生成唯一的檔案名稱
   */
  private generateFilename(): string {
    const timestamp = Date.now()
    const randomId = randomBytes(4).toString('hex')
    return `tts_${timestamp}_${randomId}.mp3`
  }
  /**
   * 確保輸出目錄存在
   */
  private async ensureOutputDirExists(): Promise<void> {
    try {
      await fs.mkdir(this.outputDirectory, { recursive: true })
    } catch (error) {
      const message = `Failed to create output directory ${this.outputDirectory}`
      this.logger.error(message, error instanceof Error ? error.stack : undefined)
      throw new InternalServerErrorException(message)
    }
  }
  /**
   * 清理檔案
   */
  private async cleanupFile(filepath: string): Promise<void> {
    try {
      await fs.unlink(filepath)
      this.logger.debug(`[TTS] 已清理臨時檔案: ${filepath}`)
    } catch {
      // 忽略清理失敗，未來會有定期清理機制
      this.logger.debug(`[TTS] 無法清理臨時檔案: ${filepath}`)
    }
  }
}
