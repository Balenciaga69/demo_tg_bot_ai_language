import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppController } from './app.controller'
import { TelegramModule } from './modules/telegram/telegram.module'
import { AudioModule } from './shared/audio/audio.module'
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), TelegramModule, AudioModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule implements NestModule {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  configure(consumer: MiddlewareConsumer): void {}
}
