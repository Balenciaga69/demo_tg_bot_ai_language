import type { FeatureMode } from '../../../user/entities/user-state.type'
/**
 * 功能模式配置
 */
export interface ModeConfig {
  name: string
  emoji: string
  description: string
  maxDuration: number // 秒
  pointCost: number
}
/**
 * 各模式的配置
 */
export const MODE_CONFIG: Record<Exclude<FeatureMode, 'idle'>, ModeConfig> = {
  stt: {
    name: 'STT 模式',
    emoji: '📝',
    description: '接下來所有語音都將被轉換為文字，每次將使用 1 point，至多可 55 秒',
    maxDuration: 55,
    pointCost: 1,
  },
  translate: {
    name: '母語轉外語',
    emoji: '🌍',
    description: '接下來所有語音或文字都將被轉換為外語，每次將使用 1 point，至多可 55 秒',
    maxDuration: 55,
    pointCost: 1,
  },
  pronunciation: {
    name: '發音評估',
    emoji: '🎤',
    description: '接下來所有文字將被視為要評估的內容，語音都將被評估發音，每次將使用 1 point，至多可 55 秒',
    maxDuration: 55,
    pointCost: 1,
  },
  tts: {
    name: 'TTS 模式',
    emoji: '🔊',
    description: '接下來所有文字都將被轉換為目標語言的語音，每次將使用 1 point，文字長度至多 1200 字',
    maxDuration: 0,
    pointCost: 1,
  },
}
/**
 * 模式相關訊息
 */
export const MODE_MESSAGES = {
  SWITCH_SUCCESS: (modeEmoji: string, modeName: string): string =>
    `${modeEmoji} ${modeName}\n\n您可回到主選單或切換到其他模式來結束`,
  ALREADY_IN_MODE: (modeName: string): string => `⚠️ 已在 ${modeName}`,
  IDLE_MODE_PROMPT: '🟢 空閒模式\n\n選擇功能開始',
  ERROR_INVALID_MODE_INPUT: (mode: string): string => {
    if (mode === 'stt') {
      return '⚠️ STT 模式只接受語音消息'
    }
    if (mode === 'translate') {
      return '⚠️ 翻譯模式接受語音或文字'
    }
    if (mode === 'pronunciation') {
      return '⚠️ 評估模式先輸入要評估的文字，再發送語音'
    }
    if (mode === 'tts') {
      return '⚠️ TTS 模式只接受文字消息'
    }
    return '⚠️ 輸入無效'
  },
}
