/**
 * Feature Logger - 優雅的日誌埋點系統
 * 職責：記錄功能使用的生命週期事件
 * 特點：業務邏輯零污染，所有埋點統一管理
 */
import { Injectable, Logger, Inject } from '@nestjs/common'
import { I_USAGE_LOG_STORE, type IUsageLogStore } from '../../../../user/stores/usage-log/usage-log.store'
export interface FeatureUsageEvent {
  userId: number
  feature: 'transcription' | 'pronunciation' | 'translation' | 'tts'
  pointCost: number
  timestamp: number
  parameters?: string
  status: 'started' | 'success' | 'failed'
  errorMessage?: string
}
@Injectable()
export class FeatureLogger {
  private readonly logger = new Logger('FeatureLogger')
  constructor(@Inject(I_USAGE_LOG_STORE) private usageLogStore: IUsageLogStore) {}
  /**
   * 記錄功能開始使用
   */
  recordStart(userId: number, feature: FeatureUsageEvent['feature'], pointCost: number): void {
    this.logger.log(`📍 [${feature}] User ${userId} started | Cost: ${pointCost}pts`)
  }
  /**
   * 記錄功能使用成功
   */
  async recordSuccess(
    userId: number,
    feature: FeatureUsageEvent['feature'],
    pointCost: number,
    parameters: string = ''
  ): Promise<void> {
    this.logger.log(`✅ [${feature}] User ${userId} completed | Cost: ${pointCost}pts`)
    // 記錄到 usage-log 存儲
    await this.usageLogStore.record({
      userId,
      pointsDeducted: pointCost,
      timestamp: Date.now(),
      status: 'success',
      parameters,
      feature,
    })
  }
  /**
   * 記錄功能使用失敗
   */
  async recordFailure(
    userId: number,
    feature: FeatureUsageEvent['feature'],
    pointCost: number,
    errorMessage: string,
    parameters: string = ''
  ): Promise<void> {
    this.logger.error(`❌ [${feature}] User ${userId} failed | Error: ${errorMessage}`)
    // 記錄到 usage-log 存儲
    await this.usageLogStore.record({
      userId,
      pointsDeducted: pointCost,
      timestamp: Date.now(),
      status: 'failed',
      parameters,
      feature,
    })
  }
  /**
   * 記錄點數扣除
   */
  recordPointsDeducted(userId: number, points: number): void {
    this.logger.debug(`💰 User ${userId} deducted ${points}pts`)
  }
  /**
   * 記錄點數退款
   */
  recordPointsRefunded(userId: number, points: number): void {
    this.logger.warn(`🔄 User ${userId} refunded ${points}pts`)
  }
  /**
   * 記錄點數不足
   */
  recordInsufficientPoints(userId: number, required: number, current: number): void {
    this.logger.warn(`⚠️  User ${userId} insufficient points | Required: ${required}, Current: ${current}`)
  }
}
