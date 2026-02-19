import { Logger } from '@nestjs/common'
import axios from 'axios'
import type { Context } from 'grammy'
/**
 * 音頻下載器 - 共用邏輯
 * 職責：從 Telegram 下載語音檔案，返回 Buffer（不涉及 UI）
 */
const logger = new Logger('AudioDownloader')
export const AudioDownloader = {
  /**
   * 下載語音檔案
   * @param context Bot context
   * @returns 音頻 Buffer，若失敗返回 undefined
   */
  async downloadAudioFile(context: Context): Promise<Buffer | undefined> {
    try {
      const fileId = context.message?.voice?.file_id
      if (!fileId) return undefined
      const file = await context.api.getFile(fileId)
      if (!file.file_path) return undefined
      const botToken = context.api.token
      const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${file.file_path}`
      const response = await axios.get<Buffer>(downloadUrl, {
        responseType: 'arraybuffer',
        timeout: 30_000, // 30 秒 timeout
        maxContentLength: 10 * 1024 * 1024, // 10MB 限制
      })
      return response.data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error(`下載音頻檔案失敗: ${errorMessage}`)
      return undefined
    }
  },
}
