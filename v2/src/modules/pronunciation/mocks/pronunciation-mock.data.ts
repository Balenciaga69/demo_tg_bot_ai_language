/**
 * Mock 發音評估數據生成工厂
 *
 * 策略：
 * 1. 根據參考文字，生成「不完美」的識別結果（脫字/多字/錯字）
 * 2. 根據識別結果和參考文字的差異程度，計算各項評分
 * 3. 所有分數邏輯一致：準確度低 → 其他分數也低
 */
/* eslint-disable sonarjs/pseudo-random */
import type { AssessmentResult, PronunciationWord } from '../types/pronunciation.types'
/**
 * 生成 Mock 識別文字
 * 模擬 Whisper 識別的結果（可能有脫字、多字、替換）
 *
 * 規則：
 * - 每個單字有 60-90% 的概率被正確識別
 * - 15% 概率脫字（Omission）
 * - 10% 概率多識別（Insertion）
 * - 15% 概率識別錯誤（替換）
 */
function generateMockRecognizedText(referenceText: string): {
  recognizedText: string
  words: Array<{ original: string; recognized: string; errorType: 'None' | 'Omission' | 'Insertion' }>
} {
  const words = referenceText.split(' ')
  const result: Array<{ original: string; recognized: string; errorType: 'None' | 'Omission' | 'Insertion' }> = []
  const recognizedWords: string[] = []
  for (const word of words) {
    const rand = Math.random()
    if (rand < 0.65) {
      // 65% 正確
      result.push({ original: word, recognized: word, errorType: 'None' })
      recognizedWords.push(word)
    } else if (rand < 0.75) {
      // 10% 脫字
      result.push({ original: word, recognized: '', errorType: 'Omission' })
      // 不加入識別結果
    } else if (rand < 0.85) {
      // 10% 多字（在某個位置插入一個隨機單字）
      result.push({ original: word, recognized: word, errorType: 'None' })
      recognizedWords.push(word)
      // 隨機插入一個單字
      const randomWord = generateRandomWord()
      recognizedWords.push(randomWord)
    } else {
      // 15% 替換（識別成其他單字）
      const wrongWord = generateWrongWord(word)
      result.push({ original: word, recognized: wrongWord, errorType: 'None' })
      recognizedWords.push(wrongWord)
    }
  }
  return {
    recognizedText: recognizedWords.join(' '),
    words: result,
  }
}
/**
 * 生成隨機單字（用於 Insertion）
 */
function generateRandomWord(): string {
  const words = ['the', 'and', 'a', 'is', 'to', 'in', 'of', 'for', 'with', 'at']
  return words[Math.floor(Math.random() * words.length)]
}
/**
 * 生成錯誤單字（用於替換）
 */
function generateWrongWord(original: string): string {
  // 簡單實現：改動一個字母
  if (original.length === 0) return 'x'
  const chars = [...original]
  const randomIndex = Math.floor(Math.random() * chars.length)
  chars[randomIndex] = String.fromCodePoint(97 + Math.floor(Math.random() * 26)) // a-z
  return chars.join('')
}
/**
 * 計算準確度分数
 * 基於識別文字與參考文字的相似度（簡化版：單字匹配率）
 */
function calculateAccuracyScore(referenceWords: string[], recognizedWords: string[]): number {
  if (referenceWords.length === 0) return 100
  // 簡單的相似度計算：正確的單字數 / 總數
  let correctCount = 0
  const minLength = Math.min(referenceWords.length, recognizedWords.length)
  for (let index = 0; index < minLength; index++) {
    if (referenceWords[index] === recognizedWords[index]) {
      correctCount += 1
    }
  }
  // 考慮長度差異
  const lengthFactor = recognizedWords.length / referenceWords.length
  const accuracyRatio = correctCount / referenceWords.length
  const adjustedAccuracy = accuracyRatio * Math.min(lengthFactor, 1)
  return Math.max(30, Math.round(adjustedAccuracy * 100))
}
/**
 * 計算其他評分（流暢度、發音、韻律）
 * 規則：準確度越低，其他分數也越低（但有波動）
 */
function calculateDependentScores(accuracyScore: number): {
  fluencyScore: number
  pronScore: number
  prosodyScore: number
} {
  // 作為基礎分數（略低於準確度）
  const baseScore = Math.max(30, accuracyScore - 15)
  // 加上隨機波動（±10-20）
  const fluencyScore = Math.min(100, Math.max(30, baseScore + (Math.random() * 20 - 10)))
  const pronScore = Math.min(100, Math.max(30, baseScore - 10 + (Math.random() * 15 - 7)))
  const prosodyScore = Math.min(100, Math.max(30, baseScore + (Math.random() * 20 - 10)))
  return {
    fluencyScore: Math.round(fluencyScore),
    pronScore: Math.round(pronScore),
    prosodyScore: Math.round(prosodyScore),
  }
}
/**
 * 生成逐字評估結果
 */
function generateWordsAssessment(words: PronunciationWord[]): PronunciationWord[] {
  return words.map((word) => ({
    ...word,
    // 如果有錯誤，準確度為 0；否則隨機 70-100
    accuracyScore: word.errorType === 'None' ? Math.round(70 + Math.random() * 30) : 0,
  }))
}
/**
 * 計算錯誤單字數量
 */
function calculateErrorCount(words: PronunciationWord[]): number {
  return words.filter((w) => w.errorType !== 'None').length
}
/**
 * 主函數：生成完整的 Mock 評估結果
 */
export function generateMockAssessmentResult(referenceText: string): AssessmentResult {
  const referenceWords = referenceText.split(' ')
  // 1️⃣ 生成識別結果
  const { recognizedText, words: wordInfos } = generateMockRecognizedText(referenceText)
  const recognizedWords = recognizedText.split(' ')
  // 2️⃣ 計算準確度
  const accuracyScore = calculateAccuracyScore(referenceWords, recognizedWords)
  // 3️⃣ 計算相關分數
  const { fluencyScore, pronScore, prosodyScore } = calculateDependentScores(accuracyScore)
  // 4️⃣ 生成逐字評估
  const pronunciationWords: PronunciationWord[] = generateWordsAssessment(
    recognizedWords.map((word) => ({
      word,
      accuracyScore: 0,
      errorType: wordInfos.some((w) => w.recognized === word && w.original !== word) ? 'Insertion' : ('None' as const),
    }))
  )
  // 5️⃣ 計算錯誤數
  const errorCount = calculateErrorCount(pronunciationWords)
  return {
    recognitionStatus: 'Success',
    recognizedText,
    accuracyScore,
    fluencyScore,
    completenessScore: 100, // Mock 總是完整
    pronScore,
    prosodyScore,
    errorCount,
    words: pronunciationWords,
  }
}
