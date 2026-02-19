import { Module } from '@nestjs/common'
import { FileModule } from 'src/shared/file/file.module'
import { UserModule } from '../user/user.module'
import { WhisperModule } from '../whisper/whisper.module'
import { OllamaModule } from '../ollama/ollama.module'
import { PronunciationModule } from '../pronunciation/pronunciation.module'
import { EdgeModule } from '../edge/edge.module'
import { TelegramController } from './telegram.controller'
import { TelegramService } from './services/telegram.service'
import { TelegramWebhookService } from './services/telegram-webhook.service'
import { PronunciationAssessmentStore } from '../pronunciation'
import { FeatureLogger } from './handlers/features/shared'
@Module({
  imports: [FileModule, UserModule, WhisperModule, OllamaModule, PronunciationModule, EdgeModule],
  providers: [TelegramService, TelegramWebhookService, PronunciationAssessmentStore, FeatureLogger],
  controllers: [TelegramController],
  exports: [TelegramService],
})
export class TelegramModule {}
