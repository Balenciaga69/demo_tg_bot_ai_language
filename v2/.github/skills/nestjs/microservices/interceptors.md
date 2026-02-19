# NestJS 微服務攔截器（Interceptors）

微服務請求-響應轉換與增強實現。

---

## 基本概念

微服務攔截器與 HTTP 攔截器相似，用於在消息被處理前後執行邏輯。

---

## 基本攔截器

### 簡單日誌記錄

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const data = context.switchToRpc().getData();
    console.log('Message:', data);

    const now = Date.now();

    return next.handle().pipe(
      tap((result) => {
        console.log(`After: ${Date.now() - now}ms`);
        console.log('Result:', result);
      }),
    );
  }
}
```

### 在消息模式中使用

```typescript
import { MessagePattern, UseInterceptors } from '@nestjs/common';

@UseInterceptors(LoggingInterceptor)
@MessagePattern({ cmd: 'sum' })
accumulate(data: number[]): number {
  return (data || []).reduce((a, b) => a + b);
}
```

---

## 請求-響應轉換

### 數據轉換攔截器

```typescript
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => ({
        statusCode: 200,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
```

### 處理異常

```typescript
import { catchError } from 'rxjs';
import { throwError } from 'rxjs';

@Injectable()
export class ErrorHandlingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        console.error('Error occurred:', error);
        return throwError(() => new RpcException(error.message));
      }),
    );
  }
}
```

---

## 性能監控

### 執行時間追蹤

```typescript
@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = performance.now();

    return next.handle().pipe(
      tap(() => {
        const end = performance.now();
        const duration = end - start;

        if (duration > 1000) {
          console.warn(`Slow handler: ${duration.toFixed(2)}ms`);
        }
      }),
    );
  }
}
```

---

## 上下文增強

### 附加額外信息

```typescript
@Injectable()
export class ContextEnrichmentInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const data = context.switchToRpc().getData();
    
    // 添加時間戳
    data.processedAt = new Date();
    data.processingId = `${Date.now()}-${Math.random()}`;

    return next.handle().pipe(
      tap((result) => {
        result.processingId = data.processingId;
      }),
    );
  }
}
```

---

## 非同步操作

### 非同步認證檢查

```typescript
@Injectable()
export class AsyncAuthInterceptor implements NestInterceptor {
  constructor(private authService: AuthService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const data = context.switchToRpc().getData();

    // 非同步操作
    const isValid = await this.authService.validateRequest(data);

    if (!isValid) {
      throw new RpcException('Unauthorized');
    }

    return next.handle();
  }
}
```

---

## 多個攔截器

### 執行順序

攔截器按照註冊順序執行：

```typescript
@Controller()
@UseInterceptors(
  LoggingInterceptor,          // 1st
  PerformanceInterceptor,      // 2nd
  ErrorHandlingInterceptor,    // 3rd
)
export class AppController {
  @MessagePattern('action')
  action(data: any) {
    return { success: true };
  }
}
```

執行流程：
```
Request → Logging → Performance → ErrorHandling → Handler
Response ← Logging ← Performance ← ErrorHandling ← Handler
```

---

## 實際應用示例

### 完整日誌和監控攔截器

```typescript
@Injectable()
export class ComprehensiveInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Interceptor');

  constructor(private metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const data = context.switchToRpc().getData();
    const requestId = `${Date.now()}-${Math.random()}`;

    this.logger.debug(`[${requestId}] Incoming message:`, data);

    const start = performance.now();

    return next.handle().pipe(
      tap((result) => {
        const duration = performance.now() - start;
        this.logger.debug(
          `[${requestId}] Handler completed in ${duration.toFixed(2)}ms`,
        );

        // 記錄指標
        this.metricsService.recordHandlerExecution(duration);

        return result;
      }),
      catchError((error) => {
        this.logger.error(
          `[${requestId}] Handler failed: ${error.message}`,
          error.stack,
        );

        this.metricsService.recordHandlerError();

        return throwError(() => error);
      }),
    );
  }
}
```

### 使用攔截器

```typescript
@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ComprehensiveInterceptor,
    },
  ]
})
export class AppModule {}
```

---

## RxJS 操作符常用場景

### 1. 請求-響應轉換

```typescript
import { map } from 'rxjs/operators';

return next.handle().pipe(
  map((data) => ({
    success: true,
    data,
  })),
);
```

### 2. 錯誤恢復

```typescript
import { catchError, of } from 'rxjs';

return next.handle().pipe(
  catchError((error) => {
    console.error('Error, returning default:', error);
    return of({ default: true });
  }),
);
```

### 3. 超時

```typescript
import { timeout } from 'rxjs';

return next.handle().pipe(
  timeout(5000),  // 5 秒超時
);
```

### 4. 重試

```typescript
import { retry } from 'rxjs';

return next.handle().pipe(
  retry(3),  // 失敗後重試 3 次
);
```

---

## 完整工作流示例

### 定義攔截器

```typescript
@Injectable()
export class FullStackInterceptor implements NestInterceptor {
  private readonly logger = new Logger('FullStack');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const data = context.switchToRpc().getData();
    const startTime = Date.now();

    this.logger.log(`Processing: ${JSON.stringify(data)}`);

    return next.handle().pipe(
      map((result) => {
        const duration = Date.now() - startTime;
        return {
          statusCode: 200,
          message: 'Success',
          data: result,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString(),
        };
      }),
      catchError((error) => {
        this.logger.error(`Error: ${error.message}`);
        return throwError(
          () =>
            new RpcException({
              statusCode: 500,
              message: 'Internal server error',
              error: error.message,
            }),
        );
      }),
    );
  }
}
```

### 應用攔截器

```typescript
@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: FullStackInterceptor,
    },
  ],
})
export class AppModule {}
```
