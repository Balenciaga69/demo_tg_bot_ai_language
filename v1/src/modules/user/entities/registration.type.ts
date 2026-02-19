/** 申請狀態 */
export type RegistrationRequestStatus = 'pending' | 'approved' | 'rejected'
/** 註冊申請 */
export interface RegistrationRequest {
  id: string
  userId: number
  description: string
  createdAt: Date
  status: RegistrationRequestStatus
}
