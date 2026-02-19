import type { RegistrationRequestStatus } from '../entities/registration.type'
/**
 * 註冊請求常數
 */
export const REGISTRATION_CONSTANTS = {
  /** 新申請的初始狀態 */
  initialStatus: 'pending' as const satisfies RegistrationRequestStatus,
  /** 所有可能的狀態 */
  statuses: {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
  } as const satisfies Record<string, RegistrationRequestStatus>,
} as const
