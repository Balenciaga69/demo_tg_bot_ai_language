/**
 * TTS 快取存儲層
 * 使用 Redis 管理快取，避免重複合成相同文字
 *
 * 快取策略：
 * - Key: hash(text) + voice
 * - Value: { filePath, fileSize, createdAt }
 * - TTL: 7 天
 */
import { Injectable, Logger } from '@nestjs/common'
import * as crypto from 'node:crypto'
/**
 * TTS 快取項目
 */
export interface TTSCacheEntry {
  filePath: string
  fileSize: number
  createdAt: Date
}
/**
 * TTS 快取存儲
 */
@Injectable()
export class TTSCacheStore {
  private readonly logger = new Logger(TTSCacheStore.name)
  /** 記憶體快取（開發用，生產應該用 Redis） */
  private readonly memoryCache = new Map<string, TTSCacheEntry>()
  /** 快取 TTL（7 天） */
  private readonly cacheTTL = 7 * 24 * 60 * 60 * 1000
  /**
   * 生成快取 Key
   */
  private generateCacheKey(text: string, voice: string): string {
    const hash = crypto.createHash('sha256').update(`${text}_${voice}`).digest('hex')
    return `tts_${hash}`
  }
  /**
   * 嘗試從快取取得
   */
  get(text: string, voice: string): TTSCacheEntry | undefined {
    const key = this.generateCacheKey(text, voice)
    const entry = this.memoryCache.get(key)
    if (!entry) {
      return undefined
    }
    // 檢查是否過期
    const now = Date.now()
    const age = now - entry.createdAt.getTime()
    if (age > this.cacheTTL) {
      this.memoryCache.delete(key)
      this.logger.debug(`[TTS 快取] 已過期刪除: ${key}`)
      return undefined
    }
    this.logger.debug(`[TTS 快取] 命中: ${key}`)
    return entry
  }
  /**
   * 存入快取
   */
  set(text: string, voice: string, entry: TTSCacheEntry): void {
    const key = this.generateCacheKey(text, voice)
    this.memoryCache.set(key, entry)
    this.logger.debug(`[TTS 快取] 已存入: ${key}`)
  }
  /**
   * 清除指定快取
   */
  delete(text: string, voice: string): void {
    const key = this.generateCacheKey(text, voice)
    this.memoryCache.delete(key)
    this.logger.debug(`[TTS 快取] 已刪除: ${key}`)
  }
  /**
   * 清除所有快取
   */
  clear(): void {
    this.memoryCache.clear()
    this.logger.debug('[TTS 快取] 已清除所有')
  }
  /**
   * 取得快取統計
   */
  getStats(): {
    totalCached: number
    totalSize: number
  } {
    let totalSize = 0
    for (const entry of this.memoryCache.values()) {
      totalSize += entry.fileSize
    }
    return {
      totalCached: this.memoryCache.size,
      totalSize,
    }
  }
}
