import { Injectable, Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices'
import { Bot } from 'grammy'
import { limit } from '@grammyjs/ratelimiter'
import { firstValueFrom } from 'rxjs'
import { STT_PATTERNS, STT_SERVICE_TOKEN } from '@shared/contracts'
import type { TranscribeRequest, TranscribeResponse } from '@shared/contracts'
/**
 * Telegram Bot 服務 - API Gateway 入口
 * 透過 Redis 消息佇列呼叫 stt-service 進行語音轉錄
 */
@Injectable()
export class TelegramBotService implements OnModuleInit, OnModuleDestroy {
  constructor(
    @Inject(Bot) private readonly bot: Bot,
    @Inject(STT_SERVICE_TOKEN) private readonly sttClient: ClientProxy
  ) {}
  /** 模組啟動時註冊指令、語音處理器、套用中介並啟動 Bot */
  async onModuleInit(): Promise<void> {
    this.registerCommands()
    this.registerVoiceHandler()
    this.applyThrottleMiddleware()
    await this.bot.start()
  }
  /** 模組銷毀時停止 Bot */
  async onModuleDestroy(): Promise<void> {
    await this.bot.stop()
  }
  /** 套用速率限制中介層 */
  private applyThrottleMiddleware(): void {
    this.bot.use(
      limit({
        timeFrame: 1000,
        limit: 1,
        keyGenerator: (context) => context.from?.id?.toString() ?? 'anonymous',
      })
    )
  }
  /** 註冊 Bot 指令 */
  private registerCommands(): void {
    this.bot.command('start', (context) => {
      void context.reply('歡迎使用語音學習 Bot！\n請傳送語音訊息，我將幫您進行語音轉文字 🎙️')
    })
  }
  /**
   * 處理語音/音訊訊息
   * 下載音訊 → base64 編碼 → 發送至 stt-service (Redis) → 回覆轉錄結果
   */
  private registerVoiceHandler(): void {
    this.bot.on(['message:voice', 'message:audio'], async (context) => {
      const fileId = context.message.voice?.file_id ?? context.message.audio?.file_id
      if (!fileId) return
      await context.reply('⏳ 正在處理語音，請稍候...')
      try {
        // 1️⃣ 下載音訊檔案
        const file = await context.getFile()
        const fileUrl = `https://api.telegram.org/file/bot${this.bot.token}/${file.file_path}`
        const response = await fetch(fileUrl)
        const audioBase64 = Buffer.from(await response.arrayBuffer()).toString('base64')
        // 2️⃣ 呼叫 stt-service 微服務 (透過 Redis)
        const result = await firstValueFrom(
          this.sttClient.send<TranscribeResponse, TranscribeRequest>(STT_PATTERNS.TRANSCRIBE, {
            language: 'zh',
            audioBase64,
          })
        )
        // 3️⃣ 回覆轉錄結果
        await context.reply(
          result.success && result.text ? `📝 轉錄結果：\n${result.text}` : `❌ 轉錄失敗：${result.error ?? '未知錯誤'}`
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : '未知錯誤'
        await context.reply(`❌ 處理失敗：${message}`)
      }
    })
  }
}
