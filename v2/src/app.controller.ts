import { Controller, Get } from '@nestjs/common'
@Controller()
export class AppController {
  constructor() {}
  @Get()
  // 根路由測試接口
  getHello(): string {
    return 'Hello World!'
  }
}
