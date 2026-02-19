import { Module } from '@nestjs/common'
import { FfmpegService } from './ffmpeg.service'
/**
 * FFmpeg 模組
 *
 * 提供音訊轉檔功能：
 * - OGG/Opus → WAV (16kHz, 16-bit PCM, Mono)
 * - 驗證音訊檔案規格
 *
 * 當前為同步處理，後續可升級至 BullMQ 隊列處理
 */
@Module({
  providers: [FfmpegService],
  exports: [FfmpegService],
})
export class FfmpegModule {}
