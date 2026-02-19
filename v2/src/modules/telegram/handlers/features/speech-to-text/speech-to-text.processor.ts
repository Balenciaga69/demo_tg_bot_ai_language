import type { Context } from 'grammy'
import { SpeechToTextPresenter } from './speech-to-text.presenter'
import { AudioDownloader, AudioTranscriber } from '../shared'
import { FeatureLogger } from '../shared/feature-logger'
import { addMessageReaction } from '../../../shared/helpers/message-reaction.helper'
import type { IUserStateStore } from '../../../../user/stores/user-state/user-state.store'
import type { IModeHandler } from '../shared/mode-handler.interface'
import { MODE_CONFIG } from '../../../shared/constants/mode.constants'
/**
 * 語音轉文字（STT）- Feature Processor
 * 職責：
 * 1. 驗證輸入（只接受語音）
 * 2. 管理點數扣除與退款
 * 3. 調用共用邏輯層（音頻轉錄）
 * 4. 委託 presenter 呈現結果
 */
export class SpeechToTextProcessorFeature implements IModeHandler {
  private presenter: SpeechToTextPresenter
  private readonly pointCost = MODE_CONFIG.stt.pointCost
  constructor(
    private userStateStore: IUserStateStore,
    private audioTranscriber: AudioTranscriber,
    private featureLogger: FeatureLogger
  ) {
    this.presenter = new SpeechToTextPresenter()
  }
  /**
   * 處理 STT 模式輸入
   * @param context Bot context
   * @param userId 用戶 ID
   */
  async process(context: Context, userId: number): Promise<void> {
    this.featureLogger.recordStart(userId, 'transcription', this.pointCost)
    // 取得用戶狀態
    const userState = await this.userStateStore.getById(userId)
    if (!userState) return
    // 驗證語音輸入
    const inputValidation = await this.validateVoiceInput(context)
    if (!inputValidation.isValid) return
    // 提取音頻
    const audioBuffer = inputValidation.audioBuffer
    if (!audioBuffer) return
    // 扣點邏輯（先扣，失敗退還）
    try {
      await this.userStateStore.deductPoints(userId, this.pointCost)
      this.featureLogger.recordPointsDeducted(userId, this.pointCost)
    } catch {
      // 點數不足
      const userStateError = await this.userStateStore.getById(userId)
      this.featureLogger.recordInsufficientPoints(userId, this.pointCost, userStateError?.points ?? 0)
      await context.reply('⚠️ 點數不足，無法進行轉錄')
      return
    }
    // 添加反應表情表示正在處理
    await addMessageReaction(context)
    // 執行轉錄
    const result = await this.audioTranscriber.transcribe(audioBuffer, userState.nativeLanguage)
    // 記錄結果
    if (result.success) {
      await this.featureLogger.recordSuccess(userId, 'transcription', this.pointCost, result.text ?? '')
    } else {
      await this.userStateStore.refundPoints(userId, this.pointCost)
      this.featureLogger.recordPointsRefunded(userId, this.pointCost)
      await this.featureLogger.recordFailure(
        userId,
        'transcription',
        this.pointCost,
        result.error ?? 'Unknown error',
        '[Transcription failed]'
      )
    }
    // 呈現結果
    await this.presenter.replyResult(context, result)
  }
  /**
   * 驗證語音輸入並提取音頻
   * @returns 驗證結果 { isValid, audioBuffer }
   */
  private async validateVoiceInput(context: Context): Promise<{ isValid: boolean; audioBuffer: Buffer | undefined }> {
    // 檢查是否為語音訊息
    if (!context.message?.voice) {
      // 如果是其他類型的訊息，回覆無效輸入
      const message = context.message as Record<string, unknown> | undefined
      if (message?.text || message?.photo || message?.document) {
        await this.presenter.replyInvalidInput(context)
      }
      return { isValid: false, audioBuffer: undefined }
    }
    // 下載音頻
    const audioBuffer = await AudioDownloader.downloadAudioFile(context)
    if (!audioBuffer) {
      await this.presenter.replyDownloadFailed(context)
      return { isValid: false, audioBuffer: undefined }
    }
    return { isValid: true, audioBuffer }
  }
}
