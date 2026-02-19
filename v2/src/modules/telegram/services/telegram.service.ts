import { conversations } from '@grammyjs/conversations'
import { limit } from '@grammyjs/ratelimiter'
import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Bot } from 'grammy'
import { EnvironmentKey, TelegramConnectMode } from 'src/shared/environment-key'
import { FileService } from 'src/shared/file/file.service'
import { EdgeTTSService } from '../../edge'
import { OllamaService } from '../../ollama/ollama.service'
import { PRONUNCIATION_SERVICE, PronunciationAssessmentStore, type IPronunciationService } from '../../pronunciation'
import {
  I_REGISTRATION_REQUEST_STORE,
  type IRegistrationRequestStore,
} from '../../user/stores/registration/registration.store'
import { I_USAGE_LOG_STORE, type IUsageLogStore } from '../../user/stores/usage-log/usage-log.store'
import { I_USER_STATE_STORE, type IUserStateStore } from '../../user/stores/user-state/user-state.store'
import { WhisperService } from '../../whisper/whisper.service'
import { PronunciationProcessor } from '../handlers/features/pronunciation/pronunciation.processor'
import { AudioTranscriber, FeatureLogger, FeatureModeRouter } from '../handlers/features/shared'
import { SpeechToTextProcessorFeature } from '../handlers/features/speech-to-text/speech-to-text.processor'
import { TTSProcessor } from '../handlers/features/text-to-speech/tts.processor'
import { TranslationProcessor } from '../handlers/features/translation/translation.processor'
import { registerAllHandlers } from '../handlers/registry'
import type { BotContext, ConversationContext, MyBot } from '../shared/types/bot.types'
@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private _bot: MyBot | undefined = undefined
  private _connectMode: TelegramConnectMode | undefined = undefined
  private readonly _logger = new Logger(TelegramService.name)
  constructor(
    private configService: ConfigService,
    private fileService: FileService,
    private whisperService: WhisperService,
    private ollamaService: OllamaService,
    private edgeTTSService: EdgeTTSService,
    @Inject(I_USER_STATE_STORE) private userStateStore: IUserStateStore,
    @Inject(I_REGISTRATION_REQUEST_STORE) private registrationRequestStore: IRegistrationRequestStore,
    @Inject(PRONUNCIATION_SERVICE) private pronunciationService: IPronunciationService,
    @Inject(I_USAGE_LOG_STORE) private usageLogStore: IUsageLogStore,
    private pronunciationAssessmentStore: PronunciationAssessmentStore,
    private featureLogger: FeatureLogger
  ) {
    this._connectMode = this.configService.getOrThrow<TelegramConnectMode>(EnvironmentKey.TELEGRAM_CONNECT_MODE)
    const botToken = this.configService.getOrThrow<string>(EnvironmentKey.TELEGRAM_BOT_TOKEN)
    this._bot = new Bot(botToken)
    if (!this._bot) throw new Error('Failed to initialize Telegram Bot')
  }
  //#region 生命週期
  /** 當模組初始化時 */
  onModuleInit(): void {
    this.botUseThrottle()
    this.botUseConversations()
    this.registerCommands()
    this.botUseFeatureModeHandler()
    if (this._connectMode === 'long-polling') {
      this._bot!.start().catch((error) => this._logger.error('Error starting bot:', error)) // onModuleInit() 測試用 long-polling
    }
  }
  /** 當模組銷毀時 */
  onModuleDestroy(): void {
    if (this._connectMode === 'long-polling') {
      this._bot!.stop().catch((error) => this._logger.error('Error stopping bot:', error)) // onModuleDestroy()
    }
  }
  //#endregion
  //#region private methods
  /** bot 限制流量 */
  private botUseThrottle(): void {
    this._bot!.use(
      limit({
        timeFrame: 1000, // 1 second
        limit: 1, // 1 request per second
        keyGenerator: (context) => context.from?.id.toString(), // by user ID
      })
    )
  }
  /** 初始化 conversations 插件 */
  private botUseConversations(): void {
    this._bot!.use(conversations<BotContext, ConversationContext>())
  }
  /** 設置全局 message 中間件 - 根據用戶的 mode 路由輸入 */
  private botUseFeatureModeHandler(): void {
    // 創建共用的音頻轉錄器
    const audioTranscriber = new AudioTranscriber(this.whisperService)
    // 創建各個 feature 的 processor
    const speechToTextProcessor = new SpeechToTextProcessorFeature(
      this.userStateStore,
      audioTranscriber,
      this.featureLogger
    )
    const translationProcessor = new TranslationProcessor(
      this.userStateStore,
      audioTranscriber,
      this.ollamaService,
      this.featureLogger
    )
    const pronunciationProcessor = new PronunciationProcessor(
      this.pronunciationAssessmentStore,
      this.pronunciationService,
      this.userStateStore,
      this.featureLogger,
      this.edgeTTSService
    )
    // 創建 TTS Processor
    const ttsProcessor = new TTSProcessor(this.userStateStore, this.edgeTTSService, this.featureLogger)
    // 創建路由器
    const featureModeRouter = new FeatureModeRouter(
      speechToTextProcessor,
      translationProcessor,
      pronunciationProcessor,
      ttsProcessor
    )
    // 監聽所有 message 事件，如果用戶在活躍模式則路由
    this._bot!.on('message', async (context) => {
      const userId = context.from?.id
      if (!userId) return
      const userState = await this.userStateStore.getById(userId)
      if (!userState || userState.mode === 'idle') return
      // 路由到對應的模式處理器
      await featureModeRouter.route(context, userState.mode, userId)
    })
  }
  /** 註冊指令群 */
  private registerCommands(): void {
    // 使用統一的註冊函數註冊所有 handlers
    registerAllHandlers(
      this._bot!,
      this.userStateStore,
      this.registrationRequestStore,
      this.whisperService,
      this.ollamaService,
      this.pronunciationAssessmentStore
    )
    // 全局錯誤捕捉
    this._bot!.catch((error) => {
      this._logger.error('Telegram Bot Error:', error.message)
    })
  }
  //#endregion
  //#region public getters
  /** 獲得 Bot 實例（供其他服務使用） */
  getBot(): MyBot {
    if (!this._bot) throw new Error('Bot is not initialized')
    return this._bot
  }
  //#endregion
}
