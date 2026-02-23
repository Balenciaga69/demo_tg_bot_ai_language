import { Injectable, Inject } from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices'
import type { TransformResult } from '@shared'
import { RedisService } from '../redis/redis.service'

/**
 * Transform Service - 文字轉換邏輯
 *
 * 業務邏輯：
 * - uppercase: 轉大寫
 * - lowercase: 轉小寫
 * - reversed: 字元翻轉
 */
@Injectable()
export class TransformService {
  constructor(
    @Inject('RABBITMQ_CLIENT')
    private readonly rabbitmqClient: ClientProxy,
    private readonly redisService: RedisService
  ) {}

  async processAndStore(taskId: string, text: string): Promise<void> {
    try {
      const result = this.transformText(taskId, text)

      await this.redisService.setWithTTL(`transform:${taskId}`, JSON.stringify(result), 3600)

      this.rabbitmqClient.emit('transform.completed', { taskId, result })
    } catch (error) {
      console.error(`Error processing transform for task ${taskId}:`, error)
    }
  }

  private transformText(taskId: string, text: string): TransformResult {
    return {
      taskId,
      uppercase: text.toUpperCase(),
      lowercase: text.toLowerCase(),
      reversed: text.split('').reverse().join(''),
      completedAt: new Date()
    }
  }
}
