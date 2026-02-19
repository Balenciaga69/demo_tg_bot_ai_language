# NestJS 自訂傳輸策略

實現自訂微服務傳輸層與客戶端代理。

---

## 基本概念

建立完全自訂的微服務傳輸策略，支援任何消息系統（Google Cloud Pub/Sub、AWS Kinesis 等）。

---

## 自訂伺服器策略

### 建立策略類

```typescript
import { CustomTransportStrategy, Server } from '@nestjs/microservices';

class GoogleCloudPubSubServer extends Server implements CustomTransportStrategy {
  /**
   * 在 app.listen() 時觸發
   */
  listen(callback: () => void) {
    console.log('gRPC Pub/Sub server started');
    
    // 檢視已註冊的消息處理器
    console.log(this.messageHandlers);
    // Map { 'echo' => [AsyncFunction] { isEventHandler: false } }
    
    callback();
  }

  /**
   * 應用關閉時觸發
   */
  close() {
    console.log('gRPC Pub/Sub server closed');
  }

  /**
   * 註冊事件監聽（可選）
   */
  on(event: string, callback: Function) {
    throw new Error('Method not implemented.');
  }

  /**
   * 訪問底層驅動程序（可選）
   */
  unwrap<T = never>(): T {
    throw new Error('Method not implemented.');
  }
}
```

### 使用自訂策略

```typescript
const app = await NestFactory.createMicroservice<MicroserviceOptions>(
  AppModule,
  {
    strategy: new GoogleCloudPubSubServer(),  // 使用自訂策略
  },
);
```

---

## 訪問消息處理器

### 檢視所有處理器

```typescript
listen(callback: () => void) {
  // messageHandlers 是 Map<pattern, handler>
  console.log(this.messageHandlers);
  
  for (const [pattern, handler] of this.messageHandlers) {
    console.log(`Pattern: ${pattern}`);
    console.log(`Is event: ${handler.isEventHandler}`);
  }
  
  callback();
}
```

### 執行處理器

```typescript
async listen(callback: () => void) {
  const echoHandler = this.messageHandlers.get('echo');
  
  if (echoHandler) {
    // 執行消息處理器
    const result = await echoHandler('Hello world!');
    console.log('Result:', result);
  }
  
  callback();
}
```

### 處理 Observable 流

當使用攔截器時，處理器返回 RxJS Observable：

```typescript
import { isObservable } from '@nestjs/common';

async listen(callback: () => void) {
  const handler = this.messageHandlers.get('process');
  
  if (handler) {
    const streamOrResult = await handler('test data');
    
    // 檢查是否為 Observable
    if (isObservable(streamOrResult)) {
      // 訂閱流以執行攔截器邏輯
      streamOrResult.subscribe({
        next: (value) => console.log('Result:', value),
        error: (error) => console.error('Error:', error),
        complete: () => console.log('Done'),
      });
    } else {
      console.log('Sync result:', streamOrResult);
    }
  }
  
  callback();
}
```

---

## 自訂客戶端代理

### 建立客戶端客類

```typescript
import { ClientProxy, ReadPacket, WritePacket } from '@nestjs/microservices';

class GoogleCloudPubSubClient extends ClientProxy {
  async connect(): Promise<any> {
    console.log('Connecting to Google Cloud Pub/Sub...');
    // 建立連接邏輯
  }

  async close() {
    console.log('Closing connection...');
    // 清理資源
  }

  async dispatchEvent(packet: ReadPacket<any>): Promise<any> {
    console.log('Dispatching event:', packet);
    // 發佈事件
  }

  publish(
    packet: ReadPacket<any>,
    callback: (packet: WritePacket<any>) => void,
  ): Function {
    console.log('Publishing message:', packet);

    // 模擬 5 秒後獲得響應
    setTimeout(() => {
      callback({
        response: packet.data,
        isDisposed: true,  // 無更多數據
      });
    }, 5000);

    // 返回清理函數（teardown）
    return () => console.log('Teardown');
  }

  unwrap<T = never>(): T {
    throw new Error('Method not implemented.');
  }
}
```

### 使用自訂客戶端

```typescript
const client = new GoogleCloudPubSubClient();

client
  .send('pattern', 'Hello world!')
  .subscribe(
    (response) => console.log('Response:', response),
    (error) => console.error('Error:', error),
  );

// 預期輸出：
// connect
// Publishing message: { pattern: 'pattern', data: 'Hello world!' }
// Response: Hello world!
```

---

## 超時處理

### 應用超時操作符

```typescript
import { timeout } from 'rxjs';

client
  .send('pattern', 'Hello world!')
  .pipe(timeout(2000))  // 2 秒超時
  .subscribe(
    (response) => console.log('Response:', response),
    (error) => console.error('Timeout error:', error.message),
  );

// 預期輸出：
// connect
// Publishing message: ...
// teardown  // 由於超時，清理函數被調用
// Timeout has occurred
```

---

## 自訂消息序列化

### 自訂 ClientProxy

```typescript
import { ClientTcp, RpcException } from '@nestjs/microservices';

class ErrorHandlingProxy extends ClientTCP {
  // 自訂成功響應序列化
  serializeResponse(message: any) {
    return {
      timestamp: new Date(),
      data: message,
    };
  }

  // 自訂錯誤序列化
  serializeError(err: Error) {
    return new RpcException({
      message: err.message,
      originalError: err,
    });
  }
}
```

### 在模塊中使用

```typescript
@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'CUSTOM_SERVICE',
        customClass: ErrorHandlingProxy,  // 使用自訂類
        // 其他選項...
      },
    ]),
  ],
})
export class AppModule {}
```

---

## 完整示例：簡單內存傳輸層

### 服務端

```typescript
import { CustomTransportStrategy, Server } from '@nestjs/microservices';

class InMemoryServer extends Server implements CustomTransportStrategy {
  private handlers = new Map<string, Function>();

  listen(callback: () => void) {
    // 註冊所有處理器
    for (const [pattern, handler] of this.messageHandlers) {
      this.handlers.set(String(pattern), handler);
    }
    
    console.log('In-memory server started with handlers:', this.handlers.keys());
    callback();
  }

  close() {
    this.handlers.clear();
    console.log('In-memory server closed');
  }

  on(event: string, callback: Function) {}

  unwrap<T = never>(): T {
    return this.handlers as any;
  }
}
```

### 客戶端

```typescript
import { ClientProxy, ReadPacket, WritePacket } from '@nestjs/microservices';

class InMemoryClient extends ClientProxy {
  constructor(private handlers: Map<string, Function>) {
    super();
  }

  async connect(): Promise<any> {}
  async close() {}

  async dispatchEvent(packet: ReadPacket<any>): Promise<any> {
    const handler = this.handlers.get(String(packet.pattern));
    if (handler) {
      await handler(packet.data);
    }
  }

  publish(
    packet: ReadPacket<any>,
    callback: (packet: WritePacket<any>) => void,
  ): Function {
    const handler = this.handlers.get(String(packet.pattern));
    
    if (handler) {
      handler(packet.data).then((response: any) => {
        callback({ response, isDisposed: true });
      });
    } else {
      callback({ isDisposed: true });
    }

    return () => {};
  }

  unwrap<T = never>(): T {
    return this.handlers as any;
  }
}
```

---

## 主要概念總結

| 概念 | 說明 |
|------|------|
| `CustomTransportStrategy` | 實現自訂傳輸策略的接口 |
| `Server` | 基礎伺服器類，提供消息處理器管理 |
| `listen()` | 服務器啟動方法 |
| `close()` | 服務器關閉方法 |
| `ClientProxy` | 客戶端代理基礎類 |
| `connect()` | 建立連接 |
| `publish()` | 發送請求-響應消息 |
| `dispatchEvent()` | 發佈事件 |
| `isDisposed` | 表示是否有更多數據 |

---

## 參考資源

- https://docs.nestjs.com/microservices/custom-transport
- https://dev.to/nestjs/part-1-introduction-and-setup-1a2l
- https://dev.to/johnbiundo/series/4724
