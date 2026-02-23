import { Injectable } from '@nestjs/common'
import { Counter, Histogram, Gauge } from 'prom-client'

/**
 * Prometheus metrics 統一管理
 *
 * metrics 類型說明：
 * - Counter:   只遞增的計數器 (請求數、錯誤數)
 * - Histogram: 記錄數值分佈 (響應時間)
 * - Gauge:     可增可減的指標 (佇列長度、活躍連線數)
 */

@Injectable()
export class PrometheusService {
  readonly requestCounter = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status']
  })

  readonly requestDuration = new Histogram({
    name: 'http_request_duration_ms',
    help: 'HTTP request latency',
    labelNames: ['method', 'route'],
    buckets: [10, 50, 100, 500, 1000, 5000]
  })

  readonly taskCounter = new Counter({
    name: 'pipeline_tasks_total',
    help: 'Total number of pipeline tasks',
    labelNames: ['status']
  })

  readonly queueSize = new Gauge({
    name: 'message_queue_size',
    help: 'Current size of message queue',
    labelNames: ['queue']
  })

  recordHttpRequest(method: string, route: string, statusCode: number, duration: number): void {
    this.requestCounter.labels(method, route, statusCode.toString()).inc()
    this.requestDuration.labels(method, route).observe(duration)
  }

  recordTaskCreated(status: string): void {
    this.taskCounter.labels(status).inc()
  }

  setQueueSize(queue: string, size: number): void {
    this.queueSize.labels(queue).set(size)
  }
}
