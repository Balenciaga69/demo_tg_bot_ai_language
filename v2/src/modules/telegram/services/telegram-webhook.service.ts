import { Injectable, Logger } from '@nestjs/common'
import { Update } from 'grammy/types'
import { TelegramService } from './telegram.service'
@Injectable()
export class TelegramWebhookService {
  private readonly _logger = new Logger(TelegramWebhookService.name)
  constructor(private telegramService: TelegramService) {}
  /**
   * 處理來自 Telegram 的 webhook 更新
   */
  async handleUpdate(update: Update): Promise<void> {
    try {
      const bot = this.telegramService.getBot()
      await bot.handleUpdate(update)
    } catch (error) {
      this._logger.error('Error handling webhook update:', error)
      throw error
    }
  }
  /**
   * 設置 Telegram 機器人的 webhook
   */
  async setupWebhook(webhookUrl: string): Promise<void> {
    try {
      const bot = this.telegramService.getBot()
      // 先刪除舊的 webhook
      await bot.api.deleteWebhook()
      // 設置新的 webhook
      await bot.api.setWebhook(webhookUrl)
      this._logger.log(`✅ Webhook set to: ${webhookUrl}`)
    } catch (error) {
      this._logger.error('Error setting webhook:', error)
      throw error
    }
  }
}
