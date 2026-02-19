import { Injectable, Inject } from '@nestjs/common'
import { Redis } from 'ioredis'
import { REDIS_CLIENT } from '../../../../shared/redis/redis.module'
import { IUserStateStore } from './user-state.store'
import type { UserState, FeatureMode } from '../../entities/user-state.type'
import { RedisKeys } from '../../../../shared/redis/redis.helper'
import { RedisSerializer } from '../../../../shared/redis/redis.serializer'
import { createDefaultUserState } from '../../constants/user.constants'
/**
 * Redis 實現的用戶狀態儲存
 * 簡單鍵值對應：userId -> UserState JSON
 */
@Injectable()
export class RedisUserStateStore implements IUserStateStore {
  /** 需要恢復為 Date 的字段列表 (當前無需序列化日期) */
  private readonly DATE_FIELDS: string[] = []
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}
  async getOrCreate(userId: number): Promise<UserState> {
    const key = RedisKeys.userState(userId)
    const cached = await this.redis.get(key)
    if (cached) {
      return RedisSerializer.parse<UserState>(cached, this.DATE_FIELDS)
    }
    // 不存在則建立新狀態
    const newState = createDefaultUserState(userId)
    await this.redis.set(key, RedisSerializer.stringify(newState))
    return newState
  }
  async getById(userId: number): Promise<UserState | undefined> {
    const key = RedisKeys.userState(userId)
    const cached = await this.redis.get(key)
    if (!cached) {
      return undefined
    }
    return RedisSerializer.parse<UserState>(cached, this.DATE_FIELDS)
  }
  async setById(userId: number, state: UserState): Promise<void> {
    const key = RedisKeys.userState(userId)
    await this.redis.set(key, RedisSerializer.stringify(state))
  }
  async deleteById(userId: number): Promise<void> {
    const key = RedisKeys.userState(userId)
    await this.redis.del(key)
  }
  async setProcessing(userId: number, status: UserState['processingStatus']): Promise<void> {
    const userState = await this.getOrCreate(userId)
    userState.processingStatus = status
    await this.setById(userId, userState)
  }
  async updateMode(userId: number, mode: FeatureMode): Promise<void> {
    const userState = await this.getOrCreate(userId)
    userState.mode = mode
    await this.setById(userId, userState)
  }
  async setProcessingWithTTL(userId: number, ttlSeconds: number): Promise<void> {
    const userState = await this.getOrCreate(userId)
    userState.processingStatus = 'processing'
    const key = RedisKeys.userState(userId)
    await this.redis.setex(key, ttlSeconds, RedisSerializer.stringify(userState))
  }
  async deductPoints(userId: number, amount: number): Promise<void> {
    const state = await this.getById(userId)
    if (!state) {
      throw new Error(`User ${userId} not found`)
    }
    if (state.points < amount) {
      throw new Error(`Insufficient points: have ${state.points}, need ${amount}`)
    }
    state.points -= amount
    await this.setById(userId, state)
  }
  async refundPoints(userId: number, amount: number): Promise<void> {
    const state = await this.getById(userId)
    if (!state) {
      throw new Error(`User ${userId} not found`)
    }
    state.points += amount
    await this.setById(userId, state)
  }
}
