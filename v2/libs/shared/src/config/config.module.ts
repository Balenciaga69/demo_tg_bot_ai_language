import { Global, Module } from '@nestjs/common'
import { ConfigModule as NestConfigModule } from '@nestjs/config'
import { SharedConfigService } from './config.service'
@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
  ],
  providers: [SharedConfigService],
  exports: [SharedConfigService, NestConfigModule],
})
export class SharedConfigModule {}
