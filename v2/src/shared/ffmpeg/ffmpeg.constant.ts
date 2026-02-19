/**
 * FFmpeg 相關常數
 */
export const AUDIO_FORMATS = ['mp3', 'm4a', 'ogg', 'flac', 'wav', 'opus'] as const
// 音檔時長限制（秒）
export const AUDIO_DURATION_MIN_SECONDS = 0.5
export const AUDIO_DURATION_MAX_SECONDS = 55
// 音檔大小限制（bytes）
export const AUDIO_FILE_SIZE_MIN_BYTES = 1024 // 1KB
export const AUDIO_FILE_SIZE_MAX_BYTES = 50 * 1024 * 1024 // 50MB
// FFmpeg 相關
export const FFMPEG_TIMEOUT_MS = 30 * 1000 // 30 秒逾時
export const FFMPEG_TEMP_DIR = 'temp/ffmpeg'
// Azure 要求的音訊規格
export const AZURE_AUDIO_SPEC = {
  SAMPLE_RATE: 16_000, // 16kHz
  BITS_PER_SAMPLE: 16, // 16-bit
  CHANNELS: 1, // Mono
  CODEC: 'pcm_s16le', // PCM
} as const
