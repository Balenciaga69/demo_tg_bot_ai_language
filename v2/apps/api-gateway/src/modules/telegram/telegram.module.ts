import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ClientsModule, Transport } from '@nestjs/microservices'
import { Bot } from 'grammy'
import { STT_SERVICE_TOKEN } from '@shared/contracts'
import { TelegramBotService } from './telegram-bot.service'

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: STT_SERVICE_TOKEN,
        imports: [ConfigModule],
        useFactory: (config: ConfigService) => ({
          transport: Transport.REDIS,
          options: {
            host: config.get<string>('REDIS_HOST', 'localhost'),
            port: config.get<number>('REDIS_PORT', 6666),
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
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
