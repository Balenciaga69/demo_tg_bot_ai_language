import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { WhisperModule } from './modules/whisper/whisper.module'

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), WhisperModule],
})
export class SttAppModule {}
