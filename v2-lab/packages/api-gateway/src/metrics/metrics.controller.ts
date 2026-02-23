import { Controller, Get } from '@nestjs/common'
import { register } from 'prom-client'

/**
 * Metrics Controller
 *
 * GET /metrics 暴露 Prometheus 格式的指標。
 * Prometheus 定期拉取此端點存儲和查詢時序資料。
 */
@Controller('metrics')
export class MetricsController {
  @Get()
  async getMetrics(): Promise<string> {
    return register.metrics()
  }
}
