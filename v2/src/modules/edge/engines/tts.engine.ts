/**
 * TTS 引擎介面定義
 * 所有 TTS 實作都需遵循此介面
 */
import type { TTSSynthesizeResult, TTSRequest } from '../types/edge.types'
/**
 * TTS 引擎介面
 */
export interface ITTSEngine {
  /**
   * 合成語音
   * @param request TTS 請求資訊
   * @returns 合成結果
   */
  synthesize(request: TTSRequest): Promise<TTSSynthesizeResult>
}
/**
 * TTS 引擎的依賴注入 Token
 */
export const TTS_ENGINE_TOKEN = Symbol('ITTSEngine')
