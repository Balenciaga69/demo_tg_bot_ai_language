/**
 * Edge 模組
 *
 * 提供 Azure Edge TTS (文字轉語音) 功能
 *
 * 功能特性：
 * - 使用 edge-tts CLI 工具進行高品質語音合成
 * - 支援多種語言和聲音角色
 * - 簡潔的服務 API
 *
 * 使用範例：
 * ```typescript
 * const result = await edgeTTSService.synthesize('Hello World', 'en-US-AriaNeural')
 * ```
 *
 * 環境要求：
 * - 系統中已安裝 Python
 * - 已安裝 edge-tts: pip install edge-tts
 * - 臨時檔案目錄可寫入
 */
import { Module } from '@nestjs/common'
import { EdgeTTSEngine } from './engines'
import { EdgeTTSService } from './services'
import { TTS_ENGINE_TOKEN } from './engines/tts.engine'
import { TTS_CONSTANTS } from './constants/edge.constant'
/**
 * Edge TTS 模組
 *
 * 提供文字轉語音的服務和相關工具
 */
@Module({
  providers: [
    {
      provide: TTS_ENGINE_TOKEN,
      useFactory: (): EdgeTTSEngine => {
        return new EdgeTTSEngine(TTS_CONSTANTS.DEFAULT_OUTPUT_DIR, TTS_CONSTANTS.DEFAULT_TIMEOUT_MS)
      },
    },
    {
      provide: EdgeTTSService,
      useFactory: (engine: EdgeTTSEngine): EdgeTTSService => new EdgeTTSService(engine),
      inject: [TTS_ENGINE_TOKEN],
    },
  ],
  exports: [EdgeTTSService, TTS_ENGINE_TOKEN],
})
export class EdgeModule {}
