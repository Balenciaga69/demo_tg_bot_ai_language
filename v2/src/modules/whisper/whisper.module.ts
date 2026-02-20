import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { ConfigModule } from '@nestjs/config'
import { WhisperService } from './whisper.service'
import { AudioModule } from '../../shared/audio/audio.module'
@Module({
  imports: [HttpModule, ConfigModule, AudioModule],
  providers: [WhisperService],
  exports: [WhisperService],
})
export class WhisperModule {}
