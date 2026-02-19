/**
 * Azure 核心服務
 * 職責：
 * 1. 調用 Azure Speech SDK
 * 2. 委託 Helper 層進行計分和比對
 * 3. 返回格式化的結果
 */
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as sdk from 'microsoft-cognitiveservices-speech-sdk'
import { EnvironmentKey } from 'src/shared/environment-key'
import { matchingHelpers, responseHelpers, scoringHelpers, textHelpers } from './azure.helper'
import { AzureJsonResult } from './azure.type'
import type { AssessmentResult } from '../../types/pronunciation.types'
@Injectable()
export class AzureCoreService {
  private readonly logger = new Logger(AzureCoreService.name)
  private readonly azureKey: string
  private readonly azureEndpoint: string
  constructor(private readonly configService: ConfigService) {
    this.azureKey = this.configService.getOrThrow<string>(EnvironmentKey.AZURE_SPEECH_KEY)
    this.azureEndpoint = this.configService.getOrThrow<string>(EnvironmentKey.AZURE_SPEECH_ENDPOINT)
  }
  /**
   * 進行發音評估
   * 流程：驗證 → SDK 呼叫 → 結果解析 → Helper 計分 → 返回
   */
  async assess(fileBuffer: Buffer, referenceText: string, language = 'en-US'): Promise<AssessmentResult> {
    if (!this.azureKey || !this.azureEndpoint) {
      throw new Error('Azure Speech Key 或 Endpoint 未配置')
    }
    // 建立 Speech Config
    const speechConfig = sdk.SpeechConfig.fromEndpoint(new URL(this.azureEndpoint), this.azureKey)
    speechConfig.speechRecognitionLanguage = language
    // 建立 Audio Config
    const audioConfig = sdk.AudioConfig.fromWavFileInput(fileBuffer)
    // 建立識別器
    const recognizer = this.createRecognizer(speechConfig, audioConfig, referenceText)
    // 執行識別
    return this.runRecognition(recognizer, referenceText)
  }
  /**
   * 建立識別器並應用發音評估配置
   */
  private createRecognizer(
    speechConfig: sdk.SpeechConfig,
    audioConfig: sdk.AudioConfig,
    referenceText: string
  ): sdk.SpeechRecognizer {
    const pronConfig = new sdk.PronunciationAssessmentConfig(
      referenceText,
      sdk.PronunciationAssessmentGradingSystem.HundredMark,
      sdk.PronunciationAssessmentGranularity.Phoneme,
      true // enableMiscue
    )
    pronConfig.enableProsodyAssessment = true
    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig)
    pronConfig.applyTo(recognizer)
    return recognizer
  }
  /**
   * 執行識別並解析結果
   */
  private async runRecognition(recognizer: sdk.SpeechRecognizer, referenceText: string): Promise<AssessmentResult> {
    return new Promise((resolve, reject) => {
      recognizer.recognizeOnceAsync(
        (result) => {
          recognizer.close()
          if (result.reason === sdk.ResultReason.RecognizedSpeech) {
            try {
              const assessmentResult = this.parseRecognitionResult(result, referenceText)
              resolve(assessmentResult)
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error)
              this.logger.error(`解析結果失敗: ${errorMessage}`, error instanceof Error ? error.stack : undefined)
              reject(new Error(errorMessage))
            }
          } else if (result.reason === sdk.ResultReason.NoMatch) {
            reject(new Error('無法識別語音內容，請確保音頻清晰'))
          } else {
            const reason = sdk.ResultReason[result.reason] || 'Unknown'
            reject(new Error(`語音識別失敗: ${reason}`))
          }
        },
        (error: string) => {
          recognizer.close()
          reject(new Error(`Azure SDK 錯誤: ${error}`))
        }
      )
    })
  }
  /**
   * 解析 Azure 識別結果並計分
   * 這是核心邏輯調度點
   */
  private parseRecognitionResult(result: sdk.SpeechRecognitionResult, referenceText: string): AssessmentResult {
    this.logger.debug(`識別文本: ${result.text}`)
    // 1. 提取 JSON 結果
    const resultJson = result.properties.getProperty(sdk.PropertyId.SpeechServiceResponse_JsonResult)
    if (!resultJson) {
      throw new Error('無法獲取 Azure 評估結果')
    }
    const jo = JSON.parse(resultJson) as AzureJsonResult
    const nBest = jo.NBest?.[0]
    if (!nBest) {
      throw new Error('評估結果格式異常')
    }
    // 2. 使用 Helper: 文本預處理
    const { wholeLyricsArray, resultTextArray } = textHelpers.preprocessText(referenceText, result.text)
    // 3. 使用 Helper: 序列比對 (difflib)
    const allWords = nBest.Words
    const lastWords = matchingHelpers.getMatchedWords(wholeLyricsArray, resultTextArray, allWords)
    // 4. 使用 Helper: 計分邏輯
    const durations = allWords.map((w) => w.Duration)
    const scores = scoringHelpers.calculateAllScores(
      allWords,
      lastWords,
      [nBest.PronunciationAssessment.FluencyScore],
      durations,
      [nBest.PronunciationAssessment.ProsodyScore ?? 0],
      wholeLyricsArray.length
    )
    // 5. 計算最終發音分數
    const pronScore = scoringHelpers.calculateOverallPronScore(jo, scores)
    // 6. 使用 Helper: 格式化回應
    return responseHelpers.formatResponse(jo, result.text, {
      ...scores,
      pronScore,
      lastWords,
    })
  }
}
