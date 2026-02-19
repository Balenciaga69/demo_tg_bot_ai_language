import { Injectable, Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { Bot } from 'grammy'
import { limit } from '@grammyjs/ratelimiter'

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  constructor(@Inject(Bot) private readonly bot: Bot) {}

  applyThrottleMiddleware(): void {
    this.bot.use(
      limit({
        timeFrame: 1000,
        limit: 1,
        keyGenerator: (context) => context.from?.id?.toString() ?? 'anonymous',
      })
    )
  }

  registerCommands(): void {
    this.bot.command('start', (context) => {
      void context.reply('歡迎使用 Telegram Bot!')
    })
  }

  async onModuleInit(): Promise<void> {
    this.registerCommands()
    this.applyThrottleMiddleware()
    await this.bot.start()
  }

  async onModuleDestroy(): Promise<void> {
    await this.bot.stop()
  }

  getBotInstance(): Bot {
    return this.bot
  }

  async startBot(): Promise<void> {
    await this.bot.start()
  }

  async dispose(): Promise<void> {
    await this.bot.stop()
  }
}
