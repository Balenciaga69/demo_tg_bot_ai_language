# NestJS 微服務異常過濾

微服務異常處理與自訂過濾器實現。

---

## 基本概念

微服務異常過濾器與 HTTP 過濾器類似，但必須返回 Observable。

---

## RpcException

### 拋出異常

```typescript
import { RpcException } from '@nestjs/microservices';

throw new RpcException('Invalid credentials.');

// 返回響應格式
{
  "status": "error",
  "message": "Invalid credentials."
}
```

### 自訂錯誤對象

```typescript
throw new RpcException({
  code: 'INVALID_INPUT',
  message: 'The input is invalid',
  details: {
    field: 'email',
    reason: 'Invalid email format',
  },
});
```

---

## 自訂異常過濾器

### 基本過濾器

```typescript
import { Catch, RpcExceptionFilter, ArgumentsHost } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { RpcException } from '@nestjs/microservices';

@Catch(RpcException)
export class ExceptionFilter implements RpcExceptionFilter<RpcException> {
  catch(exception: RpcException, host: ArgumentsHost): Observable<any> {
    return throwError(() => exception.getError());
  }
}
```

### 在方法上使用

```typescript
import { MessagePattern, UseFilters } from '@nestjs/common';

@UseFilters(new ExceptionFilter())
@MessagePattern({ cmd: 'sum' })
accumulate(data: number[]): number {
  return (data || []).reduce((a, b) => a + b);
}
```

---

## 全局異常過濾

```typescript
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    { transport: Transport.TCP },
  );

  // 註冊全局過濾器
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen();
}
bootstrap();
```

---

## 繼承基礎異常過濾

### 擴展 BaseRpcExceptionFilter

```typescript
import { Catch, ArgumentsHost } from '@nestjs/common';
import { BaseRpcExceptionFilter } from '@nestjs/microservices';

@Catch()
export class AllExceptionsFilter extends BaseRpcExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    console.log('Exception caught:', exception.message);
    
    // 呼叫基礎過濾器
    return super.catch(exception, host);
  }
}
```

### 自訂錯誤映射

```typescript
@Catch()
export class CustomExceptionFilter extends BaseRpcExceptionFilter {
  catch(exception: any, host: ArgumentsHost): Observable<any> {
    const status = exception.getStatus?.() || 500;
    const message = exception.message || 'Internal server error';

    const errorResponse = {
      statusCode: status,
      message: message,
      timestamp: new Date().toISOString(),
    };

    return throwError(() => new RpcException(errorResponse));
  }
}
```

---

## 特定異常處理

### 捕捉特定異常

```typescript
import { Catch, RpcExceptionFilter, ArgumentsHost } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';

class ValidationException extends Error {
  constructor(public errors: any) {
    super('Validation failed');
  }
}

@Catch(ValidationException)
export class ValidationFilter implements RpcExceptionFilter<ValidationException> {
  catch(exception: ValidationException, host: ArgumentsHost): Observable<any> {
    return throwError(() => new RpcException({
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      errors: exception.errors,
    }));
  }
}
```

### 多異常捕捉

```typescript
@Catch(ValidationException, TypeError, RangeError)
export class MultiExceptionFilter implements RpcExceptionFilter {
  catch(exception: any, host: ArgumentsHost): Observable<any> {
    let errorResponse;

    if (exception instanceof ValidationException) {
      errorResponse = {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
      };
    } else if (exception instanceof TypeError) {
      errorResponse = {
        code: 'TYPE_ERROR',
        message: 'Type error occurred',
      };
    } else {
      errorResponse = {
        code: 'UNKNOWN_ERROR',
        message: 'Unknown error',
      };
    }

    return throwError(() => new RpcException(errorResponse));
  }
}
```

---

## 日誌記錄

### 加入日誌

```typescript
import { Catch, RpcExceptionFilter, ArgumentsHost, Logger } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';

@Catch()
export class LoggingExceptionFilter extends BaseRpcExceptionFilter {
  private readonly logger = new Logger('RpcExceptionFilter');

  catch(exception: any, host: ArgumentsHost): Observable<any> {
    this.logger.error(
      `RPC Exception: ${exception.message}`,
      exception.stack,
    );

    return super.catch(exception, host);
  }
}
```

---

## 控制器級別應用

```typescript
import { Controller, UseFilters } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';

@Controller()
@UseFilters(CustomExceptionFilter)  // 控制器級別
export class MathController {
  @MessagePattern({ cmd: 'add' })
  add(data: { a: number; b: number }): number {
    if (!Number.isInteger(data.a) || !Number.isInteger(data.b)) {
      throw new RpcException('Both values must be integers');
    }
    return data.a + data.b;
  }
}
```

---

## 完整示例

### 自訂日誌和轉換過濾器

```typescript
@Catch()
export class GlobalExceptionFilter extends BaseRpcExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: any, host: ArgumentsHost): Observable<any> {
    const status = this.getStatus(exception);
    const message = this.getMessage(exception);

    this.logger.error({
      status,
      message,
      timestamp: new Date().toISOString(),
      stack: exception.stack,
    });

    return throwError(() => new RpcException({
      statusCode: status,
      message: message,
      timestamp: new Date().toISOString(),
    }));
  }

  private getStatus(exception: any): number {
    if (exception instanceof RpcException) {
      return 400;
    }
    if (exception instanceof TypeError) {
      return 422;
    }
    return 500;
  }

  private getMessage(exception: any): string {
    if (exception instanceof RpcException) {
      return exception.getError() as string;
    }
    return 'Internal server error';
  }
}
```

### 應用到模塊

```typescript
@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
```

---

## 最佳實踐

1. **始終返回 Observable** - 必須返回 Observable，不能直接返回值
2. **記錄異常** - 在過濾器中記錄異常便於調試
3. **自訂錯誤格式** - 創建一致的錯誤響應格式
4. **區分異常類型** - 不同類型異常進行不同處理
5. **使用 RpcException** - 預設使用 RpcException 拋出異常

---

## 參考資源

- https://docs.nestjs.com/microservices/exception-filters
- https://docs.nestjs.com/exception-filters
