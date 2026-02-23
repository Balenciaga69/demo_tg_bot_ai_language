import { Injectable } from '@nestjs/common'
import { createClient } from 'redis'
import type { RedisClientType } from 'redis'

@Injectable()
export class RedisService {
  private client!: RedisClientType

  async onModuleInit(): Promise<void> {
    this.client = createClient({
      socket: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: parseInt(process.env.REDIS_PORT ?? '6379', 10)
      }
    }) as RedisClientType

    this.client.on('error', (err: Error) => {
      console.error('Redis error:', err)
    })

    await this.client.connect()
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.disconnect()
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key)
  }

  async setWithTTL(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.set(key, value, { EX: ttlSeconds })
  }
}
