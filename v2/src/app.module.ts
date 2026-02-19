import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppController } from './app.controller'
import { EdgeModule } from './modules/edge/edge.module'
import { PronunciationModule } from './modules/pronunciation/pronunciation.module'
import { TelegramModule } from './modules/telegram/telegram.module'
import { WhisperModule } from './modules/whisper/whisper.module'
import { SharedBullMqModule } from './shared/bull-mq/bull-mq.module'
import { DatabaseModule } from './shared/database'
import { FileModule } from './shared/file/file.module'
import { CorrelationIdMiddleware } from './shared/middleware/correlation-id.middleware'
import { SharedRedisModule } from './shared/redis/redis.module'
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    SharedRedisModule,
    SharedBullMqModule,
    FileModule,
    EdgeModule,
    TelegramModule,
    WhisperModule,
    PronunciationModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*')
  }
}
