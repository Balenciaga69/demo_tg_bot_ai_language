import { Injectable, Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { Bot } from 'grammy'
import { limit } from '@grammyjs/ratelimiter'
/**  */
@Injectable()
export class TelegramBotService implements OnModuleInit, OnModuleDestroy {
  /** 注入 Bot 實例 */
  constructor(@Inject(Bot) private readonly bot: Bot) {}
  /** 模組啟動時註冊指令、套用中介並啟動 Bot */
  async onModuleInit(): Promise<void> {
    this.registerCommands()
    this.applyThrottleMiddleware()
    await this.bot.start()
  }
  /** 模組銷毀時停止 Bot */
  async onModuleDestroy(): Promise<void> {
    await this.bot.stop()
  }
  /** 套用速率限制中介層 */
  private applyThrottleMiddleware(): void {
    this.bot.use(
      limit({
        timeFrame: 1000,
        limit: 1,
        keyGenerator: (context) => context.from?.id?.toString() ?? 'anonymous',
      })
    )
  }
  /** 註冊 Bot 指令 (例如 /start) */
  private registerCommands(): void {
    this.bot.command('start', (context) => {
      void context.reply('歡迎使用 Telegram Bot!')
    })
  }
}
