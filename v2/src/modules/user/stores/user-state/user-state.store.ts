import { Injectable } from '@nestjs/common'
import type { UserState, FeatureMode } from '../../entities/user-state.type'
import { createDefaultUserState } from '../../constants/user.constants'
export const I_USER_STATE_STORE = 'I_USER_STATE_STORE'
export interface IUserStateStore {
  getOrCreate(userId: number): UserState | Promise<UserState>
  getById(userId: number): UserState | undefined | Promise<UserState | undefined>
  setById(userId: number, state: UserState): void | Promise<void>
  deleteById(userId: number): void | Promise<void>
  setProcessing(userId: number, status: UserState['processingStatus']): Promise<void>
  setProcessingWithTTL(userId: number, ttlSeconds: number): Promise<void> // Redis 專用：設置 processing 狀態並自動過期
  deductPoints(userId: number, amount: number): Promise<void>
  refundPoints(userId: number, amount: number): Promise<void>
  updateMode(userId: number, mode: FeatureMode): Promise<void>
}
@Injectable()
export class LocalUserStateStore implements IUserStateStore {
  private _store: Map<number, UserState> = new Map()
  constructor() {}
  getOrCreate(userId: number): UserState {
    if (!this._store.has(userId)) {
      this._store.set(userId, createDefaultUserState(userId))
    }
    return this._store.get(userId)!
  }
  getById(userId: number): UserState | undefined {
    return this._store.get(userId)
  }
  setById(userId: number, state: UserState): void {
    this._store.set(userId, state)
  }
  deleteById(userId: number): void {
    this._store.delete(userId)
  }
  setProcessing(userId: number, status: UserState['processingStatus']): Promise<void> {
    const state = this._store.get(userId)
    if (state) {
      state.processingStatus = status
      this._store.set(userId, state)
    }
    return Promise.resolve()
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setProcessingWithTTL(userId: number, ttlSeconds: number): Promise<void> {
    // Redis 專用：設置 processing 狀態並自動過期
    throw new Error('Method not implemented.')
  }
  deductPoints(userId: number, amount: number): Promise<void> {
    const state = this._store.get(userId)
    if (!state) {
      throw new Error(`User ${userId} not found`)
    }
    if (state.points < amount) {
      throw new Error(`Insufficient points: have ${state.points}, need ${amount}`)
    }
    state.points -= amount
    this._store.set(userId, state)
    return Promise.resolve()
  }
  refundPoints(userId: number, amount: number): Promise<void> {
    const state = this._store.get(userId)
    if (!state) {
      throw new Error(`User ${userId} not found`)
    }
    state.points += amount
    this._store.set(userId, state)
    return Promise.resolve()
  }
  updateMode(userId: number, mode: FeatureMode): Promise<void> {
    const state = this._store.get(userId)
    if (!state) {
      throw new Error(`User ${userId} not found`)
    }
    state.mode = mode
    this._store.set(userId, state)
    return Promise.resolve()
  }
}
