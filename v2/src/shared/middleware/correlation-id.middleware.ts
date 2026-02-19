import { Injectable, NestMiddleware, Logger } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import { v4 as uuid } from 'uuid'
import { AsyncLocalStorage } from 'node:async_hooks'
/**
 * Correlation ID 存儲 - 用於追蹤整個請求鏈
 */
export const correlationIdStorage = new AsyncLocalStorage<string>()
/**
 * Correlation ID 中介軟件
 * 職責：
 * 1. 為每個請求生成或取得 correlation ID
 * 2. 存儲到 AsyncLocalStorage，在整個請求鏈中可訪問
 * 3. 附加到 response header，便於客戶端追蹤
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CorrelationIdMiddleware.name)
  use(request: Request, response: Response, next: NextFunction): void {
    // 獲取或生成 correlation ID
    const correlationId = (request.headers['x-correlation-id'] as string) || uuid()
    // 將 correlation ID 附加到 response header
    response.setHeader('x-correlation-id', correlationId)
    // 將 correlation ID 存儲到 AsyncLocalStorage，在整個請求鏈中可訪問
    correlationIdStorage.run(correlationId, () => {
      this.logger.debug(`[${correlationId}] ${request.method} ${request.path}`)
      next()
    })
  }
}
/**
 * 獲取當前請求的 correlation ID
 * @returns correlation ID 或 undefined
 */
export function getCorrelationId(): string | undefined {
  return correlationIdStorage.getStore()
}
