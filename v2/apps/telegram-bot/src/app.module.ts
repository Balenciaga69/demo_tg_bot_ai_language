import { Module } from '@nestjs/common'
import { SharedConfigModule } from '@shared/config/config.module'
import { AppController } from './app.controller'
import { TelegramModule } from './modules/telegram/telegram.module'
@Module({
  imports: [SharedConfigModule, TelegramModule],
  controllers: [AppController],
})
export class ApiGatewayModule {}
