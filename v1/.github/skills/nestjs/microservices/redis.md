# NestJS Redis 微服務

基於 Redis Pub/Sub 的高性能微服務實現。

---

## 安裝

```bash
npm install --save ioredis
```

---

## 基本設置

### 服務端（Subscriber）

```typescript
import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.REDIS,
      options: {
        host: 'localhost',
        port: 6379,
      },
    },
  );
  await app.listen();
}
bootstrap();
```

### 客戶端配置

```typescript
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'REDIS_SERVICE',
        transport: Transport.REDIS,
        options: {
          host: 'localhost',
          port: 6379,
          // db: 0,           // Redis 數據庫編號
          // password: 'pwd', // Redis 密碼
        },
      },
    ]),
  ],
})
export class AppModule {}
```

---

## Redis 傳輸層選項

```typescript
{
  host: 'localhost',        // Redis 主機
  port: 6379,              // Redis 端口
  retryAttempts: 0,        // 重試次數
  retryDelay: 0,           // 重試延遲
  wildcards: false,        // 啟用野卡支持
  password: 'secret',      // 認證密碼
  db: 0,                   // 數據庫編號
  // 任何 ioredis 支持的選項都可以使用
}
```

---

## 消息模式

### 基本請求-響應

```typescript
import { Controller, MessagePattern, Payload } from '@nestjs/common';

@Controller()
export class NotificationController {
  @MessagePattern('send_email')
  sendEmail(@Payload() data: { to: string; subject: string }) {
    console.log(`Email sent to ${data.to}`);
    return { success: true };
  }

  @MessagePattern('send_sms')
  async sendSms(@Payload() data: { phone: string; message: string }) {
    // 異步操作
    return { message_id: '12345' };
  }
}
```

### 事件模式

```typescript
@EventPattern('order_created')
handleOrderCreated(@Payload() data: any) {
  console.log('Order created:', data);
  // 無需返回響應
}

@EventPattern('user_updated')
onUserUpdated(@Payload() data: any) {
  console.log('User updated:', data);
}
```

---

## 獲取 Redis 上下文

```typescript
import { MessagePattern, Payload, Ctx } from '@nestjs/common';
import { RedisContext } from '@nestjs/microservices';

@MessagePattern('notifications')
getNotifications(
  @Payload() data: number[],
  @Ctx() context: RedisContext,
) {
  console.log(`Channel: ${context.getChannel()}`);  // 獲取頻道名稱
  return { processed: true };
}
```

---

## 發送消息和事件

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class AppService {
  constructor(@Inject('REDIS_SERVICE') private client: ClientProxy) {}

  // 發送消息（期望響應）
  async sendEmail(to: string, subject: string) {
    return this.client
      .send('send_email', { to, subject })
      .toPromise();
  }

  // 發佈事件
  publishOrderCreated(order: any) {
    return this.client.emit('order_created', order);
  }

  // 批量發送
  async batchNotify(users: string[]) {
    for (const userId of users) {
      this.client.emit('notify', { userId }).subscribe();
    }
  }
}
```

---

## 野卡支持

### 啟用野卡

```typescript
{
  transport: Transport.REDIS,
  options: {
    host: 'localhost',
    port: 6379,
    wildcards: true,  // 啟用 psubscribe/pmessage
  },
}
```

### 使用野卡模式

```typescript
// 監聽所有 user 相關事件
@EventPattern('user.*')
handleUserEvents(@Payload() data: any, @Ctx() context: RedisContext) {
  const channel = context.getChannel();
  console.log(`User event on ${channel}:`, data);
  // channel 可能是 "user.created"、"user.updated" 等
}

// 監聽多層設備事件
@EventPattern('devices.*.temperature')
handleTemperature(@Payload() data: any) {
  // 匹配 "devices.room1.temperature"、"devices.room2.temperature" 等
  console.log('Temperature:', data);
}
```

### 發送到野卡模式

```typescript
// 客戶端發送
this.client.emit('user.created', userData).subscribe();
this.client.emit('user.updated', userData).subscribe();
this.client.emit('user.deleted', { id: 1 }).subscribe();
```

---

## 連接與事件監聽

### 1. 監聽連接狀態

```typescript
@Injectable()
export class RedisMonitorService {
  constructor(@Inject('REDIS_SERVICE') private client: ClientProxy) {
    this.monitorStatus();
  }

  private monitorStatus() {
    this.client.status.subscribe((status) => {
      console.log('Redis status:', status);
      // { status: 'connected' }
      // { status: 'disconnected' }
      // { status: 'reconnecting' }
    });
  }
}
```

### 2. 監聽錯誤事件

```typescript
this.client.on('error', (err) => {
  console.error('Redis error:', err);
});

// 服務端監聽
const server = app.connectMicroservice<MicroserviceOptions>(...);
server.on('error', (err) => {
  console.error('Microservice error:', err);
});
```

---

## 訪問底層 ioredis 實例

```typescript
const [pubClient, subClient] = this.client.unwrap<
  [import('ioredis').Redis, import('ioredis').Redis]
>();

// 使用原生 ioredis 方法
await pubClient.set('mykey', 'myvalue');
const value = await pubClient.get('mykey');
```

---

## 完整示例

### Redis 服務端

```typescript
// notification.controller.ts
@Controller()
export class NotificationController {
  @MessagePattern('send_notification')
  async sendNotification(@Payload() data: { userId: string; message: string }) {
    console.log(`Sending to ${data.userId}: ${data.message}`);
    return { notificationId: Date.now() };
  }

  @EventPattern('order.*')
  async handleOrderEvent(@Payload() data: any, @Ctx() ctx: RedisContext) {
    const channel = ctx.getChannel();
    console.log(`Order event: ${channel}`, data);
  }
}
```

### Redis 客戶端

```typescript
// notification.module.ts
@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'NOTIFICATION_SERVICE',
        transport: Transport.REDIS,
        options: {
          host: 'localhost',
          port: 6379,
          wildcards: true,
        },
      },
    ]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

// app.service.ts
@Injectable()
export class AppService {
  constructor(
    @Inject('NOTIFICATION_SERVICE') private client: ClientProxy,
  ) {}

  async sendNotification(userId: string, message: string) {
    return this.client
      .send('send_notification', { userId, message })
      .toPromise();
  }

  async publishOrderCreated(order: any) {
    return this.client.emit('order.created', order).toPromise();
  }

  async publishOrderUpdated(order: any) {
    return this.client.emit('order.updated', order).toPromise();
  }
}
```

---

## 性能優化

```typescript
// 配置連接池
{
  transport: Transport.REDIS,
  options: {
    host: 'redis-cluster.internal',
    port: 6379,
    retryAttempts: 5,
    retryDelay: 1000,
    // 增加 maxRetriesPerRequest 改善吞吐量
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  },
}
```

---

## 參考資源

- https://docs.nestjs.com/microservices/redis
- https://redis.io/topics/pubsub
- https://github.com/redis/ioredis
- https://www.npmjs.com/package/ioredis
