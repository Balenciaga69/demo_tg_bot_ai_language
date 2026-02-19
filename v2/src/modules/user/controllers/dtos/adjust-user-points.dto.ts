import { ApiProperty } from '@nestjs/swagger'
import { IsNumber, IsPositive } from 'class-validator'
/**
 * 調整用戶點數請求
 */
export class AdjustUserPointsDto {
  @ApiProperty({
    description: '新的積分值',
    type: 'number',
    example: 150,
    minimum: 0,
  })
  @IsNumber()
  @IsPositive()
  points?: number
}
/**
 * 調整用戶點數回應
 */
export class AdjustUserPointsResponseDto {
  @ApiProperty({ description: '操作訊息', example: '已調整用戶 123 的點數' })
  message?: string
  @ApiProperty({ description: '調整後的點數', example: 150 })
  points?: number
}
