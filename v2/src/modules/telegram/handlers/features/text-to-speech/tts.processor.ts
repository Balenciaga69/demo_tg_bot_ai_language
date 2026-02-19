import type { Context } from 'grammy'
import { InputFile } from 'grammy'
import { TTSPresenter } from './tts.presenter'
import { FeatureLogger } from '../shared/feature-logger'
import { addMessageReaction } from '../../../shared/helpers/message-reaction.helper'
import type { IUserStateStore } from '../../../../user/stores/user-state/user-state.store'
import type { IModeHandler } from '../shared/mode-handler.interface'
import { TelegramInputValidator } from '../shared/telegram-input-validator'
import { VoiceValidator, type EdgeTTSService } from '../../../../edge'
import { getAzureLanguageCode } from 'src/modules/ollama/utils/language-mapper'
/**
 * 文字轉語音（TTS）- Feature Processor
 * 職責：
 * 1. 驗證輸入（只接受文字）
 * 2. 管理點數扣除與退款
 * 3. 調用 EdgeTTSService 合成語音
 * 4. 委託 presenter 呈現結果
 */
export class TTSProcessor implements IModeHandler {
  private presenter: TTSPresenter
  private readonly pointCost = 1
  private readonly textMaxLength = 1200
  constructor(
    private userStateStore: IUserStateStore,
    private edgeTTSService: EdgeTTSService,
    private featureLogger: FeatureLogger
  ) {
    this.presenter = new TTSPresenter()
  }
  /**
   * 處理 TTS 模式輸入
   * @param context Bot context
   * @param userId 用戶 ID
   */
  async process(context: Context, userId: number): Promise<void> {
    // 文字輸入：進行 TTS 合成
    if (context.message?.text) {
      await this.handleTextInput(context, userId)
      return
    }
    // 其他輸入類型
    await this.presenter.replyInvalidInput(context)
  }
  /**
   * 處理文字輸入：驗證並合成語音
   */
  private async handleTextInput(context: Context, userId: number): Promise<void> {
    // 記錄功能開始
    this.featureLogger.recordStart(userId, 'tts', this.pointCost)
    // 驗證文字輸入
    const text = context.message!.text!
    const validation = TelegramInputValidator.validateText(text, {
      min: 1,
      max: this.textMaxLength,
    })
    if (!validation.isValid) {
      await this.handleValidationError(context, text, validation.error)
      return
    }
    // 扣點邏輯
    if (!(await this.deductPointsSafely(context, userId))) {
      return
    }
    // 執行 TTS 合成
    await this.executeTTSSynthesis(context, userId, text.trim())
  }
  /**
   * 處理驗證錯誤
   */
  private async handleValidationError(context: Context, text: string, errorMessage?: string): Promise<void> {
    if (text.trim().length === 0) {
      await this.presenter.replyTextEmpty(context)
    } else if (text.length > this.textMaxLength) {
      await this.presenter.replyTextTooLong(context, text.length, this.textMaxLength)
    } else {
      await context.reply(errorMessage || '⚠️ 輸入無效')
    }
  }
  /**
   * 執行 TTS 合成
   */
  private async executeTTSSynthesis(context: Context, userId: number, text: string): Promise<void> {
    // 取得用戶狀態
    const userState = await this.userStateStore.getById(userId)
    if (!userState) {
      await this.userStateStore.refundPoints(userId, this.pointCost)
      this.featureLogger.recordPointsRefunded(userId, this.pointCost)
      return
    }
    // 添加反應表情表示正在處理
    await addMessageReaction(context)
    try {
      // 調用 EdgeTTSService 合成語音
      // 根據用戶的目標語言自動選擇聲音
      const voice = VoiceValidator.getVoiceByLanguage(getAzureLanguageCode(userState.targetLanguage))
      const ttsResult = await this.edgeTTSService.synthesizeWithLanguage(text, voice)
      // 發送語音檔案
      const audioFile = new InputFile(ttsResult.buffer, `tts_${Date.now()}.mp3`)
      await this.presenter.replyTTSSuccess(context, audioFile, text, userState.targetLanguage)
      // 記錄成功
      await this.featureLogger.recordSuccess(userId, 'tts', this.pointCost, text)
    } catch (error) {
      // 合成失敗，退款
      await this.userStateStore.refundPoints(userId, this.pointCost)
      this.featureLogger.recordPointsRefunded(userId, this.pointCost)
      const errorMessage = error instanceof Error ? error.message : '未知錯誤'
      await this.featureLogger.recordFailure(userId, 'tts', this.pointCost, errorMessage, text)
      await this.presenter.replyTTSFailed(context, errorMessage)
    }
  }
  /**
   * 安全扣點
   * @returns 是否扣點成功
   */
  private async deductPointsSafely(context: Context, userId: number): Promise<boolean> {
    try {
      await this.userStateStore.deductPoints(userId, this.pointCost)
      this.featureLogger.recordPointsDeducted(userId, this.pointCost)
      return true
    } catch {
      // 點數不足
      const userState = await this.userStateStore.getById(userId)
      this.featureLogger.recordInsufficientPoints(userId, this.pointCost, userState?.points ?? 0)
      await context.reply('⚠️ 點數不足，無法進行 TTS 合成')
      return false
    }
  }
}
