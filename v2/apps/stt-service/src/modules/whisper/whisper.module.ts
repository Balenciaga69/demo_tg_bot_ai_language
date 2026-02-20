import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { SharedConfigModule } from '@shared/config/config.module'
import { AudioModule } from '@shared/audio'
import { WhisperController } from './whisper.controller'
import { WhisperService } from './whisper.service'
@Module({
  imports: [HttpModule, SharedConfigModule, AudioModule],
  controllers: [WhisperController],
  providers: [WhisperService],
})
export class WhisperModule {}
