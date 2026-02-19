import { Injectable } from '@nestjs/common'
import { v4 as uuidv4 } from 'uuid'
import type { RegistrationRequest, RegistrationRequestStatus } from '../../entities/registration.type'
export const I_REGISTRATION_REQUEST_STORE = 'I_REGISTRATION_REQUEST_STORE'
export interface IRegistrationRequestStore {
  create(userId: number, description: string): RegistrationRequest | Promise<RegistrationRequest>
  getById(id: string): RegistrationRequest | undefined | Promise<RegistrationRequest | undefined>
  getPendingRequests(): RegistrationRequest[] | Promise<RegistrationRequest[]>
  getProcessedRequests(): RegistrationRequest[] | Promise<RegistrationRequest[]>
  updateStatus(id: string, status: RegistrationRequestStatus): void | Promise<void>
  getByUserId(userId: number): RegistrationRequest | undefined | Promise<RegistrationRequest | undefined>
  updateDescription(id: string, description: string): void | Promise<void>
}
@Injectable()
export class LocalRegistrationRequestStore implements IRegistrationRequestStore {
  private _store: Map<string, RegistrationRequest> = new Map()
  create(userId: number, description: string): RegistrationRequest {
    const request: RegistrationRequest = {
      id: uuidv4(),
      userId,
      description,
      createdAt: new Date(),
      status: 'pending',
    }
    this._store.set(request.id, request)
    return request
  }
  getById(id: string): RegistrationRequest | undefined {
    return this._store.get(id)
  }
  getPendingRequests(): RegistrationRequest[] {
    return [...this._store.values()].filter((request) => request.status === 'pending')
  }
  getProcessedRequests(): RegistrationRequest[] {
    return [...this._store.values()].filter((request) => request.status !== 'pending')
  }
  updateStatus(id: string, status: RegistrationRequestStatus): void {
    const request = this._store.get(id)
    if (request) {
      request.status = status
    }
  }
  getByUserId(userId: number): RegistrationRequest | undefined {
    return [...this._store.values()].find((request) => request.userId === userId)
  }
  updateDescription(id: string, description: string): void | Promise<void> {
    const request = this._store.get(id)
    if (request) {
      request.description = description
    }
  }
}
