import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ClientsModule, Transport } from '@nestjs/microservices'
import { PipelineController } from './pipeline/pipeline.controller'
import { PipelineService } from './pipeline/pipeline.service'
import { ResultAggregatorController } from './result/result-aggregator.controller'
import { RedisService } from './redis/redis.service'
import { MetricsController } from './metrics/metrics.controller'
import { PrometheusService, OTelModule } from '@shared'

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
          queue: 'api_gateway_queue',
          queueOptions: { durable: true }
        }
      }
    ])
  ],
  controllers: [PipelineController, MetricsController, ResultAggregatorController],
  providers: [PipelineService, RedisService, PrometheusService]
})
export class ApiGatewayModule {}
