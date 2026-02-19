import { Injectable, Inject } from '@nestjs/common'
import { Redis } from 'ioredis'
import { REDIS_CLIENT } from '../../../../shared/redis/redis.module'
import { RedisKeys } from '../../../../shared/redis/redis.helper'
import { RedisSerializer } from '../../../../shared/redis/redis.serializer'
import { IUsageLogStore, type UserUsageLog } from './usage-log.store'
import { v4 as uuid } from 'uuid'
/**
 * Redis 實現的使用紀錄存儲
 */
@Injectable()
export class RedisUsageLogStore implements IUsageLogStore {
  /** 使用紀錄保留天數 */
  private readonly RETENTION_DAYS = 90
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}
  async record(logData: Omit<UserUsageLog, 'id'>): Promise<void> {
    const log: UserUsageLog = {
      id: uuid(),
      ...logData,
    }
    const { userId, timestamp, feature } = log
    const key = RedisKeys.usageLogList(userId)
    // 1. 存到 Sorted Set (以 timestamp 為 score)
    await this.redis.zadd(key, timestamp, RedisSerializer.stringify(log))
    // 2. 設置過期時間 (90 天)
    await this.redis.expire(key, this.RETENTION_DAYS * 24 * 60 * 60)
    // 3. 更新日統計
    const dateString = new Date(timestamp).toISOString().split('T')[0]
    const statKey = RedisKeys.usageStatDaily(userId, dateString)
    await this.redis.hincrby(statKey, feature, 1)
    await this.redis.expire(statKey, this.RETENTION_DAYS * 24 * 60 * 60)
  }
  async getHistory(userId: number, limit: number = 100): Promise<UserUsageLog[]> {
    const key = RedisKeys.usageLogList(userId)
    // 按 timestamp 倒序取得（最新的先）
    const items = await this.redis.zrevrange(key, 0, limit - 1)
    return items.map((item) => RedisSerializer.parse<UserUsageLog>(item, []))
  }
  async getDailyStats(userId: number, date: string): Promise<Record<string, number>> {
    const key = RedisKeys.usageStatDaily(userId, date)
    const stats = await this.redis.hgetall(key)
    // hgetall 返回的是 Record<string, string>，需要轉換為 Record<string, number>
    const result: Record<string, number> = {}
    for (const [feature, count] of Object.entries(stats)) {
      result[feature] = Number.parseInt(count, 10)
    }
    return result
  }
  async cleanup(): Promise<void> {
    // Redis 會自動通過 expire 清除過期的 key
    // 這裡只是用來手動觸發清理邏輯
    // 為了簡單起見，這裡留空（Redis 已自動管理 TTL）
  }
}
