import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common'
import { Request, Response } from 'express'
/**
 * 全域 HTTP 異常過濾器
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp()
    const response = context.getResponse<Response>()
    const request = context.getRequest<Request>()
    // 1️⃣ 判斷異常類型並獲取狀態碼
    const status = this.getHttpStatus(exception)
    // 2️⃣ 獲取錯誤訊息
    const errorResponse = this.getErrorResponse(exception, status)
    // 3️⃣ 記錄錯誤日誌
    this.logError(exception, request, status)
    // 4️⃣ 返回統一格式的錯誤回應
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: errorResponse.message,
      error: errorResponse.error,
    })
  }
  /** 獲取 HTTP 狀態碼 */
  private getHttpStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus()
    }
    // 非 HTTP 異常，統一返回 500
    return HttpStatus.INTERNAL_SERVER_ERROR
  }
  /** 獲取錯誤訊息 */
  private getErrorResponse(exception: unknown, status: number): { message: string; error: string } {
    if (exception instanceof HttpException) {
      const response = exception.getResponse()
      if (typeof response === 'string') {
        return {
          message: response,
          error: HttpStatus[status] || 'Error',
        }
      }
      if (typeof response === 'object' && response) {
        const responseObject = response as { message?: string; error?: string }
        return {
          message: responseObject.message || exception.message,
          error: responseObject.error || HttpStatus[status] || 'Error',
        }
      }
    }
    // 非 HTTP 異常，使用通用訊息（不洩漏內部錯誤）
    if (exception instanceof Error) {
      return {
        message: '伺服器內部錯誤，請稍後再試',
        error: 'Internal Server Error',
      }
    }
    // 未知異常類型
    return {
      message: '發生未知錯誤',
      error: 'Unknown Error',
    }
  }
  /** 記錄錯誤日誌 */
  private logError(exception: unknown, request: Request, status: number): void {
    const { method, url, query, params } = request
    const body = 'body' in request ? (request.body as unknown) : undefined
    // 構建錯誤上下文
    const errorContext = {
      method,
      url,
      body: this.sanitizeBody(body),
      query,
      params,
      status,
    }
    if (exception instanceof Error) {
      this.logger.error(
        `${method} ${url} - ${status} - ${exception.message}`,
        exception.stack,
        JSON.stringify(errorContext)
      )
    } else {
      this.logger.error(
        `${method} ${url} - ${status} - Unknown error`,
        undefined,
        JSON.stringify({ ...errorContext, exception })
      )
    }
  }
  /** 清理敏感資訊（如密碼、token） */
  private sanitizeBody(body: unknown): unknown {
    if (!body || typeof body !== 'object') {
      return body
    }
    const sensitiveFields = ['password', 'token', 'apiKey', 'secret']
    const sanitized = { ...body } as Record<string, unknown>
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '***REDACTED***'
      }
    }
    return sanitized
  }
}
