import type { Context } from 'grammy'
import { AudioDownloader } from '../shared/audio.downloader'
import { FeatureLogger } from '../shared/feature-logger'
import { addMessageReaction } from '../../../shared/helpers/message-reaction.helper'
import { PronunciationAssessmentStore } from '../../../../pronunciation'
import { PronunciationPresenter } from './pronunciation.presenter'
import type { IPronunciationService, AssessmentJobResult } from '../../../../../modules/pronunciation'
import type { IModeHandler } from '../shared/mode-handler.interface'
import { PRONUNCIATION_LIMITS } from '../../../../../modules/pronunciation/constants/pronunciation.constant'
import { TelegramInputValidator } from '../shared/telegram-input-validator'
import { TELEGRAM_ERROR_MESSAGES } from '../shared/telegram-error-messages'
import type { IUserStateStore } from '../../../../user/stores/user-state/user-state.store'
import type { UserState } from '../../../../user/entities/user-state.type'
import { MODE_CONFIG } from '../../../shared/constants/mode.constants'
import { getAzureLanguageCode } from '../../../../../modules/ollama/utils/language-mapper'
import type { EdgeTTSService } from '../../../../../modules/edge'
import { VoiceValidator } from '../../../../../modules/edge'
/**
 * 發音評估 - Feature Processor
 * 職責：
 * 1. 先輸入文字：存儲到 Redis
 * 2. 再輸入語音：進行評估（先驗證是否有文字）
 * 3. 委託 presenter 呈現結果，處理扣點邏輯
 * 不直接涉及 context.reply
 */
export class PronunciationProcessor implements IModeHandler {
  private presenter: PronunciationPresenter
  private readonly pointCost = MODE_CONFIG.pronunciation.pointCost
  constructor(
    private pronunciationAssessmentStore: PronunciationAssessmentStore,
    private pronunciationService: IPronunciationService,
    private userStateStore: IUserStateStore,
    private featureLogger: FeatureLogger,
    private edgeTTSService?: EdgeTTSService
  ) {
    this.presenter = new PronunciationPresenter()
  }
  /**
   * 處理發音評估模式輸入
   * @param context Bot context
   * @param userId 用戶 ID
   */
  async process(context: Context, userId: number): Promise<void> {
    // 文字輸入：存儲到 Redis
    if (context.message?.text) {
      await this.handleTextInput(context, userId)
      return
    }
    // 語音輸入：進行評估
    if (context.message?.voice) {
      await this.handleAudioInput(context, userId)
      return
    }
    // 其他輸入類型
    await this.presenter.replyInvalidInput(context)
  }
  /**
   * 處理文字輸入：驗證並存儲參考文字
   */
  private async handleTextInput(context: Context, userId: number): Promise<void> {
    const validation = TelegramInputValidator.validateText(context.message!.text!, {
      min: PRONUNCIATION_LIMITS.REFERENCE_TEXT_MIN_LENGTH,
      max: PRONUNCIATION_LIMITS.REFERENCE_TEXT_MAX_LENGTH,
    })
    if (!validation.isValid) {
      await context.reply(validation.error || TELEGRAM_ERROR_MESSAGES.INVALID_INPUT)
      return
    }
    const text = context.message!.text!.trim()
    await this.pronunciationAssessmentStore.setContent(userId, text)
    await this.presenter.replySaveContent(context, text)
  }
  /**
   * 處理語音輸入：進行發音評估
   */
  private async handleAudioInput(context: Context, userId: number): Promise<void> {
    // 記錄功能開始
    this.featureLogger.recordStart(userId, 'pronunciation', this.pointCost)
    // 獲取用戶狀態
    const userState = await this.userStateStore.getById(userId)
    if (!userState) return
    // 檢查是否有之前輸入的文字
    const assessmentContent = await this.pronunciationAssessmentStore.getContent(userId)
    if (!assessmentContent) {
      await this.presenter.replyMissingContent(context)
      return
    }
    // 扣點邏輯
    if (!(await this.deductPointsSafely(context, userId))) {
      return
    }
    // 下載音訊
    const audioBuffer = await AudioDownloader.downloadAudioFile(context)
    if (!audioBuffer) {
      await this.userStateStore.refundPoints(userId, this.pointCost)
      this.featureLogger.recordPointsRefunded(userId, this.pointCost)
      await this.presenter.replyDownloadFailed(context)
      return
    }
    // 進行評估
    await addMessageReaction(context)
    const assessmentResult = await this.pronunciationService.assessPronunciation({
      userId,
      referenceText: assessmentContent ?? '',
      audioBuffer,
      language: getAzureLanguageCode(userState.targetLanguage),
    })
    // 處理評估結果和 TTS 回應
    await this.handleAssessmentResult(context, userId, assessmentContent, assessmentResult, userState)
  }
  /**
   * 處理評估結果，可能包含 TTS 語音回應
   */
  private async handleAssessmentResult(
    context: Context,
    userId: number,
    assessmentContent: string,
    assessmentResult: AssessmentJobResult,
    userState: UserState
  ): Promise<void> {
    if (assessmentResult.status === 'failed') {
      await this.userStateStore.refundPoints(userId, this.pointCost)
      this.featureLogger.recordPointsRefunded(userId, this.pointCost)
      await this.featureLogger.recordFailure(
        userId,
        'pronunciation',
        this.pointCost,
        'Assessment failed',
        assessmentContent
      )
      await this.presenter.replyEvaluationResult(context, assessmentResult)
      return
    }
    await this.featureLogger.recordSuccess(userId, 'pronunciation', this.pointCost, assessmentContent)
    // 嘗試附帶 TTS 語音回應
    await this.replyWithOptionalVoice(context, assessmentContent, assessmentResult, userState)
  }
  /**
   * 呈現評估結果，可選附帶 TTS 語音示範
   * 根據用戶的目標語言自動選擇合適的聲音
   */
  private async replyWithOptionalVoice(
    context: Context,
    assessmentContent: string,
    assessmentResult: AssessmentJobResult,
    userState: UserState
  ): Promise<void> {
    if (!this.edgeTTSService || !assessmentContent) {
      await this.presenter.replyEvaluationResult(context, assessmentResult)
      return
    }
    try {
      // 根據用戶的目標語言自動選擇聲音
      const voice = VoiceValidator.getVoiceByLanguage(getAzureLanguageCode(userState.targetLanguage))
      const ttsResult = await this.edgeTTSService.synthesize(assessmentContent, voice)
      await this.presenter.replyEvaluationResultWithVoice(context, assessmentResult, ttsResult)
    } catch (error) {
      // TTS 失敗時，仍然呈現評估結果
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[TTS] 標準發音示範生成失敗: ${message}`)
      await this.presenter.replyEvaluationResult(context, assessmentResult)
    }
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
      await context.reply('⚠️ 點數不足，無法進行評估')
      return false
    }
  }
}
