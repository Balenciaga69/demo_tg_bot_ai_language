import { Controller } from '@nestjs/common'
import { MessagePattern, Payload } from '@nestjs/microservices'
import { TransformService } from './transform.service'

interface TransformProcessPayload {
  taskId: string
  text: string
}

@Controller()
export class TransformController {
  constructor(private readonly transformService: TransformService) {}

  @MessagePattern('transform.process')
  async processTransform(@Payload() payload: TransformProcessPayload): Promise<void> {
    await this.transformService.processAndStore(payload.taskId, payload.text)
  }
}
