/**
 * 發音評估服務介面
 * 定義服務的契約，真實實作和 Mock 實作都需遵循此介面
 */
import type { AssessmentJobRequest, AssessmentJobResult } from './types/pronunciation.types'
/**
 * 發音評估服務介面
 */
export interface IPronunciationService {
  /**
   * 進行發音評估
   */
  assessPronunciation(request: AssessmentJobRequest): Promise<AssessmentJobResult>
  /**
   * 獲取評估結果狀態
   */
  getAssessmentStatus(jobId: string): Promise<AssessmentJobResult>
}
/**
 * 發音評估服務的 Token（用於依賴注入）
 */
export const PRONUNCIATION_SERVICE = Symbol('IPronunciationService')
