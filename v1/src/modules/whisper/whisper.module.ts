import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { ConfigModule } from '@nestjs/config'
import { WhisperService } from './whisper.service'
@Module({
  imports: [HttpModule, ConfigModule],
  providers: [WhisperService],
  exports: [WhisperService],
})
export class WhisperModule {}
