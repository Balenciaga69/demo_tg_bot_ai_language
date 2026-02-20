import { AudioValidationService, AudioValidationConstants } from './audio-validation.service'
describe('AudioValidationService', () => {
  const service = new AudioValidationService()
  it('should invalidate empty buffer', async () => {
    const res = await service.validate(Buffer.alloc(0))
    expect(res.isValid).toBe(false)
    expect(res.errors).toContain('音頻檔案為空')
    expect(res.fileSize).toBe(0)
  })
  it('should invalidate unknown/unsupported mime (small random bytes)', async () => {
    const buf = Buffer.from([0x00, 0x11, 0x22, 0x33])
    const res = await service.validate(buf)
    expect(res.isValid).toBe(false)
    expect(res.errors.some((e) => e.includes('無法識別音頻格式') || e.includes('不支援的音頻格式'))).toBeTruthy()
  })
  it('should invalidate if file size exceeds MAX_FILE_SIZE', async () => {
    const big = Buffer.alloc(AudioValidationConstants.MAX_FILE_SIZE + 1)
    const res = await service.validate(big)
    expect(res.isValid).toBe(false)
    expect(res.errors.some((e) => e.includes('檔案大小超過限制'))).toBeTruthy()
  })
})
