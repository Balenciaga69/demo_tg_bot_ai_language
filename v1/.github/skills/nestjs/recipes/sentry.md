# NestJS Sentry 錯誤追蹤

使用 Sentry 進行錯誤追蹤和性能監控。

---

## 安裝

```bash
npm install --save @sentry/nestjs @sentry/profiling-node
```

---

## 基本設置

### instrument.ts

在應用程式啟動前導入此文件。

```typescript
import * as Sentry from '@sentry/nestjs'
import { nodeProfilingIntegration } from '@sentry/profiling-node'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [nodeProfilingIntegration()],
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
})
```

### main.ts

```typescript
// 必須首先導入
import './instrument'

import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  await app.listen(3000)
}

bootstrap()
```

---

## App Module 設置

```typescript
import { Module } from '@nestjs/common'
import { SentryModule } from '@sentry/nestjs/setup'
import { AppController } from './app.controller'
import { AppService } from './app.service'

@Module({
  imports: [
    SentryModule.forRoot(),
    // ...other modules
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

---

## 全局異常過濾

```typescript
import { Module } from '@nestjs/common'
import { APP_FILTER } from '@nestjs/core'
import { SentryGlobalFilter } from '@sentry/nestjs/setup'

@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
  ],
})
export class AppModule {}
```

---

## 自訂異常過濾

```typescript
import { Catch, ExceptionFilter } from '@nestjs/common'
import { SentryExceptionCaptured } from '@sentry/nestjs'

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  @SentryExceptionCaptured()
  catch(exception: any, host: any): void {
    // 自訂錯誤處理
    console.error('Error:', exception)
  }
}
```

---

## 手動報告錯誤

```typescript
import { Injectable } from '@nestjs/common'
import * as Sentry from '@sentry/nestjs'

@Injectable()
export class AppService {
  testError() {
    try {
      throw new Error('Test error')
    } catch (error) {
      Sentry.captureException(error)
    }
  }
}
```

---

## 調試端點

```typescript
import { Controller, Get } from '@nestjs/common'

@Controller()
export class AppController {
  @Get('debug-sentry')
  debugSentry() {
    throw new Error('My first Sentry error!')
  }
}
```

訪問 `GET /debug-sentry` 會拋出錯誤並報告給 Sentry。

---

## 性能監控

```typescript
import * as Sentry from '@sentry/nestjs'

// 追蹤特定操作
const transaction = Sentry.startTransaction({
  op: 'database.query',
  name: 'Get User',
})

try {
  // 執行操作
  const user = await this.getUserFromDb()
  transaction.finish()
} catch (error) {
  transaction.setStatus('error')
  transaction.finish()
  throw error
}
```

---

## 環境變數

```.env
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
NODE_ENV=production
```

---

## 參考資源

- https://docs.nestjs.com/recipes/sentry
- https://docs.sentry.io/platforms/javascript/guides/nestjs/
