import { NestFactory } from '@nestjs/core'
import { Transport } from '@nestjs/microservices'
import type { MicroserviceOptions } from '@nestjs/microservices'
import { AppModule } from './app.module'
import { initializeOTel, shutdownOTel } from '@shared'

async function bootstrap(): Promise<void> {
  initializeOTel('stats-service')

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672'],
      queue: 'stats_service_queue',
      queueOptions: { durable: true }
    }
  })

  await app.listen()

  process.on('SIGTERM', async () => {
    await app.close()
    await shutdownOTel()
    process.exit(0)
  })
}

bootstrap()
