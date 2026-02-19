# NestJS 微服務基礎

微服務核心架構、消息模式與通訊方式完整參考。

---

## 安裝

```bash
npm install --save @nestjs/microservices
```

---

## 基礎設置

### 創建微服務

```typescript
import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.TCP,
      options: {
        host: 'localhost',
        port: 3001,
      },
    },
  );
  await app.listen();
}
bootstrap();
```

### TCP 傳輸層選項

```typescript
{
  transport: Transport.TCP,
  options: {
    host: '0.0.0.0',           // 監聽所有網卡
    port: 3001,                // 端口
    retryAttempts: 5,          // 重試次數
    retryDelay: 3000,          // 重試延遲（毫秒）
  }
}
```

---

## 兩種通訊模式

### 1. 請求-響應（Request-Response）

適合需要同步返回結果的場景。

#### 服務端（Handler）

```typescript
import { Controller, MessagePattern, Payload } from '@nestjs/common';

@Controller()
export class MathController {
  @MessagePattern({ cmd: 'add' })
  add(@Payload() data: { a: number; b: number }): number {
    return data.a + data.b;
  }

  @MessagePattern({ cmd: 'multiply' })
  async multiply(data: { a: number; b: number }): Promise<number> {
    // 異步操作
    return data.a * data.b;
  }
}
```

#### 客戶端（Caller）

```typescript
import { Injectable } from '@nestjs/common';
import { ClientProxy, Inject } from '@nestjs/microservices';

@Injectable()
export class MathService {
  constructor(@Inject('MATH_SERVICE') private client: ClientProxy) {}

  add(a: number, b: number) {
    const pattern = { cmd: 'add' };
    return this.client.send<number>(pattern, { a, b });
  }
}
```

### 2. 事件驅動（Event-Based）

適合單向發送事件，不需要等待響應。

#### 服務端（Event Handler）

```typescript
@EventPattern('user_created')
handleUserCreated(@Payload() data: record<string, any>) {
  console.log('User created:', data);
  // 業務邏輯，無需返回響應
}
```

#### 客戶端（Event Emitter）

```typescript
publishUserCreated(user: any) {
  return this.client.emit('user_created', user);
}
```

---

## 模式匹配

### 對象模式

```typescript
@MessagePattern({ service: 'auth', action: 'login' })
login(@Payload() data: { username: string; password: string }) {
  return { token: 'jwt-token' };
}
```

### 字符串模式

```typescript
@MessagePattern('user.created')
onUserCreated(@Payload() data: any) {
  // 處理用戶建立事件
}
```

---

## 客戶端配置

### 使用 ClientsModule

```typescript
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'MATH_SERVICE',
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 3001,
        },
      },
    ]),
  ],
})
export class AppModule {}
```

### 異步配置

```typescript
ClientsModule.registerAsync([
  {
    imports: [ConfigModule],
    name: 'MATH_SERVICE',
    useFactory: async (configService: ConfigService) => ({
      transport: Transport.TCP,
      options: {
        host: configService.get('MICROSERVICE_HOST'),
        port: configService.get('MICROSERVICE_PORT'),
      },
    }),
    inject: [ConfigService],
  },
])
```

### 使用 @Client() 裝飾器

```typescript
import { Client, Transport } from '@nestjs/microservices';

@Injectable()
export class MathService {
  @Client({ transport: Transport.TCP })
  client: ClientProxy;

  add(a: number, b: number) {
    return this.client.send({ cmd: 'add' }, { a, b });
  }
}
```

---

## 發送消息和發佈事件

### 發送消息（期期望響應）

```typescript
async callSum() {
  const pattern = { cmd: 'sum' };
  const payload = [1, 2, 3];
  
  return this.client.send<number>(pattern, payload);
  // 返回 Observable<number>
}

// 訂閱結果
this.mathService.callSum().subscribe(result => {
  console.log('Sum:', result);
});
```

### 發佈事件（無需響應）

```typescript
async publishEvent() {
  return this.client.emit('user_updated', { id: 1, name: 'John' });
  // 返回 hot Observable
}
```

---

## 上下文（Context）

### 訪問消息上下文

```typescript
import { MessagePattern, Payload, Ctx } from '@nestjs/common';

@MessagePattern('sum')
sum(
  @Payload() data: number[],
  @Ctx() context: any,  // 根據傳輸層類型不同
) {
  console.log('Pattern:', context.getPattern?.());
  return (data || []).reduce((a, b) => a + b);
}
```

---

## 動態配置

### 使用 AsyncMicroserviceOptions

```typescript
import { AsyncMicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<AsyncMicroserviceOptions>(
    AppModule,
    {
      useFactory: (configService: ConfigService) => ({
        transport: Transport.TCP,
        options: {
          host: configService.get<string>('MICROSERVICE_HOST'),
          port: configService.get<number>('MICROSERVICE_PORT'),
        },
      }),
      inject: [ConfigService],
    },
  );

  await app.listen();
}
bootstrap();
```

---

## 連接管理

### 手動連接

```typescript
import { OnApplicationBootstrap } from '@nestjs/common';

@Injectable()
export class MathService implements OnApplicationBootstrap {
  constructor(@Inject('MATH_SERVICE') private client: ClientProxy) {}

  async onApplicationBootstrap() {
    // 應用啟動時連接微服務
    await this.client.connect();
  }
}
```

### 監聽連接狀態

```typescript
this.client.status.subscribe((status) => {
  console.log('Status:', status);  // { status: 'connected' }
});
```

### 超時控制

```typescript
import { timeout } from 'rxjs';

this.client
  .send({ cmd: 'sum' }, [1, 2, 3])
  .pipe(timeout(5000))  // 5 秒超時
  .subscribe(result => console.log(result));
```

---

## 混合應用（Hybrid Application）

在同一應用中同時支持 HTTP 和微服務：

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 連接微服務
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: { host: 'localhost', port: 3001 },
  });

  // 啟動應用
  await app.startAllMicroservices();
  await app.listen(3000);  // HTTP 端口
}
bootstrap();
```

---

## 示例完整流程

### 定義模塊

```typescript
// math.module.ts
@Module({
  controllers: [MathController],
  providers: [MathService],
})
export class MathModule {}

// app.module.ts
@Module({
  imports: [MathModule],
})
export class AppModule {}
```

### 服務端完整例子

```typescript
// math.controller.ts
@Controller()
export class MathController {
  @MessagePattern({ cmd: 'add' })
  add(@Payload() data: { a: number; b: number }): number {
    return data.a + data.b;
  }

  @EventPattern('calculation_requested')
  async handleCalcRequested(@Payload() data: any) {
    console.log('Calculation:', data);
  }
}
```

### 客戶端完整例子

```typescript
// app.service.ts
@Injectable()
export class AppService {
  constructor(
    @Inject('MATH_SERVICE') private mathClient: ClientProxy,
  ) {}

  add(a: number, b: number): Observable<number> {
    return this.mathClient.send({ cmd: 'add' }, { a, b });
  }

  requestCalculation(data: any): Observable<any> {
    return this.mathClient.emit('calculation_requested', data);
  }
}

// app.controller.ts
@Controller()
export class AppController {
  constructor(private appService: AppService) {}

  @Get('add/:a/:b')
  async add(@Param('a') a: number, @Param('b') b: number) {
    return this.appService.add(a, b).toPromise();
  }

  @Post('calculate')
  calculate(@Body() data: any) {
    this.appService.requestCalculation(data);
    return { ok: true };
  }
}
```

---

## 參考資源

- https://docs.nestjs.com/microservices/basics
- https://rxjs.dev/ (Observable)
