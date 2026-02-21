import 'tsconfig-paths/register'
import { NestFactory } from '@nestjs/core'
import { MicroserviceOptions, Transport } from '@nestjs/microservices'
import { SttAppModule } from './app.module'

// eslint-disable-next-line unicorn/prefer-top-level-await
void bootstrap()
async function bootstrap(): Promise<void> {
  const sttTcpHost = process.env.STT_TCP_HOST ?? '0.0.0.0'
  const sttTcpPortRaw = Number(process.env.STT_TCP_PORT ?? 0)
  const sttTcpPort = Number.isNaN(sttTcpPortRaw) || sttTcpPortRaw === 0 ? 4001 : sttTcpPortRaw

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(SttAppModule, {
    transport: Transport.TCP,
    options: {
      host: sttTcpHost,
      port: sttTcpPort,
    },
  })
  await app.listen()
  console.log(`STT microservice is listening on TCP ${sttTcpHost}:${sttTcpPort}`)
}
