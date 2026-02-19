/**
 * 清理 Ollama 回應
 * 1. 移除 <think>...</think> 標籤及其內容
 * 2. 移除額外的換行符和空白
 * 3. 返回乾淨的翻譯文本
 */
export function cleanOllamaResponse(response: string): string {
  // 1️⃣ 移除 <think>...</think> 標籤及其內容（支援多行，對應 DeepSeek 系列）
  let cleaned = response.replaceAll(/<think>[\s\S]*?<\/think>/g, '')
  // 2️⃣ 移除多餘的標籤，模型有時會模仿輸入格式返回 <text>... 或 Output: ...
  cleaned = cleaned.replaceAll(/<text>[\s\S]*?<\/text>/gi, (match) => match.replaceAll(/<\/?text>/gi, ''))
  cleaned = cleaned.replaceAll(/^(Output|Translation|Result|Final):\s*/gi, '')
  // 3️⃣ 移除多餘的換行符（連續的 \n\n 變成一個）
  cleaned = cleaned.replaceAll(/\n\n+/g, '\n')
  // 4️⃣ 去除開頭和結尾的空白
  return cleaned.trim()
}
