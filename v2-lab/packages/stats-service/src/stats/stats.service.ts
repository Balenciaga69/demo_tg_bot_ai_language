import { Injectable, Inject } from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices'
import type { StatsResult } from '@shared'
import { RedisService } from '../redis/redis.service'

/**
 * Stats Service - 文字統計邏輯
 *
 * 業務邏輯：
 * - charCount: 總字元數（含空格）
 * - wordCount: 單字數（依空白分割）
 * - spaceCount: 空格數
 */
@Injectable()
export class StatsService {
  constructor(
    @Inject('RABBITMQ_CLIENT')
    private readonly rabbitmqClient: ClientProxy,
    private readonly redisService: RedisService
  ) {}

  async processAndStore(taskId: string, text: string): Promise<void> {
    try {
      const result = this.calculateStats(taskId, text)

      await this.redisService.setWithTTL(`stats:${taskId}`, JSON.stringify(result), 3600)

      this.rabbitmqClient.emit('stats.completed', { taskId, result })
    } catch (error) {
      console.error(`Error processing stats for task ${taskId}:`, error)
    }
  }

  private calculateStats(taskId: string, text: string): StatsResult {
    return {
      taskId,
      charCount: text.length,
      wordCount: text.split(/\s+/).filter((word) => word.length > 0).length,
      spaceCount: (text.match(/\s/g) ?? []).length,
      completedAt: new Date()
    }
  }
}
