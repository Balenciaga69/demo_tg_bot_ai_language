import { BadRequestException, Body, Controller, Get, Inject, Param, Post, Query } from '@nestjs/common'
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
import { I_REGISTRATION_REQUEST_STORE, type IRegistrationRequestStore } from '../stores/registration/registration.store'
import { type RegistrationRequest } from '../entities/registration.type'
import { type UserState } from '../entities/user-state.type'
import { I_USER_STATE_STORE, type IUserStateStore } from '../stores/user-state/user-state.store'
import { I_USAGE_LOG_STORE, type IUsageLogStore, type UserUsageLog } from '../stores/usage-log/usage-log.store'
import { AdjustUserPointsDto, AdjustUserPointsResponseDto } from './dtos'
@ApiTags('registration-requests', 'users')
@Controller('telegram/admin')
export class UserAdminController {
  constructor(
    @Inject(I_REGISTRATION_REQUEST_STORE) private registrationRequestStore: IRegistrationRequestStore,
    @Inject(I_USER_STATE_STORE) private userStateStore: IUserStateStore,
    @Inject(I_USAGE_LOG_STORE) private usageLogStore: IUsageLogStore
  ) {}
  /** 取得所有待處理的申請 */
  @Get('registration-requests/pending')
  async getPendingRequests(): Promise<RegistrationRequest[]> {
    return await this.registrationRequestStore.getPendingRequests()
  }
  /** 取得所有已處理的申請 */
  @Get('registration-requests/processed')
  async getProcessedRequests(): Promise<RegistrationRequest[]> {
    return await this.registrationRequestStore.getProcessedRequests()
  }
  /** 批准申請 - 啟用用戶 */
  @Post('registration-requests/:id/approve')
  @ApiOperation({ summary: '批准註冊申請', description: '批准用戶的註冊申請並啟用帳號' })
  @ApiParam({ name: 'id', description: '申請 ID' })
  @ApiResponse({ status: 200, description: '批准成功', schema: { example: { message: '已批准用戶 123 的申請' } } })
  @ApiResponse({ status: 400, description: '申請不存在或已處理' })
  async approveRequest(@Param('id') requestId: string): Promise<{ message: string }> {
    const request = await this.registrationRequestStore.getById(requestId)
    if (!request) {
      throw new BadRequestException('申請不存在')
    }
    if (request.status !== 'pending') {
      throw new BadRequestException('只能處理待處理的申請')
    }
    const userState = await this.userStateStore.getOrCreate(request.userId)
    userState.isEnabled = true
    userState.points = 100 // 批准時給予初始點數
    await this.userStateStore.setById(request.userId, userState)
    await this.registrationRequestStore.updateStatus(requestId, 'approved')
    return { message: `已批准用戶 ${request.userId} 的申請` }
  }
  /** 拒絕申請 - 禁用用戶 */
  @Post('registration-requests/:id/reject')
  @ApiOperation({ summary: '拒絕註冊申請', description: '拒絕用戶的註冊申請並禁用帳號' })
  @ApiParam({ name: 'id', description: '申請 ID' })
  @ApiResponse({ status: 200, description: '拒絕成功', schema: { example: { message: '已拒絕用戶 123 的申請' } } })
  @ApiResponse({ status: 400, description: '申請不存在或已處理' })
  async rejectRequest(@Param('id') requestId: string): Promise<{ message: string }> {
    const request = await this.registrationRequestStore.getById(requestId)
    if (!request) {
      throw new BadRequestException('申請不存在')
    }
    if (request.status !== 'pending') {
      throw new BadRequestException('只能處理待處理的申請')
    }
    const userState = await this.userStateStore.getOrCreate(request.userId)
    userState.isEnabled = false
    await this.userStateStore.setById(request.userId, userState)
    await this.registrationRequestStore.updateStatus(requestId, 'rejected')
    return { message: `已拒絕用戶 ${request.userId} 的申請` }
  }
  /** 調整用戶點數 */
  @Post('users/:userId/points')
  @ApiOperation({ summary: '調整用戶點數', description: '更新指定用戶的積分' })
  @ApiParam({ name: 'userId', description: '用戶 ID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: '調整成功',
    type: AdjustUserPointsResponseDto,
  })
  @ApiResponse({ status: 400, description: '無效的用戶 ID 或用戶不存在' })
  async adjustUserPoints(
    @Param('userId') userId: string,
    @Body() body: AdjustUserPointsDto
  ): Promise<AdjustUserPointsResponseDto> {
    const numberUserId = Number.parseInt(userId, 10)
    if (Number.isNaN(numberUserId)) {
      throw new BadRequestException('無效的用戶ID')
    }
    const userState = await this.userStateStore.getById(numberUserId)
    if (!userState) {
      throw new BadRequestException('用戶不存在')
    }
    userState.points = body.points ?? userState.points
    await this.userStateStore.setById(numberUserId, userState)
    return { message: `已調整用戶 ${numberUserId} 的點數`, points: userState.points }
  }
  /** 取得用戶狀況（包含申請記錄） */
  @Get('users/:userId')
  async getUserWithRegistration(@Param('userId') userId: string): Promise<UserWithRegistration> {
    const numberUserId = Number.parseInt(userId, 10)
    if (Number.isNaN(numberUserId)) {
      throw new BadRequestException('無效的用戶ID')
    }
    const userState = await this.userStateStore.getById(numberUserId)
    if (!userState) {
      throw new BadRequestException('用戶不存在')
    }
    const registrationRequest = await this.registrationRequestStore.getByUserId(numberUserId)
    return {
      userState,
      registrationRequest: registrationRequest || undefined,
    }
  }
  /** 查詢單用戶使用歷史 */
  @Get('users/:userId/usage-logs')
  @ApiOperation({ summary: '查詢用戶使用歷史', description: '獲取指定用戶的功能使用記錄' })
  @ApiParam({ name: 'userId', description: '用戶 ID', type: 'string' })
  @ApiQuery({ name: 'limit', description: '返回數量限制', type: 'number', required: false, example: 100 })
  @ApiResponse({
    status: 200,
    description: '成功返回使用記錄列表',
    type: Array,
    isArray: true,
  })
  @ApiResponse({ status: 400, description: '無效的用戶 ID' })
  async getUserUsageLogs(@Param('userId') userId: string, @Query('limit') limit?: string): Promise<UserUsageLog[]> {
    const numberUserId = Number.parseInt(userId, 10)
    if (Number.isNaN(numberUserId)) {
      throw new BadRequestException('無效的用戶ID')
    }
    const parsedLimit = limit ? Number.parseInt(limit, 10) : 100
    if (Number.isNaN(parsedLimit) || parsedLimit < 1) {
      throw new BadRequestException('limit 必須是正整數')
    }
    return await this.usageLogStore.getHistory(numberUserId, parsedLimit)
  }
}
/** 用戶完整信息（包含申請記錄） */
export interface UserWithRegistration {
  userState: UserState
  registrationRequest?: RegistrationRequest
}
