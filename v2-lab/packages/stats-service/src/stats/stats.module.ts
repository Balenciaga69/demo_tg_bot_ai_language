import { Module } from '@nestjs/common'
import { StatsController } from './stats.controller'
import { StatsService } from './stats.service'
import { RedisService } from '../redis/redis.service'

@Module({
  controllers: [StatsController],
  providers: [StatsService, RedisService]
})
export class StatsModule {}
