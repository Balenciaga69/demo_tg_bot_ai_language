import { NestFactory } from '@nestjs/core'
import { MicroserviceOptions, Transport } from '@nestjs/microservices'
import { SttAppModule } from './app.module'

// eslint-disable-next-line unicorn/prefer-top-level-await
void bootstrap()

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(SttAppModule, {
    transport: Transport.REDIS,
    options: {
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number(process.env.REDIS_PORT ?? 6666),
    },
  })
  await app.listen()
  console.log('STT microservice is listening on Redis')
}
