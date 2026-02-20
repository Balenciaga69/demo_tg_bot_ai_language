import { Module } from '@nestjs/common'
import { SharedConfigModule } from '@shared/config/config.module'
import { WhisperModule } from './modules/whisper/whisper.module'
@Module({
  imports: [SharedConfigModule, WhisperModule],
})
export class SttAppModule {}
