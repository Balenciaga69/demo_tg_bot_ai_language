import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ClientsModule, Transport } from '@nestjs/microservices'
import { StatsModule } from './stats/stats.module'
import { OTelModule } from '@shared'

@Module({
  imports: [
    ConfigModule.forRoot(),
    OTelModule,
    ClientsModule.register([
      {
        name: 'RABBITMQ_CLIENT',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672'],
          queue: 'stats_service_queue',
          queueOptions: { durable: true }
        }
      }
    ]),
    StatsModule
  ]
})
export class AppModule {}
