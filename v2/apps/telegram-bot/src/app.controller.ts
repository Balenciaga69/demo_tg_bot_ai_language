import { Controller, Get, Req } from '@nestjs/common'
import type { Request } from 'express'
@Controller()
export class AppController {
  constructor() {}
  @Get()
  healthCheck(): string {
    return 'API Gateway is running'
  }
  @Get('csrf-token')
  getCsrfToken(@Req() request: Request): { csrfToken: string } {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const csrfToken = (request as any).csrfToken?.() || ''
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    return { csrfToken }
  }
}
