import { BadRequestException, Body, Controller, Logger, Post } from '@nestjs/common'
import { type Update } from 'grammy/types'
import { TelegramWebhookService } from './services/telegram-webhook.service'
import { getCorrelationId } from 'src/shared/middleware/correlation-id.middleware'
@Controller('telegram')
export class TelegramController {
  private readonly logger = new Logger(TelegramController.name)
  constructor(private readonly telegramWebhookService: TelegramWebhookService) {}
  //#region WebHook 相關
  @Post('webhook')
  async handleWebhook(@Body() update: Update): Promise<{ ok: boolean }> {
    const correlationId = getCorrelationId()
    this.logger.log(`[${correlationId}] Webhook received: updateId=${update.update_id}`)
    if (!update) throw new BadRequestException('Update body is required')
    try {
      await this.telegramWebhookService.handleUpdate(update)
      this.logger.debug(`[${correlationId}] Webhook processed successfully`)
      return { ok: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      this.logger.error(
        `[${correlationId}] Webhook 處理錯誤: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined
      )
      // 返回 200 OK 避免 Telegram 重複推送
      return { ok: true }
    }
  }
  /**
   * 要先觸發: PostMan http://公網網址/telegram/setup-webhook
   *`{ "url": "https://公網網址/telegram/webhook" }`
   * 才能讓 Telegram 知道要把更新推送到哪裡
   */
  @Post('setup-webhook')
  async setupWebhook(@Body() body: { url: string }): Promise<{ message: string }> {
    const correlationId = getCorrelationId()
    this.logger.log(`[${correlationId}] Setting up webhook with URL: ${body.url}`)
    const { url } = body
    if (!url) throw new BadRequestException('URL is required')
    await this.telegramWebhookService.setupWebhook(url)
    this.logger.log(`[${correlationId}] Webhook setup completed`)
    return { message: `Webhook setup complete: ${url}` }
  }
  //#endregion
}
