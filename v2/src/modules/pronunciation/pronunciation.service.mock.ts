/**
 * Mock 發音評估服務實作
 * 用於開發和測試，直接返回 Mock 結果
 */
import { Injectable, Logger } from '@nestjs/common'
import type { AssessmentJobRequest, AssessmentJobResult } from './types/pronunciation.types'
import { IPronunciationService } from './pronunciation.service.interface'
import { generateMockAssessmentResult } from './mocks/pronunciation-mock.data'
@Injectable()
export class MockPronunciationService implements IPronunciationService {
  private readonly logger = new Logger(MockPronunciationService.name)
  /**
   * 生成唯一的 Job ID
   */
  private generateJobId(userId: number): string {
    return `pronunciation_${userId}_${Date.now()}`
  }
  /**
   * 進行發音評估（Mock 版本）
   * 直接返回結果，不儲存到 Redis
   */
  assessPronunciation(request: AssessmentJobRequest): Promise<AssessmentJobResult> {
    const { userId, referenceText } = request
    const jobId = this.generateJobId(userId)
    this.logger.debug(`[Mock] Assessing pronunciation for user ${userId}`)
    this.logger.debug(`Reference text: "${referenceText}"`)
    // 生成 Mock 結果
    const result = generateMockAssessmentResult(referenceText)
    // 返回完整結果（立即完成）
    return Promise.resolve({
      jobId,
      status: 'completed',
      progress: 100,
      result,
    })
  }
  /**
   * 獲取評估結果狀態
   * Mock 版本：直接返回已完成的結果
   * 實際應用中，此方法會從 Redis/DB 查詢
   */
  getAssessmentStatus(jobId: string): Promise<AssessmentJobResult> {
    this.logger.debug(`[Mock] Getting assessment status for job ${jobId}`)
    // Mock：總是返回已完成的狀態
    return Promise.resolve({
      jobId,
      status: 'completed',
      progress: 100,
      result: {
        recognitionStatus: 'Success',
        recognizedText: 'Mock result - this would be fetched from storage in real implementation',
        accuracyScore: 85,
        fluencyScore: 80,
        completenessScore: 100,
        pronScore: 75,
        prosodyScore: 82,
        errorCount: 1,
        words: [],
      },
    })
  }
}
