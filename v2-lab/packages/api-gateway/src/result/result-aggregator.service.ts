import { Injectable } from '@nestjs/common'
import { MessagePattern, Payload } from '@nestjs/microservices'
import type { StatsResult, TransformResult, PipelineResult } from '@shared'
import { RedisService } from '../redis/redis.service'

interface StatsCompletedPayload {
  taskId: string
  result: StatsResult
}

interface TransformCompletedPayload {
  taskId: string
  result: TransformResult
}

interface TaskPayload {
  taskId: string
  text: string
  createdAt: Date
  status: string
}

/**
 * Result Aggregator Service
 *
 * 監聽 stats.completed 與 transform.completed 事件。
 * 當兩個微服務都完成時，將結果合併寫入 result:{taskId}。
 */
@Injectable()
export class ResultAggregatorService {
  constructor(private readonly redisService: RedisService) {}

  async onStatsCompleted(@Payload() payload: StatsCompletedPayload): Promise<void> {
    await this.aggregateResult(payload.taskId)
  }

  async onTransformCompleted(@Payload() payload: TransformCompletedPayload): Promise<void> {
    await this.aggregateResult(payload.taskId)
  }

  private async aggregateResult(taskId: string): Promise<void> {
    try {
      const [taskJson, statsJson, transformJson] = await Promise.all([
        this.redisService.get(`task:${taskId}`),
        this.redisService.get(`stats:${taskId}`),
        this.redisService.get(`transform:${taskId}`)
      ])

      if (!taskJson) {
        console.warn(`Task ${taskId} not found in Redis`)
        return
      }

      const stats = statsJson ? (JSON.parse(statsJson) as StatsResult) : null
      const transform = transformJson ? (JSON.parse(transformJson) as TransformResult) : null

      if (!stats || !transform) return

      const task = JSON.parse(taskJson) as TaskPayload
      const pipelineResult: PipelineResult = {
        taskId,
        originalText: task.text,
        stats,
        transform,
        aggregatedAt: new Date()
      }

      await this.redisService.setWithTTL(`result:${taskId}`, JSON.stringify(pipelineResult), 3600)
    } catch (error) {
      console.error(`Error aggregating result for task ${taskId}:`, error)
    }
  }
}
