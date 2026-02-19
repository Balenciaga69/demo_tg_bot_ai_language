import type { Language } from '../../../shared/constants/language.constants'
/** 翻譯請求 DTO */
export interface TranslateRequest {
  originalText: string
  targetLanguage: Language
  sourceLanguage?: Language
}
/** 翻譯回應 DTO */
export interface TranslateResponse {
  translatedText: string
  success: boolean
  error?: string
}
/** Ollama API 回應 */
export interface OllamaApiResponse {
  model: string
  created_at: string
  response: string
  done: boolean
  done_reason: string
  context: number[]
  total_duration: number
  load_duration: number
  prompt_eval_count: number
  prompt_eval_duration: number
  eval_count: number
  eval_duration: number
}
