# NestJS 最小限度可行代碼參考

NestJS 核心元件 CheatSheet。

---

## Controller 基本路由

```typescript
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { MyService } from './my.service';

@Controller('users')
export class UsersController {
  constructor(private service: MyService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() data: any) {
    return this.service.create(data);
  }
}
```

**常用參數裝飾器**：`@Param()` | `@Query()` | `@Body()` | `@Headers()` | `@Ip()`

---

## Service 服務（Provider）

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class MyService {
  private data: any[] = [];

  create(item: any) {
    this.data.push(item);
    return item;
  }

  findAll() {
    return this.data;
  }

  findOne(id: string) {
    return this.data.find(item => item.id === id);
  }
}
```

**三種注入方式**：
- Constructor 注入（推薦）：`constructor(private dependency: MyService) {}`
- Property 注入：`@Inject('TOKEN') private dependency`
- Optional 注入：`constructor(@Optional() dependency?: MyService) {}`

---

## Module 模組

```typescript
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],  // 讓其他模組可使用
})
export class UsersModule {}
```

**在根模組中匯入**：
```typescript
@Module({
  imports: [UsersModule],
})
export class AppModule {}
```

---

## Guard 守衛（認證 / 授權）

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    return !!request.headers.authorization;  // 簡例
  }
}

// 使用：@UseGuards(AuthGuard)
```

---

## Interceptor 攔截器

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => ({
        statusCode: 200,
        data: data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}

// 使用：@UseInterceptors(TransformInterceptor)
```

---

## Exception Filter 異常過濾器

```typescript
import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    response.status(status).json({
      statusCode: status,
      message: exception.getResponse(),
      timestamp: new Date().toISOString(),
    });
  }
}

// 使用：@UseFilters(HttpExceptionFilter)
```

---

## Pipe 管道（驗證 / 轉換）

```typescript
import { PipeTransform, Injectable, BadRequestException, ArgumentMetadata } from '@nestjs/common';

@Injectable()
export class ParseIntPipe implements PipeTransform<string, number> {
  transform(value: string, metadata: ArgumentMetadata): number {
    const num = parseInt(value, 10);
    if (isNaN(num)) throw new BadRequestException('Must be a number');
    return num;
  }
}

// 使用：@Get(':id') findOne(@Param('id', ParseIntPipe) id: number)
```

**內建 Pipes**：`ParseIntPipe` | `ParseBoolPipe` | `ParseUUIDPipe` | `ValidationPipe`

---

## Custom Decorator 自訂裝飾器

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const User = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);

// 使用：@Get() findOne(@User('id') userId: string)
```

---

## Middleware 中間件

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    console.log(`${req.method} ${req.url}`);
    next();
  }
}

// 在 Module 中註冊
@Module({...})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('users');
  }
}
```

---

## 執行流程順序

```
Middleware → Guard → Interceptor (before) → Pipe 
  → Controller → Service → Interceptor (after) 
  → Exception Filter → Response
```

---

## 核心概念速查表

| 元件 | 用途 | 綁定方式 |
|------|------|--------|
| **Controller** | HTTP 請求處理 | `@Controller()` |
| **Service** | 業務邏輯容器 | `@Injectable()` |
| **Module** | 應用程序組織 | `@Module()` |
| **Guard** | 認證 / 授權 | `@UseGuards()` |
| **Interceptor** | 請求 / 回應轉換 | `@UseInterceptors()` |
| **Exception Filter** | 異常處理 | `@UseFilters()` |
| **Pipe** | 驗證 / 轉換 | `@UsePipes()` 或參數級別 |
| **Middleware** | 請求預處理 | `MiddlewareConsumer` |
| **Custom Decorator** | 提取 / 簡化代碼 | 直接裝飾參數或方法 |

---

## 應用程序啟動範例

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 全域綁定（可選）
  app.useGlobalGuards(new AuthGuard());
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  
  await app.listen(process.env.PORT || 3000);
}

bootstrap();
```

---

## 參考資源
- https://docs.nestjs.com/controllers
- https://docs.nestjs.com/providers
- https://docs.nestjs.com/modules
- https://docs.nestjs.com/middleware
- https://docs.nestjs.com/guards
- https://docs.nestjs.com/interceptors
- https://docs.nestjs.com/exception-filters
- https://docs.nestjs.com/pipes
- https://docs.nestjs.com/custom-decorators
- https://docs.nestjs.com/interceptors