import { Module } from '@nestjs/common'
import { SharedConfigModule } from '@shared/config/config.module'
import { SharedConfigService } from '@shared/config/config.service'
import { ClientsModule, Transport } from '@nestjs/microservices'
import { Bot } from 'grammy'
import { STT_SERVICE_TOKEN } from '@shared/contracts'
import { TelegramBotService } from './telegram-bot.service'
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: STT_SERVICE_TOKEN,
        imports: [SharedConfigModule],
        useFactory: (config: SharedConfigService) => {
          const sttTcpHost = config.getOrThrow<string>('STT_TCP_HOST')
          const sttTcpPort = Number(config.getOrThrow<string>('STT_TCP_PORT'))
          if (Number.isNaN(sttTcpPort)) {
            throw new TypeError('STT_TCP_PORT must be a number')
          }
          return {
            transport: Transport.TCP,
            options: {
              host: sttTcpHost,
              port: sttTcpPort,
            },
          }
        },
        inject: [SharedConfigService],
      },
    ]),
  ],
  providers: [
    {
      provide: Bot,
      useFactory: (config: SharedConfigService) => {
        const token = config.getOrThrow<string>('TELEGRAM_BOT_TOKEN')
        return new Bot(token)
      },
      inject: [SharedConfigService],
    },
    TelegramBotService,
  ],
  exports: [TelegramBotService],
})
export class TelegramModule {}
