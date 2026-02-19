import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { ConfigService } from '@nestjs/config'
import { EnvironmentKey } from '../environment-key'
import { BullMqJobName } from './bull-mq-job.name'
/**
 * BullMQ 模組 - 提供隊列服務
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>(EnvironmentKey.REDIS_HOST),
          port: configService.get<number>(EnvironmentKey.REDIS_PORT),
          db: configService.get<number>(EnvironmentKey.REDIS_DB),
          password: configService.get<string>(EnvironmentKey.REDIS_PASSWORD),
        },
      }),
    }),
    BullModule.registerQueue(
      { name: BullMqJobName.TELEGRAM_MESSAGES },
      { name: BullMqJobName.WHISPER_TRANSCRIPTION },
      { name: BullMqJobName.TRANSLATION_TASKS },
      { name: BullMqJobName.USER_NOTIFICATIONS }
    ),
  ],
  exports: [BullModule],
})
export class SharedBullMqModule {}
