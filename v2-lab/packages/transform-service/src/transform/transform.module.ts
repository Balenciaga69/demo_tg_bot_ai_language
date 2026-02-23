import { Module } from '@nestjs/common'
import { TransformController } from './transform.controller'
import { TransformService } from './transform.service'
import { RedisService } from '../redis/redis.service'

@Module({
  controllers: [TransformController],
  providers: [TransformService, RedisService]
})
export class TransformModule {}
