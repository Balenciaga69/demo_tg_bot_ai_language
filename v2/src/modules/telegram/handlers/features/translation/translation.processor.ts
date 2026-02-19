import type { Context } from 'grammy'
import { AudioDownloader, AudioTranscriber } from '../shared'
import { FeatureLogger } from '../shared/feature-logger'
import { OllamaService } from '../../../../ollama/ollama.service'
import { addMessageReaction } from '../../../shared/helpers/message-reaction.helper'
import { TranslationPresenter } from './translation.presenter'
import type { IUserStateStore } from '../../../../user/stores/user-state/user-state.store'
import type { UserState } from '../../../../user/entities/user-state.type'
import type { IModeHandler } from '../shared/mode-handler.interface'
import { TelegramInputValidator } from '../shared/telegram-input-validator'
import { TELEGRAM_ERROR_MESSAGES } from '../shared/telegram-error-messages'
import { MODE_CONFIG } from '../../../shared/constants/mode.constants'
/**
 * 翻譯 - Feature Processor
 * 職責：
 * 1. 驗證輸入（接受文字或語音）
 * 2. 若是語音，先轉文字（調用 AudioTranscriber）
 * 3. 管理點數扣除與退款
 * 4. 委託 presenter 呈現結果
 */
export class TranslationProcessor implements IModeHandler {
  private presenter: TranslationPresenter
  private readonly pointCost = MODE_CONFIG.translate.pointCost
  constructor(
    private userStateStore: IUserStateStore,
    private audioTranscriber: AudioTranscriber,
    private ollamaService: OllamaService,
    private featureLogger: FeatureLogger
  ) {
    this.presenter = new TranslationPresenter()
  }
  /**
   * 處理翻譯模式輸入
   */
  async process(context: Context, userId: number): Promise<void> {
    // 取得用戶狀態
    const userState = await this.userStateStore.getById(userId)
    if (!userState) return
    // 文字翻譯路徑
    if (context.message?.text) {
      await this.handleTextTranslation(context, userId, userState)
      return
    }
    // 語音翻譯路徑
    if (context.message?.voice) {
      await this.handleVoiceTranslation(context, userId, userState)
      return
    }
    // 其他輸入類型
    await this.presenter.replyInvalidInput(context)
  }
  /**
   * 處理文字翻譯
   */
  private async handleTextTranslation(context: Context, userId: number, userState: UserState): Promise<void> {
    this.featureLogger.recordStart(userId, 'translation', this.pointCost)
    const validation = TelegramInputValidator.validateText(context.message!.text!, {
      min: 1,
      max: 1000,
    })
    if (!validation.isValid) {
      await context.reply(validation.error || TELEGRAM_ERROR_MESSAGES.INVALID_INPUT)
      return
    }
    // 扣點邏輯
    if (!(await this.deductPointsSafely(context, userId))) {
      return
    }
    const text = context.message!.text!
    await addMessageReaction(context)
    // 調用翻譯服務
    const result = await this.ollamaService.translate({
      originalText: text,
      targetLanguage: userState.targetLanguage,
      sourceLanguage: userState.nativeLanguage,
    })
    // 記錄結果
    if (result.success) {
      await this.featureLogger.recordSuccess(userId, 'translation', this.pointCost, text)
    } else {
      await this.userStateStore.refundPoints(userId, this.pointCost)
      this.featureLogger.recordPointsRefunded(userId, this.pointCost)
      await this.featureLogger.recordFailure(
        userId,
        'translation',
        this.pointCost,
        result.error ?? 'Unknown error',
        text
      )
    }
    await this.presenter.replyTextTranslation(context, text, result)
  }
  /**
   * 處理語音翻譯
   */
  private async handleVoiceTranslation(context: Context, userId: number, userState: UserState): Promise<void> {
    this.featureLogger.recordStart(userId, 'translation', this.pointCost)
    // 下載音訊
    const audioBuffer = await AudioDownloader.downloadAudioFile(context)
    if (!audioBuffer) {
      await this.presenter.replyDownloadFailed(context)
      return
    }
    // 扣點邏輯
    if (!(await this.deductPointsSafely(context, userId))) {
      return
    }
    await addMessageReaction(context)
    // 先轉文字
    const sttResult = await this.audioTranscriber.transcribe(audioBuffer, userState.nativeLanguage)
    if (!sttResult.success) {
      await this.userStateStore.refundPoints(userId, this.pointCost)
      this.featureLogger.recordPointsRefunded(userId, this.pointCost)
      await this.featureLogger.recordFailure(userId, 'translation', this.pointCost, 'STT failed', '')
      await this.presenter.replySTTError(context, sttResult.error ?? '未知錯誤')
      return
    }
    const text = sttResult.text!
    // 調用翻譯服務
    const result = await this.ollamaService.translate({
      originalText: text,
      targetLanguage: userState.targetLanguage,
      sourceLanguage: userState.nativeLanguage,
    })
    // 記錄結果
    if (result.success) {
      await this.featureLogger.recordSuccess(userId, 'translation', this.pointCost, text)
    } else {
      await this.userStateStore.refundPoints(userId, this.pointCost)
      this.featureLogger.recordPointsRefunded(userId, this.pointCost)
      await this.featureLogger.recordFailure(
        userId,
        'translation',
        this.pointCost,
        result.error ?? 'Unknown error',
        text
      )
    }
    await this.presenter.replyVoiceTranslation(context, text, result)
  }
  /**
   * 安全地扣除點數
   */
  private async deductPointsSafely(context: Context, userId: number): Promise<boolean> {
    try {
      await this.userStateStore.deductPoints(userId, this.pointCost)
      this.featureLogger.recordPointsDeducted(userId, this.pointCost)
      return true
    } catch {
      const userState = await this.userStateStore.getById(userId)
      this.featureLogger.recordInsufficientPoints(userId, this.pointCost, userState?.points ?? 0)
      await context.reply('⚠️ 點數不足，無法進行翻譯')
      return false
    }
  }
}
