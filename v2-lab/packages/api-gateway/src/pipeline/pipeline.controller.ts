import { Controller, Post, Get, Body, Param, HttpCode } from '@nestjs/common'
import { CreatePipelineTaskDto } from './dto/create-pipeline-task.dto'
import { PipelineService } from './pipeline.service'
import { PrometheusService } from '@shared'
import type { PipelineResult } from '@shared'

/**
 * Pipeline Controller - HTTP 入口點
 *
 * POST /pipeline  -> 建立任務，非同步處理，回傳 taskId
 * GET  /pipeline/:taskId -> 查詢任務結果
 */
@Controller('pipeline')
export class PipelineController {
  constructor(
    private readonly pipelineService: PipelineService,
    private readonly metricsService: PrometheusService
  ) {}

  @Post()
  @HttpCode(202)
  async createTask(@Body() dto: CreatePipelineTaskDto): Promise<{ taskId: string; message: string }> {
    const startTime = Date.now()

    try {
      const taskId = await this.pipelineService.createTask(dto.text)
      const duration = Date.now() - startTime

      this.metricsService.recordHttpRequest('POST', '/pipeline', 202, duration)
      this.metricsService.recordTaskCreated('PROCESSING')

      return {
        taskId,
        message: 'Task queued for processing. Use GET /pipeline/:taskId to check status.'
      }
    } catch (error) {
      const duration = Date.now() - startTime
      this.metricsService.recordHttpRequest('POST', '/pipeline', 500, duration)
      throw error
    }
  }

  @Get(':taskId')
  async getTaskResult(@Param('taskId') taskId: string): Promise<PipelineResult | null> {
    const startTime = Date.now()

    try {
      const result = await this.pipelineService.getTaskResult(taskId)
      const duration = Date.now() - startTime

      this.metricsService.recordHttpRequest('GET', '/pipeline/:taskId', result ? 200 : 404, duration)

      return result
    } catch (error) {
      const duration = Date.now() - startTime
      this.metricsService.recordHttpRequest('GET', '/pipeline/:taskId', 500, duration)
      throw error
    }
  }
}
