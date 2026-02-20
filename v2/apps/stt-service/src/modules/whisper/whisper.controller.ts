import { Controller } from '@nestjs/common'
import { MessagePattern, Payload } from '@nestjs/microservices'
import { STT_PATTERNS } from '@shared/contracts'
import type { TranscribeRequest, TranscribeResponse } from '@shared/contracts'
import { WhisperService } from './whisper.service'
/**
 * STT 微服務控制器 - 接收 Redis 消息並呼叫 WhisperService
 */
@Controller()
export class WhisperController {
  constructor(private readonly whisperService: WhisperService) {}
  /**
   * 處理轉錄請求
   * MessagePattern: { cmd: 'stt.transcribe' }
   */
  @MessagePattern(STT_PATTERNS.TRANSCRIBE)
  async transcribe(@Payload() data: TranscribeRequest): Promise<TranscribeResponse> {
    const buffer = Buffer.from(data.audioBase64, 'base64')
    return this.whisperService.transcribe(data.language, buffer)
  }
}
