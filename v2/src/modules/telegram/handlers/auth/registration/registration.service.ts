import type { RegistrationRequest } from '../../../../user/entities/registration.type'
import type { IRegistrationRequestStore } from '../../../../user/stores/registration/registration.store'
import { REGISTRATION_CONFIG } from './registration.constants'
/**
 * 註冊流程業務邏輯服務
 * 職責：申請檢查、驗證、狀態管理
 */
export class RegistrationService {
  constructor(private registrationStore: IRegistrationRequestStore) {}
  /**
   * 檢查用戶是否有現存申請
   * @returns 現存申請 或 undefined
   */
  async getExistingRequest(userId: number): Promise<RegistrationRequest | undefined> {
    return this.registrationStore.getByUserId(userId)
  }
  /**
   * 驗證申請描述
   * @returns { isValid: boolean, reason?: string }
   */
  validateDescription(description: string): { isValid: boolean; reason?: string } {
    const trimmed = description.trim()
    if (trimmed.length === 0) {
      return { isValid: false, reason: 'EMPTY' }
    }
    if (trimmed.length > REGISTRATION_CONFIG.DESCRIPTION_MAX_LENGTH) {
      return { isValid: false, reason: 'TOO_LONG' }
    }
    return { isValid: true }
  }
  /**
   * 建立或更新申請
   * @returns 建立/更新後的申請
   */
  async upsertRequest(
    userId: number,
    description: string,
    existingRequest?: RegistrationRequest
  ): Promise<RegistrationRequest> {
    if (existingRequest && existingRequest.status === 'pending') {
      // 更新現存待處理申請
      await this.registrationStore.updateDescription(existingRequest.id, description)
      return { ...existingRequest, description }
    }
    // 建立新申請
    return this.registrationStore.create(userId, description)
  }
  /**
   * 檢查用戶是否有被核准或拒絕的申請
   * @returns 狀態 或 undefined（無現存申請）
   */
  getApprovalStatus(request: RegistrationRequest | undefined): 'approved' | 'rejected' | 'pending' | undefined {
    if (!request) return undefined
    if (request.status === 'approved') return 'approved'
    if (request.status === 'rejected') return 'rejected'
    return 'pending'
  }
}
