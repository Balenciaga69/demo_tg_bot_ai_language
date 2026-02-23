import { Injectable, Inject } from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices'
import { v4 as uuid } from 'uuid'
import type { PipelineTask, PipelineResult } from '@shared'
import { RedisService } from '../redis/redis.service'

/**
 * Pipeline Service - 業務邏輯層
 *
 * 職責：
 * 1. 生成 taskId，儲存任務元資料到 Redis
 * 2. 以 emit (fire-and-forget) 發送到 RabbitMQ
 * 3. 從 Redis 讀取聚合後的結果
 */
@Injectable()
export class PipelineService {
  constructor(
    @Inject('RABBITMQ_CLIENT')
    private readonly rabbitmqClient: ClientProxy,
    private readonly redisService: RedisService
  ) {}

  async createTask(text: string): Promise<string> {
    const taskId = uuid()
    const task: PipelineTask = {
      taskId,
      text,
      createdAt: new Date(),
      status: 'PROCESSING'
    }

    await this.redisService.setWithTTL(`task:${taskId}`, JSON.stringify(task), 3600)

    this.rabbitmqClient.emit('stats.process', { taskId, text })
    this.rabbitmqClient.emit('transform.process', { taskId, text })

    return taskId
  }

  async getTaskResult(taskId: string): Promise<PipelineResult | null> {
    const resultJson = await this.redisService.get(`result:${taskId}`)
    if (!resultJson) return null
    return JSON.parse(resultJson) as PipelineResult
  }
}
