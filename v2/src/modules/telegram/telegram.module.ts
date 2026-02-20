import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Bot } from 'grammy'
import { TelegramBotService } from './telegram-bot.service'
@Module({
  providers: [
    {
      provide: Bot,
      useFactory: (config: ConfigService) => {
        const token = config.getOrThrow<string>('TELEGRAM_BOT_TOKEN')
        return new Bot(token)
      },
      inject: [ConfigService],
    },
    TelegramBotService,
  ],
  exports: [TelegramBotService],
})
export class TelegramModule {}
