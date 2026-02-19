import { Inject, Injectable } from '@nestjs/common'
import { Redis } from 'ioredis'
import { REDIS_CLIENT } from '../../../shared/redis/redis.module'
import { RedisKeys } from '../../../shared/redis/redis.helper'
/**
 * 發音評估內容存儲
 * 職責：管理用戶在發音評估模式中輸入的要評估文字
 * 所屬模組：pronunciation
 */
@Injectable()
export class PronunciationAssessmentStore {
  constructor(@Inject(REDIS_CLIENT) private redis: Redis) {}
  /**
   * 存儲要評估的文字
   * @param userId 用戶 ID
   * @param content 要評估的文字內容
   */
  async setContent(userId: number, content: string): Promise<void> {
    const key = RedisKeys.pronunciationAssessmentContent(userId)
    await this.redis.set(key, content)
  }
  /**
   * 獲取要評估的文字
   * @param userId 用戶 ID
   * @returns 要評估的文字內容，或 undefined（若無）
   */
  async getContent(userId: number): Promise<string | undefined> {
    const key = RedisKeys.pronunciationAssessmentContent(userId)
    const content = await this.redis.get(key)
    return content ?? undefined
  }
  /**
   * 清空評估內容
   * @param userId 用戶 ID
   */
  async clearContent(userId: number): Promise<void> {
    const key = RedisKeys.pronunciationAssessmentContent(userId)
    await this.redis.del(key)
  }
  /**
   * 檢查是否有評估內容
   * @param userId 用戶 ID
   * @returns true 若有內容，false 若無
   */
  async hasContent(userId: number): Promise<boolean> {
    const key = RedisKeys.pronunciationAssessmentContent(userId)
    const exists = await this.redis.exists(key)
    return exists > 0
  }
}
