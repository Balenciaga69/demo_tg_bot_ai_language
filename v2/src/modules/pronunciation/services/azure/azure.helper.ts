/**
 * Azure 發音評估助手
 * 來源：老專案 app_papa_legba
 *
 * 職責：
 * - textHelpers: 文本規範化 + 預處理
 * - scoringHelpers: 計分邏輯（準確度、流暢度、韻律）← 核心
 * - matchingHelpers: 序列比對（省略/插入/替換察測）← 差異化關鍵
 * - responseHelpers: 結果格式化
 */
import * as difflib from 'difflib'
import * as _ from 'lodash'
import { AzureJsonResult, AzureWord, AzureWordWithErrorType } from './azure.type'
import type { PronunciationWord } from '../../types/pronunciation.types'
/**
 * 文本助手：規範化和預處理
 */
export const textHelpers = {
  /**
   * 規範化文本（小寫 + 移除特殊字符 + 合併空白）
   */
  normalizeText: (text: string): string => {
    return text
      .toLowerCase()
      .replaceAll(/[!"#$%&()*+,-./:;<=>?@[\\\]^_`{|}~]+/g, '')
      .replaceAll(/\s+/g, ' ')
  },
  /**
   * 預處理參考文本和結果文本，分割成單字陣列
   */
  preprocessText: (
    referenceText: string,
    resultText: string
  ): { wholeLyricsArray: string[]; resultTextArray: string[] } => {
    const resultTextProcessed = textHelpers.normalizeText(resultText)
    const wholeLyrics = textHelpers.normalizeText(referenceText)
    return {
      wholeLyricsArray: wholeLyrics.split(' ').filter((word) => !!word),
      resultTextArray: resultTextProcessed.split(' ').filter((word) => !!word),
    }
  },
}
/**
 * 計分助手：核心評分邏輯
 */
export const scoringHelpers = {
  /**
   * 計算完整度分數（0-100）
   * = 識別出的單字數 / 預期的單字總數 * 100
   */
  calculateCompleteness: (recognizedWords: AzureWord[], totalWords: number): number => {
    const correctCount = recognizedWords.filter((word) => word.PronunciationAssessment.AccuracyScore > 0).length
    return Math.min(100, Number(((correctCount / (totalWords || 1)) * 100).toFixed(0)))
  },
  /**
   * 計算準確度分數（0-100）
   * 排除插入，計算平均準確度
   */
  calculateAccuracy: (lastWords: AzureWordWithErrorType[]): number => {
    const accuracyScores = lastWords
      .filter((word) => word.PronunciationAssessment.ErrorType !== 'Insertion')
      .map((word) => Number(word.PronunciationAssessment.AccuracyScore ?? 0))
    return accuracyScores.length > 0 ? Number((_.sum(accuracyScores) / accuracyScores.length).toFixed(0)) : 0
  },
  /**
   * 計算流暢度分數（0-100）
   * 以時長加權的流暢度
   */
  calculateFluency: (fluencyScores: number[], durations: number[]): number => {
    const totalDuration = _.sum(durations)
    if (totalDuration <= 0) {
      return 0
    }
    const weightedSum = fluencyScores.reduce((sum, score, durationIndex) => sum + score * durations[durationIndex], 0)
    return Number((weightedSum / totalDuration).toFixed(0))
  },
  /**
   * 計算韻律分數（0-100）
   * 平均所有韻律分數
   */
  calculateProsody: (prosodyScores: number[]): number => {
    return prosodyScores.length > 0 ? Number((_.sum(prosodyScores) / prosodyScores.length).toFixed(0)) : 0
  },
  /**
   * 一次計算所有四個評分
   */
  calculateAllScores: (
    recognizedWords: AzureWord[],
    lastWords: AzureWordWithErrorType[],
    fluencyScores: number[],
    durations: number[],
    prosodyScores: number[],
    totalWords: number
  ): { accuracyScore: number; fluencyScore: number; completenessScore: number; prosodyScore: number } => {
    return {
      completenessScore: scoringHelpers.calculateCompleteness(recognizedWords, totalWords),
      accuracyScore: scoringHelpers.calculateAccuracy(lastWords),
      fluencyScore: scoringHelpers.calculateFluency(fluencyScores, durations),
      prosodyScore: scoringHelpers.calculateProsody(prosodyScores),
    }
  },
  /**
   * 計算最終發音總分
   * 動態權重：取四個分數中最低的做基礎，其他有限權重
   */
  calculateOverallPronScore: (
    jo: AzureJsonResult | undefined,
    scores: { accuracyScore: number; fluencyScore: number; completenessScore: number; prosodyScore: number }
  ): number => {
    const { accuracyScore, fluencyScore, completenessScore, prosodyScore } = scores
    const sortedScoreValues = [accuracyScore, fluencyScore, completenessScore, prosodyScore].toSorted((a, b) => a - b)
    if (jo?.RecognitionStatus === 'Success' || jo?.RecognitionStatus === 'Failed') {
      return Number(
        (
          sortedScoreValues[0] * 0.4 +
          sortedScoreValues[1] * 0.2 +
          sortedScoreValues[2] * 0.2 +
          sortedScoreValues[3] * 0.2
        ).toFixed(0)
      )
    }
    return Number((accuracyScore * 0.5 + fluencyScore * 0.5).toFixed(0))
  },
}
/**
 * 匹配助手：使用 difflib 進行序列比對
 * 核心：察測省略 (Omission)、插入 (Insertion)、替換 (Replace)
 */
export const matchingHelpers = {
  /**
   * 處理省略錯誤（使用者未說出的字）
   */
  handleOmission: (
    wholeLyricsArray: string[],
    lastWords: AzureWordWithErrorType[],
    startIndex: number,
    endIndex: number
  ): void => {
    for (let index = startIndex; index < endIndex; index++) {
      lastWords.push({
        Word: wholeLyricsArray[index],
        Duration: 0,
        Offset: 0,
        PronunciationAssessment: { AccuracyScore: 0, ErrorType: 'Omission' },
      })
    }
  },
  /**
   * 處理相等情況（完全匹配）
   */
  handleEqual: (
    allWords: AzureWord[],
    lastWords: AzureWordWithErrorType[],
    startIndex: number,
    endIndex: number
  ): void => {
    for (let index = startIndex; index < endIndex; index++) {
      const word = allWords[index]
      lastWords.push({
        ...word,
        PronunciationAssessment: {
          ...word.PronunciationAssessment,
          ErrorType: 'None',
        },
      })
    }
  },
  /**
   * 處理插入錯誤（多說的字）
   */
  handleInsertion: (
    allWords: AzureWord[],
    lastWords: AzureWordWithErrorType[],
    startIndex: number,
    endIndex: number
  ): void => {
    for (let index = startIndex; index < endIndex; index++) {
      const word = allWords?.[index]
      if (!word) {
        continue
      }
      const updatedWord: AzureWordWithErrorType = {
        ...word,
        PronunciationAssessment: {
          ...word.PronunciationAssessment,
          ErrorType: 'Insertion',
        },
      }
      lastWords.push(updatedWord)
    }
  },
  /**
   * 根據 difflib 的 opcode 處理比對結果
   * tag 可能值: 'insert', 'delete', 'replace', 'equal'
   */
  processOpcode: (
    tag: string,
    range: { index1: number; index2: number; index_J1: number; index_J2: number },
    wholeLyricsArray: string[],
    allWords: AzureWord[],
    lastWords: AzureWordWithErrorType[]
  ): void => {
    const { index1, index2, index_J1, index_J2 } = range
    if (tag === 'insert' || tag === 'replace') {
      matchingHelpers.handleInsertion(allWords, lastWords, index_J1, index_J2)
    }
    if (tag === 'delete' || tag === 'replace') {
      matchingHelpers.handleOmission(wholeLyricsArray, lastWords, index1, index2)
    }
    if (tag === 'equal') {
      matchingHelpers.handleEqual(allWords, lastWords, index_J1, index_J2)
    }
  },
  /**
   * 核心方法：使用 difflib 比對參考文本和識別結果
   * 返回帶錯誤類型標記的單字陣列
   */
  getMatchedWords: (
    wholeLyricsArray: string[],
    resultTextArray: string[],
    allWords: AzureWord[]
  ): AzureWordWithErrorType[] => {
    const diff = new difflib.SequenceMatcher(undefined as never, wholeLyricsArray, resultTextArray)
    const lastWords: AzureWordWithErrorType[] = []
    const opcodes = diff.getOpcodes()
    for (const [tag, index1, index2, index_J1, index_J2] of opcodes) {
      matchingHelpers.processOpcode(tag, { index1, index2, index_J1, index_J2 }, wholeLyricsArray, allWords, lastWords)
    }
    return lastWords
  },
}
/**
 * 回應助手：格式化最終結果
 */
export const responseHelpers = {
  /**
   * 格式化回應，轉換為 AssessmentResult
   */
  formatResponse: (
    jo: AzureJsonResult | undefined,
    resultText: string,
    data: {
      accuracyScore: number
      fluencyScore: number
      completenessScore: number
      pronScore: number
      prosodyScore: number
      lastWords: AzureWordWithErrorType[]
    }
  ): {
    recognitionStatus: 'Success' | 'Failed'
    recognizedText: string
    accuracyScore: number
    fluencyScore: number
    completenessScore: number
    pronScore: number
    prosodyScore: number
    errorCount: number
    words: PronunciationWord[]
  } => {
    const { accuracyScore, fluencyScore, completenessScore, pronScore, prosodyScore, lastWords } = data
    const recognitionStatus = jo?.RecognitionStatus === 'Success' ? 'Success' : 'Failed'
    return {
      recognitionStatus,
      recognizedText: resultText,
      accuracyScore,
      fluencyScore,
      completenessScore,
      pronScore,
      prosodyScore,
      errorCount: lastWords.filter((word) => word.PronunciationAssessment.ErrorType !== 'None').length,
      words: lastWords.map((word) => ({
        word: word.Word,
        accuracyScore: word.PronunciationAssessment.AccuracyScore || 0,
        errorType: word.PronunciationAssessment.ErrorType as 'None' | 'Omission' | 'Insertion',
      })),
    }
  },
}
