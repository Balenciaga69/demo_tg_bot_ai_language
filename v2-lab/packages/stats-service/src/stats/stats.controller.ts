import { Controller } from '@nestjs/common'
import { MessagePattern, Payload } from '@nestjs/microservices'
import { StatsService } from './stats.service'

interface StatsProcessPayload {
  taskId: string
  text: string
}

/**
 * Stats Microservice Controller
 *
 * @MessagePattern('stats.process') 監聽 RabbitMQ 特定路由鍵。
 * 當消息到達時自動調用對應方法。
 */
@Controller()
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @MessagePattern('stats.process')
  async processStats(@Payload() payload: StatsProcessPayload): Promise<void> {
    await this.statsService.processAndStore(payload.taskId, payload.text)
  }
}
