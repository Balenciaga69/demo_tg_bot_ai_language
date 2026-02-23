/**
 * 任務相關的共享類型定義
 *
 * 為什麼集中定義？
 * - API Gateway、Stats Service、Transform Service 都需要這些類型
 * - 避免類型定義散落各處
 * - 單一事實來源 (Single Source of Truth)
 */

export interface PipelineTask {
  taskId: string
  text: string
  createdAt: Date
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
}

export interface StatsResult {
  taskId: string
  charCount: number
  wordCount: number
  spaceCount: number
  completedAt: Date
}

export interface TransformResult {
  taskId: string
  uppercase: string
  lowercase: string
  reversed: string
  completedAt: Date
}

export interface PipelineResult {
  taskId: string
  originalText: string
  stats: StatsResult | null
  transform: TransformResult | null
  aggregatedAt?: Date
}
