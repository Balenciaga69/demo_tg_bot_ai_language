import { IsString, IsNotEmpty, MinLength } from 'class-validator'

/**
 * DTO - Data Transfer Object
 *
 * 使用 class-validator 實現自動輸入驗證。
 * 通過 ValidationPipe 在 Controller 層自動攔截非法輸入。
 */
export class CreatePipelineTaskDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  text!: string
}
