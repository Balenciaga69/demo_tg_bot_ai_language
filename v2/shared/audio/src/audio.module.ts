import { Module } from '@nestjs/common'
import { AudioValidationService } from './audio-validation.service'

@Module({
  providers: [AudioValidationService],
  exports: [AudioValidationService],
})
export class AudioModule {}
