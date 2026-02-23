import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { Transport } from '@nestjs/microservices'
import type { MicroserviceOptions } from '@nestjs/microservices'
import { ApiGatewayModule } from './api-gateway.module'
import { initializeOTel, shutdownOTel } from '@shared'

/**
 * API Gateway - Hybrid Application
 *
 * 同時扮演 HTTP 伺服器（接收客端請求）
 * 與 RabbitMQ 消費者（聚合各微服務結果）。
 *
 * OTEL 必須在應用啟動前初始化，才能捕獲完整 traces。
 */
async function bootstrap(): Promise<void> {
  initializeOTel('api-gateway')

  const app = await NestFactory.create(ApiGatewayModule)
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }))

  // 連接 RabbitMQ 消費者（接收 stats.completed / transform.completed）
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672'],
      queue: 'api_gateway_queue',
      queueOptions: { durable: true }
    }
  })

  await app.startAllMicroservices()
  await app.listen(3000)

  process.on('SIGTERM', async () => {
    await app.close()
    await shutdownOTel()
    process.exit(0)
  })
}

bootstrap()
