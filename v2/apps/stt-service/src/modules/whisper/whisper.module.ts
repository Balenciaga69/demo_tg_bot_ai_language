import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { ConfigModule } from '@nestjs/config'
import { AudioModule } from '@shared/audio'
import { WhisperController } from './whisper.controller'
import { WhisperService } from './whisper.service'

@Module({
  imports: [HttpModule, ConfigModule, AudioModule],
  controllers: [WhisperController],
  providers: [WhisperService],
})
export class WhisperModule {}
