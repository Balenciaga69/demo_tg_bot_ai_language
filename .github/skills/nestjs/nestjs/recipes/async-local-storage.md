# NestJS 非同步本地存儲 (Async Local Storage)

使用 AsyncLocalStorage 在請求生命週期中傳遞上下文。

---

## 基本概念

`AsyncLocalStorage` 是一個 Node.js API，提供了一種在應用程式中傳播本地狀態，而不需要顯式作為函數參數傳遞的方式。

---

## 自訂實現

### als.module.ts

```typescript
import { Module } from '@nestjs/common'
import { AsyncLocalStorage } from 'async_hooks'

@Module({
  providers: [
    {
      provide: AsyncLocalStorage,
      useValue: new AsyncLocalStorage(),
    },
  ],
  exports: [AsyncLocalStorage],
})
export class AlsModule {}
```

---

## 中間件設置

### app.module.ts

```typescript
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common'
import { AsyncLocalStorage } from 'async_hooks'
import { AlsModule } from './als/als.module'

@Module({
  imports: [AlsModule],
})
export class AppModule implements NestModule {
  constructor(private readonly als: AsyncLocalStorage) {}

  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req, res, next) => {
        const store = {
          userId: req.headers['x-user-id'],
          requestId: Date.now(),
        }
        this.als.run(store, () => next())
      })
      .forRoutes('*')
  }
}
```

---

## 在服務中使用

### cats.service.ts

```typescript
import { Injectable } from '@nestjs/common'
import { AsyncLocalStorage } from 'async_hooks'

@Injectable()
export class CatsService {
  constructor(private als: AsyncLocalStorage) {}

  getCatsForUser() {
    const store = this.als.getStore() as any
    const userId = store.userId

    // 使用 userId 獲取該用戶的貓
    return this.getCatsFromDatabase(userId)
  }

  private getCatsFromDatabase(userId: string) {
    // 數據庫查詢邏輯
    return []
  }
}
```

---

## 使用 nestjs-cls（推薦）

### 安裝

```bash
npm install nestjs-cls
```

### 設置

```typescript
import { Module } from '@nestjs/common'
import { ClsModule } from 'nestjs-cls'

@Module({
  imports: [
    ClsModule.forRoot({
      middleware: {
        mount: true,
        setup: (cls, req) => {
          cls.set('userId', req.headers['x-user-id'])
          cls.set('requestId', req.id)
        },
      },
    }),
  ],
})
export class AppModule {}
```

### 在服務中使用

```typescript
import { Injectable } from '@nestjs/common'
import { ClsService } from 'nestjs-cls'

@Injectable()
export class CatsService {
  constructor(private cls: ClsService) {}

  getCatsForUser() {
    const userId = this.cls.get('userId')
    const requestId = this.cls.get('requestId')

    console.log(`Getting cats for user ${userId} (request: ${requestId})`)
    return this.getCatsFromDatabase(userId)
  }
}
```

---

## 強類型存儲

### cls-store.ts

```typescript
import { ClsStore } from 'nestjs-cls'

export interface MyClsStore extends ClsStore {
  userId: string
  requestId: string
}
```

### 在服務中使用

```typescript
import { Injectable } from '@nestjs/common'
import { ClsService } from 'nestjs-cls'
import { MyClsStore } from './cls-store'

@Injectable()
export class CatsService {
  constructor(private cls: ClsService<MyClsStore>) {}

  getCatsForUser() {
    // 現在有自動完成和類型檢查
    const userId = this.cls.get('userId')
    return this.getCatsFromDatabase(userId)
  }
}
```

---

## 測試

```typescript
describe('CatsService', () => {
  let service: CatsService
  let cls: ClsService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [CatsService],
      imports: [ClsModule],
    }).compile()

    service = module.get(CatsService)
    cls = module.get(ClsService)
  })

  it('should get cats for user', async () => {
    const cats = await cls.runWith({ userId: '123', requestId: '456' }, () => service.getCatsForUser())

    expect(cats).toBeDefined()
  })
})
```

---

## 使用注意事項

1. **避免創建"上帝對象"** - 不要在存儲中存放過多無關數據
2. **性能考慮** - AsyncLocalStorage 有一定開銷，避免過度使用
3. **明確的上下文** - 保持存儲中的數據簡潔和明確
4. **文檔記錄** - 明確記錄存儲中的可用字段

---

## 參考資源

- https://docs.nestjs.com/recipes/async-local-storage
- https://github.com/Papooch/nestjs-cls
- https://nodejs.org/api/async_context.html
