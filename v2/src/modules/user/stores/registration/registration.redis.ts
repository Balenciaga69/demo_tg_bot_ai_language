import { Injectable, Inject } from '@nestjs/common'
import { Redis } from 'ioredis'
import { v4 as uuidv4 } from 'uuid'
import { REDIS_CLIENT } from '../../../../shared/redis/redis.module'
import { IRegistrationRequestStore } from './registration.store'
import type { RegistrationRequest, RegistrationRequestStatus } from '../../entities/registration.type'
import { RedisKeys } from '../../../../shared/redis/redis.helper'
import { RedisSerializer } from '../../../../shared/redis/redis.serializer'
import { REGISTRATION_CONSTANTS } from '../../constants/registration.constants'
/**
 * Redis 實現的註冊申請儲存
 * 使用複合鍵值結構：
 * - 主數據: registration:request:{id} -> JSON
 * - 狀態索引: Set 集合按 pending/processed 分類
 * - 用戶索引: 快速查詢用戶申請
 */
@Injectable()
export class RedisRegistrationRequestStore implements IRegistrationRequestStore {
  /** 需要恢復為 Date 的字段列表 */
  private readonly DATE_FIELDS = ['createdAt']
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}
  async create(userId: number, description: string): Promise<RegistrationRequest> {
    const request: RegistrationRequest = {
      id: uuidv4(),
      userId,
      description,
      createdAt: new Date(),
      status: REGISTRATION_CONSTANTS.initialStatus,
    }
    const requestKey = RedisKeys.registrationRequest(request.id)
    const pendingSetKey = RedisKeys.registrationRequestsPending()
    const userIndexKey = RedisKeys.registrationRequestUser(userId)
    // 原子性操作：使用 pipeline 確保三個操作同時成功或失敗
    const pipeline = this.redis.pipeline()
    pipeline.set(requestKey, RedisSerializer.stringify(request))
    pipeline.sadd(pendingSetKey, request.id)
    pipeline.set(userIndexKey, request.id)
    await pipeline.exec()
    return request
  }
  async getById(id: string): Promise<RegistrationRequest | undefined> {
    const key = RedisKeys.registrationRequest(id)
    const cached = await this.redis.get(key)
    if (!cached) {
      return undefined
    }
    return RedisSerializer.parse<RegistrationRequest>(cached, this.DATE_FIELDS)
  }
  async getPendingRequests(): Promise<RegistrationRequest[]> {
    const pendingSetKey = RedisKeys.registrationRequestsPending()
    // 使用 SMEMBERS 獲取所有待審核申請 ID
    const requestIds = await this.redis.smembers(pendingSetKey)
    if (requestIds.length === 0) {
      return []
    }
    // 批量獲取詳細數據（比逐個 GET 更高效）
    const keys = requestIds.map((id) => RedisKeys.registrationRequest(id))
    const results = await this.redis.mget(...keys)
    return results
      .filter((item): item is string => item !== null)
      .map((json) => RedisSerializer.parse<RegistrationRequest>(json, this.DATE_FIELDS))
  }
  async getProcessedRequests(): Promise<RegistrationRequest[]> {
    const processedSetKey = RedisKeys.registrationRequestsProcessed()
    const requestIds = await this.redis.smembers(processedSetKey)
    if (requestIds.length === 0) {
      return []
    }
    const keys = requestIds.map((id) => RedisKeys.registrationRequest(id))
    const results = await this.redis.mget(...keys)
    return results
      .filter((item): item is string => item !== null)
      .map((json) => RedisSerializer.parse<RegistrationRequest>(json, this.DATE_FIELDS))
  }
  async updateStatus(id: string, status: RegistrationRequestStatus): Promise<void> {
    const request = await this.getById(id)
    if (!request) {
      return
    }
    // 更新狀態
    request.status = status
    const requestKey = RedisKeys.registrationRequest(id)
    const pendingSetKey = RedisKeys.registrationRequestsPending()
    const processedSetKey = RedisKeys.registrationRequestsProcessed()
    // 原子性操作：更新 JSON + 更新狀態集合
    const pipeline = this.redis.pipeline()
    pipeline.set(requestKey, RedisSerializer.stringify(request))
    if (status === REGISTRATION_CONSTANTS.statuses.PENDING) {
      pipeline.sadd(pendingSetKey, id)
      pipeline.srem(processedSetKey, id)
    } else {
      pipeline.srem(pendingSetKey, id)
      pipeline.sadd(processedSetKey, id)
    }
    await pipeline.exec()
  }
  async getByUserId(userId: number): Promise<RegistrationRequest | undefined> {
    const userIndexKey = RedisKeys.registrationRequestUser(userId)
    // 先通過用戶索引獲取 requestId
    const requestId = await this.redis.get(userIndexKey)
    if (!requestId) {
      return undefined
    }
    return this.getById(requestId)
  }
  async updateDescription(id: string, description: string): Promise<void> {
    const request = await this.getById(id)
    if (!request) {
      return
    }
    request.description = description
    const key = RedisKeys.registrationRequest(id)
    await this.redis.set(key, RedisSerializer.stringify(request))
  }
}
