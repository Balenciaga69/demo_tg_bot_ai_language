import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Bot } from 'grammy'
import { TelegramService } from './telegram.service'

@Module({
  providers: [
    {
      provide: Bot,
      useFactory: (config: ConfigService) => {
        const token = config.get<string>('TELEGRAM_BOT_TOKEN')
        if (!token) {
          throw new Error('TELEGRAM_BOT_TOKEN is not set')
        }
        return new Bot(token)
      },
      inject: [ConfigService],
    },
    TelegramService,
  ],
  exports: [TelegramService, Bot],
})
export class TelegramModule {}
