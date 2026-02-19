/**
 * 發音評估模組
 *
 * 提供發音評估相關的服務
 * 使用 Azure Speech SDK 進行真實發音評估
 */
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { FfmpegModule } from 'src/shared/ffmpeg'
import { AzurePronunciationService } from './services/azure-pronunciation.service'
import { AzureCoreService } from './services/azure/azure-core.service'
import { PRONUNCIATION_SERVICE } from './pronunciation.service.interface'
@Module({
  imports: [ConfigModule, FfmpegModule],
  providers: [
    // 核心服務層
    AzureCoreService,
    // API 層
    {
      provide: PRONUNCIATION_SERVICE,
      useClass: AzurePronunciationService,
    },
  ],
  exports: [PRONUNCIATION_SERVICE],
})
export class PronunciationModule {}
