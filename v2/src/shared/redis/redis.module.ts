import { Global, Logger, Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Redis } from 'ioredis'
/** Redis 客戶端 */
export const REDIS_CLIENT = Symbol('REDIS_CLIENT')
@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): any => {
        const host = configService.get<string>('REDIS_HOST')
        const port = configService.get<number>('REDIS_PORT')
        const database = configService.get<number>('REDIS_DB')
        const password = configService.get<string>('REDIS_PASSWORD')
        const redisConfig = {
          host,
          port,
          db: database,
          ...(password && { password }), // 如果有密碼則添加到配置中
          retryStrategy: (times: number): number => {
            // 每次重試 最大延遲 2 秒
            return Math.min(times * 50, 2000)
          },
          enableReadyCheck: true,
          maxRetriesPerRequest: 20,
        }
        const redis = new Redis(redisConfig)
        const logger = new Logger('RedisModule')
        redis.on('connect', () => {
          logger.log(`✓ 已連接 ${host}:${port}`)
        })
        redis.on('ready', () => {
          logger.log(`✓ 已準備好`)
        })
        redis.on('error', (error: Error) => {
          logger.error(`✗ 錯誤: ${error.message}`)
        })
        redis.on('reconnecting', (times: number) => {
          logger.warn(`⟳ 正在重新連線...（第 ${times / 50} 次）`)
        })
        redis.on('close', () => {
          logger.log(`- 連線已關閉`)
        })
        return redis
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
/** Redis 模組 */
export class SharedRedisModule {}
