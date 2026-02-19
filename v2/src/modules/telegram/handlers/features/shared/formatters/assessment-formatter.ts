import type { AssessmentResult } from '../../../../../pronunciation'
/**
 * 發音評估格式化工具
 * 職責：純粹的數據格式化邏輯，不涉及 UI 呈現
 */
/**
 * 評分顏色映射
 */
function getScoreColor(score: number): string {
  if (score >= 80) return '🟢'
  if (score >= 60) return '🟡'
  return '🔴'
}
/**
 * 獲取錯誤指示符
 */
function getErrorIndicator(errorType: string): string {
  if (errorType === 'None') return '✓'
  if (errorType === 'Omission') return '✗'
  return '↑'
}
/**
 * 生成逐字分析文本
 */
function generateWordAnalysisText(words: AssessmentResult['words']): string {
  const wordLines = words.map((w) => {
    const errorIndicator = getErrorIndicator(w.errorType)
    return `"${w.word}" (${w.accuracyScore}) ${errorIndicator}`
  })
  return wordLines.join('\n')
}
/**
 * 生成整體分數文本
 */
function generateOverallScoresText(result: AssessmentResult): string {
  const lines = [
    `${getScoreColor(result.accuracyScore)} 準確度：${result.accuracyScore}`,
    `${getScoreColor(result.fluencyScore)} 流暢度：${result.fluencyScore}`,
    `${getScoreColor(result.completenessScore)} 完整度：${result.completenessScore}`,
    `${getScoreColor(result.pronScore)} 發音：${result.pronScore}`,
    `${getScoreColor(result.prosodyScore)} 韻律：${result.prosodyScore}`,
  ]
  return lines.join('\n')
}
/**
 * 格式化評估結果訊息
 */
function formatEvaluationMessage(result: AssessmentResult): string {
  const overallScoresText = generateOverallScoresText(result)
  const wordAnalysisText = generateWordAnalysisText(result.words)
  return `
🎤 **發音評估結果**
📝 識別文本：
"${result.recognizedText}"
📊 整體分析
${overallScoresText}
❌ 錯誤數：${result.errorCount}
📋 逐字分析
${wordAnalysisText}
`.trim()
}
/**
 * 導出格式化工具
 */
export const AssessmentFormatter = {
  getScoreColor,
  getErrorIndicator,
  generateWordAnalysisText,
  generateOverallScoresText,
  formatEvaluationMessage,
}
