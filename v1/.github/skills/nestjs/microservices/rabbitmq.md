# NestJS RabbitMQ 微服務

基於 RabbitMQ 的企業級消息隊列微服務實現。

---

## 安裝

```bash
npm install --save amqplib amqp-connection-manager
```

---

## 基本設置

### 服務端

```typescript
import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: ['amqp://guest:guest@localhost:5672'],
        queue: 'main_queue',
        queueOptions: {
          durable: true,  // 隊列持久化
        },
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
        name: 'RABBITMQ_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://guest:guest@localhost:5672'],
          queue: 'main_queue',
          queueOptions: {
            durable: true,
          },
        },
      },
    ]),
  ],
})
export class AppModule {}
```

---

## RabbitMQ 傳輸層選項

```typescript
{
  urls: ['amqp://localhost:5672'],         // RabbitMQ 連接 URL
  queue: 'my_queue',                       // 隊列名稱
  prefetchCount: 1,                        // 預取消息數
  isGlobalPrefetchCount: false,            // 全局預取
  noAck: true,                             // 自動確認模式
  consumerTag: 'my-consumer',              // 消費者標籤
  queueOptions: {
    durable: true,                         // 隊列持久化
    exclusive: false,
    autoDelete: false,
  },
  headers: {},                              // 消息頭
  persistent: true,                        // 消息持久化
  replyQueue: 'amq.rabbitmq.reply-to',    // 回覆隊列
  wildcards: false,                        // 啟用主題交換
  exchange: 'my_exchange',                 // 交換機名稱
  exchangeType: 'direct',                  // 交換機類型
  routingKey: 'routing_key',              // 路由鍵
}
```

---

## 消息模式

### 請求-響應

```typescript
import { Controller, MessagePattern, Payload } from '@nestjs/common';

@Controller()
export class TaskController {
  @MessagePattern('process_image')
  async processImage(@Payload() data: { imagePath: string }) {
    console.log('Processing:', data.imagePath);
    return { processed: true, size: 1024 };
  }

  @MessagePattern('convert_video')
  convertVideo(@Payload() data: { videoPath: string }) {
    return { status: 'converting', jobId: '12345' };
  }
}
```

### 事件模式

```typescript
@EventPattern('order_created')
handleOrderCreated(@Payload() data: any) {
  console.log('New order:', data);
  // 無需返回，只執行業務邏輯
}

@EventPattern('payment_received')
onPaymentReceived(@Payload() data: any) {
  console.log('Payment received:', data);
}
```

---

## 上下文與確認

### 訪問 RabbitMQ 上下文

```typescript
import { MessagePattern, Payload, Ctx } from '@nestjs/common';
import { RmqContext } from '@nestjs/microservices';

@MessagePattern('notifications')
getNotifications(
  @Payload() data: number[],
  @Ctx() context: RmqContext,
) {
  console.log(`Pattern: ${context.getPattern()}`);
  
  // 獲取原始消息
  const message = context.getMessage();
  console.log('Message:', message);
  
  // 獲取通道引用
  const channel = context.getChannelRef();
  
  return { processed: true };
}
```

### 手動消息確認

啟用手動確認模式：

```typescript
{
  transport: Transport.RMQ,
  options: {
    urls: ['amqp://localhost:5672'],
    queue: 'my_queue',
    noAck: false,  // 啟用手動確認
  },
}
```

處理消息確認：

```typescript
@MessagePattern('process_data')
async processData(
  @Payload() data: any,
  @Ctx() context: RmqContext,
) {
  try {
    console.log('Processing:', data);
    
    // 業務邏輯
    const result = await this.service.process(data);
    
    // 確認消息
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    channel.ack(originalMsg);
    
    return result;
  } catch (error) {
    // 否定確認並重新入隊
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    channel.nack(originalMsg, false, true);
    
    throw error;
  }
}
```

---

## 記錄構建器

### 設置消息選項

```typescript
import { RmqRecordBuilder } from '@nestjs/microservices';

async sendMessage() {
  const message = 'Process this data';
  const record = new RmqRecordBuilder(message)
    .setOptions({
      headers: {
        ['x-version']: '1.0.0',
        ['x-priority']: '10',
      },
      priority: 5,
      persistent: true,
    })
    .build();

  return this.client.send('process', record).toPromise();
}
```

### 讀取消息選項

```typescript
@MessagePattern('process')
process(
  @Payload() data: string,
  @Ctx() context: RmqContext,
) {
  const { properties: { headers } } = context.getMessage();
  console.log('Version:', headers['x-version']);
  return { ok: true };
}
```

---

## 野卡支持

### 啟用主題交換

```typescript
{
  transport: Transport.RMQ,
  options: {
    urls: ['amqp://localhost:5672'],
    queue: 'topic_queue',
    wildcards: true,        // 啟用野卡
    exchange: 'topic_exchange',
    exchangeType: 'topic',  // 主題交換類型
  },
}
```

### 使用野卡模式

```typescript
@MessagePattern('orders.#')  // # 匹配零個或多個詞
handleOrderTopic(@Payload() data: any, @Ctx() context: RmqContext) {
  console.log(`Pattern: ${context.getPattern()}`);  // "orders.created"、"orders.updated" 等
  return { received: true };
}

@MessagePattern('user.*.profile')  // * 匹配一個詞
updateProfile(@Payload() data: any) {
  // 匹配 "user.123.profile"、"user.john.profile" 等
  return { updated: true };
}
```

### 發送到野卡路由

```typescript
this.client.send('orders.created', orderData).subscribe();
this.client.send('orders.updated', orderData).subscribe();
this.client.emit('user.john.profile', profileData).subscribe();
```

---

## 連接與事件

### 連接狀態監聽

```typescript
this.client.status.subscribe((status: RmqStatus) => {
  console.log('Connection status:', status);
  // { status: 'connected' } | { status: 'disconnected' }
});

// 服務端
const server = app.connectMicroservice<MicroserviceOptions>(...);
server.status.subscribe((status: RmqStatus) => {
  console.log('Server status:', status);
});
```

### 錯誤監聽

```typescript
this.client.on('error', (err) => {
  console.error('Client error:', err);
});

server.on<RmqEvents>('error', (err) => {
  console.error('Server error:', err);
});
```

---

## 訪問底層驅動

```typescript
const manager = this.client.unwrap<
  import('amqp-connection-manager').AmqpConnectionManager
>();

// 使用原生 amqp-connection-manager API
await manager.connect();
```

---

## 完整示例

### 任務處理微服務（服務端）

```typescript
// task.controller.ts
@Controller()
export class TaskController {
  @MessagePattern('process_image')
  async processImage(
    @Payload() data: { imagePath: string },
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      console.log('Processing image:', data.imagePath);
      
      // 模擬處理
      const result = await this.imageService.process(data.imagePath);
      
      // 確認消息
      channel.ack(originalMsg);
      
      return result;
    } catch (error) {
      channel.nack(originalMsg, false, true);
      throw error;
    }
  }

  @EventPattern('image_processed')
  onImageProcessed(@Payload() data: any) {
    console.log('Image processed:', data);
  }
}
```

### 任務客戶端

```typescript
// task.service.ts
@Injectable()
export class TaskService {
  constructor(@Inject('TASK_SERVICE') private client: ClientProxy) {}

  async submitImage(imagePath: string) {
    const record = new RmqRecordBuilder(imagePath)
      .setOptions({
        persistent: true,
        priority: 5,
      })
      .build();

    return this.client.send('process_image', record).toPromise();
  }

  notifyProcessed(result: any) {
    return this.client.emit('image_processed', result);
  }
}
```

---

## 參考資源

- https://docs.nestjs.com/microservices/rabbitmq
- https://www.rabbitmq.com/
- https://github.com/amqp-node/amqplib
- https://github.com/jwalton/node-amqp-connection-manager
