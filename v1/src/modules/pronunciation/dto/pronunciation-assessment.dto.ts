import { IsString, MinLength, MaxLength, IsOptional, IsIn, Matches } from 'class-validator'
import { PRONUNCIATION_LIMITS, PRONUNCIATION_LANGUAGES } from '../constants/pronunciation.constant'
/**
 * 發音評估 DTO
 * 驗證用戶輸入的要評估文字和語言選擇
 */
export class PronunciationAssessmentDto {
  @IsString({ message: '文字必須是字串' })
  @MinLength(PRONUNCIATION_LIMITS.REFERENCE_TEXT_MIN_LENGTH, {
    message: '文字不能為空',
  })
  @MaxLength(PRONUNCIATION_LIMITS.REFERENCE_TEXT_MAX_LENGTH, {
    message: `文字不能超過 ${PRONUNCIATION_LIMITS.REFERENCE_TEXT_MAX_LENGTH} 個字`,
  })
  @Matches(/^[^\p{Emoji}]*$/u, {
    message: '文字不支持 Emoji',
  })
  @Matches(/^[^<>]*$/, {
    message: '文字不支持 HTML 標籤',
  })
  referenceText!: string
  @IsOptional()
  @IsIn(PRONUNCIATION_LANGUAGES.SUPPORTED, {
    message: `支援的語言：${PRONUNCIATION_LANGUAGES.SUPPORTED.join(', ')}`,
  })
  language?: string
}
