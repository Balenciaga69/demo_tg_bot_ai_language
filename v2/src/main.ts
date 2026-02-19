import { INestApplication } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module'
import { loggerConfig } from './shared/logger/logger.config'
import { WinstonModule } from 'nest-winston'
import { HttpExceptionFilter } from './shared/filters'
/** 設置 Swagger API 文件 */
const setupSwagger = (app: INestApplication): void => {
  const config = new DocumentBuilder().setTitle('我的語音學習').setVersion('1.0').addBearerAuth().build()
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api', app, document)
}
/** 啟動應用程式 */
void bootstrap()
async function bootstrap(): Promise<void> {
  const logger = WinstonModule.createLogger(loggerConfig)
  const app = await NestFactory.create(AppModule, { logger })
  // 註冊全域異常過濾器
  app.useGlobalFilters(new HttpExceptionFilter())
  setupSwagger(app)
  await app.listen(3399)
  console.log('Application is running on: http://localhost:3399')
  console.log('Swagger API 文件可在 http://localhost:3399/api 獲得')
}
