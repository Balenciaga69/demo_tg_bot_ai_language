import 'tsconfig-paths/register'

import { INestApplication } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { ApiGatewayModule } from './app.module'

/** 設置 Swagger API 文件 */
const setupSwagger = (app: INestApplication): void => {
  const config = new DocumentBuilder().setTitle('語音學習 API Gateway').setVersion('1.0').addBearerAuth().build()
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api', app, document)
}

// eslint-disable-next-line unicorn/prefer-top-level-await
void bootstrap()

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(ApiGatewayModule)
  setupSwagger(app)
  await app.listen(3399)
  console.log('API Gateway is running on: http://localhost:3399')
  console.log('Swagger API 文件可在 http://localhost:3399/api 獲得')
}
