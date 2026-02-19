import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppController } from './app.controller'
import { TelegramModule } from './modules/telegram/telegram.module'
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), TelegramModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule implements NestModule {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  configure(consumer: MiddlewareConsumer): void {}
}
