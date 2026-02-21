# NestJS BullMQ 隊列系統

使用 `@nestjs/bullmq` 和 `bullmq` 進行高效的分佈式任務隊列處理。基於 Redis 的消息隊列系統。

---

## 安裝依賴

```bash
npm install --save @nestjs/bullmq bullmq
```

---

## 模組配置

### 基本設置

```typescript
import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: 'localhost',
        port: 6379,
      },
    }),
  ],
})
export class AppModule {}
```

### 註冊隊列

```typescript
@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: 'localhost',
        port: 6379,
      },
    }),
    BullModule.registerQueue({
      name: 'audio',
    }),
    BullModule.registerQueue({
      name: 'email',
    }),
  ],
})
export class AppModule {}
```

### 異步配置

```typescript
BullModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: async (configService: ConfigService) => ({
    connection: {
      host: configService.get('REDIS_HOST'),
      port: configService.get('REDIS_PORT'),
    },
  }),
  inject: [ConfigService],
})
```

### 命名配置（多 Redis 實例）

```typescript
BullModule.forRoot('alternative-config', {
  connection: {
    port: 6381,
  },
})

// 在隊列中使用
BullModule.registerQueue({
  name: 'video',
  configKey: 'alternative-config',
})
```

---

## 生產者（Producers）

### 注入隊列

```typescript
import { Injectable } from '@nestjs/common'
import { Queue } from 'bullmq'
import { InjectQueue } from '@nestjs/bullmq'

@Injectable()
export class AudioService {
  constructor(@InjectQueue('audio') private audioQueue: Queue) {}
}
```

### 新增任務

```typescript
// 基本任務
await this.audioQueue.add('transcode', {
  foo: 'bar',
})

// 命名任務
const job = await this.audioQueue.add('transcode', {
  fileUrl: 'https://example.com/audio.mp3',
})

console.log(job.id) // 任務 ID
```

### 任務選項

```typescript
// 延遲執行（毫秒）
await this.audioQueue.add(
  'transcode',
  { foo: 'bar' },
  { delay: 3000 } // 3 秒後執行
)

// 優先級
await this.audioQueue.add(
  'transcode',
  { foo: 'bar' },
  { priority: 2 } // 1 = 最高優先級
)

// LIFO 順序
await this.audioQueue.add('transcode', { foo: 'bar' }, { lifo: true })

// 重試設置
await this.audioQueue.add(
  'transcode',
  { foo: 'bar' },
  {
    attempts: 3, // 嘗試次數
    backoff: {
      type: 'exponential',
      delay: 1000, // 初始延遲
    },
  }
)

// 定時任務（Cron）
await this.audioQueue.add(
  'report',
  { foo: 'bar' },
  {
    repeat: {
      pattern: '0 9 * * *', // 每天 9:00
    },
  }
)

// 完成後移除
await this.audioQueue.add('transcode', { foo: 'bar' }, { removeOnComplete: true })

// 失敗後移除
await this.audioQueue.add('transcode', { foo: 'bar' }, { removeOnFail: true })

// 自訂任務 ID
await this.audioQueue.add('transcode', { foo: 'bar' }, { jobId: 'custom-id-123' })
```

---

## 消費者（Consumers）

### 基本消費者

```typescript
import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Job } from 'bullmq'

@Processor('audio')
export class AudioConsumer extends WorkerHost {
  async process(job: Job<any, any, string>): Promise<any> {
    console.log(`Processing job ${job.id} of type ${job.name}`)

    switch (job.name) {
      case 'transcode': {
        // 處理轉錄邏輯
        return { success: true }
      }
      case 'concatenate': {
        // 處理連接邏輯
        return { success: true }
      }
      default:
        throw new Error(`Unknown job name: ${job.name}`)
    }
  }
}
```

### 進度更新

```typescript
@Processor('audio')
export class AudioConsumer extends WorkerHost {
  async process(job: Job<any>): Promise<any> {
    let progress = 0
    for (let i = 0; i < 100; i++) {
      await doSomething(job.data)
      progress += 1
      await job.updateProgress(progress) // 更新進度（0-100）
    }
    return {}
  }
}
```

### 請求作用域消費者

```typescript
import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Scope, Inject } from '@nestjs/common'
import { JOB_REF } from '@nestjs/bullmq'

@Processor({
  name: 'audio',
  scope: Scope.REQUEST,
})
export class AudioConsumer extends WorkerHost {
  constructor(@Inject(JOB_REF) private jobRef: Job) {
    super()
  }

  async process(job: Job<any>): Promise<any> {
    console.log(`Job ${job.id} in request scope`)
    return {}
  }
}
```

### 注冊消費者

消費者必須在模組的 `providers` 中註冊：

```typescript
@Module({
  providers: [AudioConsumer],
})
export class TelegramModule {}
```

---

## 事件監聽（Event Listeners）

### Worker 事件監聽

```typescript
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq'
import { Job } from 'bullmq'

@Processor('audio')
export class AudioConsumer extends WorkerHost {
  @OnWorkerEvent('active')
  onActive(job: Job) {
    console.log(`Job ${job.id} is active`)
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job, result: any) {
    console.log(`Job ${job.id} completed with result:`, result)
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    console.log(`Job ${job.id} failed:`, err.message)
  }

  @OnWorkerEvent('progress')
  onProgress(job: Job, progress: number) {
    console.log(`Job ${job.id} progress: ${progress}%`)
  }

  @OnWorkerEvent('stalled')
  onStalled(job: Job) {
    console.log(`Job ${job.id} stalled`)
  }
}
```

### Queue 事件監聽

```typescript
import { QueueEventsListener, QueueEventsHost, OnQueueEvent } from '@nestjs/bullmq'

@QueueEventsListener('audio')
export class AudioEventsListener extends QueueEventsHost {
  @OnQueueEvent('active')
  onActive(job: { jobId: string; prev?: string }) {
    console.log(`Job ${job.jobId} is now active`)
  }

  @OnQueueEvent('completed')
  onCompleted(job: { jobId: string }, result: any) {
    console.log(`Job ${job.jobId} completed`)
  }

  @OnQueueEvent('failed')
  onFailed(job: { jobId: string }, error: Error) {
    console.log(`Job ${job.jobId} failed:`, error.message)
  }

  @OnQueueEvent('waiting')
  onWaiting(jobId: string) {
    console.log(`Job ${jobId} is waiting`)
  }

  @OnQueueEvent('paused')
  onPaused() {
    console.log('Queue paused')
  }

  @OnQueueEvent('resumed')
  onResumed() {
    console.log('Queue resumed')
  }
}
```

### 註冊事件監聽

事件監聽器必須在模組的 `providers` 中註冊：

```typescript
@Module({
  providers: [AudioConsumer, AudioEventsListener],
})
export class TelegramModule {}
```

---

## 隊列管理

### 暫停和恢復

```typescript
@Injectable()
export class QueueManagementService {
  constructor(@InjectQueue('audio') private queue: Queue) {}

  async pauseQueue() {
    await this.queue.pause()
    console.log('Queue paused')
  }

  async resumeQueue() {
    await this.queue.resume()
    console.log('Queue resumed')
  }
}
```

### 獲取隊列統計

```typescript
async getQueueStats() {
  const counts = await this.queue.getJobCounts();
  // {
  //   active: 1,
  //   completed: 10,
  //   failed: 2,
  //   delayed: 5,
  //   waiting: 3,
  // }
  return counts;
}
```

### 獲取任務詳情

```typescript
async getJobDetails(jobId: string | number) {
  const job = await this.queue.getJob(jobId);
  if (job) {
    console.log('Job ID:', job.id);
    console.log('Job Name:', job.name);
    console.log('Progress:', job.progress());
    console.log('State:', await job.getState());
    console.log('Data:', job.data);
    console.log('Result:', job.returnvalue);
  }
}
```

### 移除任務

```typescript
async removeJob(jobId: string | number) {
  const job = await this.queue.getJob(jobId);
  if (job) {
    await job.remove();
  }
}
```

---

## Job Flows（任務流）

### 定義流結構

```typescript
import { Injectable } from '@nestjs/common'
import { FlowProducer } from 'bullmq'

@Injectable()
export class FlowService {
  private flowProducer: FlowProducer

  constructor() {
    this.flowProducer = new FlowProducer({
      connection: {
        host: 'localhost',
        port: 6379,
      },
    })
  }

  async createOrderFlow() {
    await this.flowProducer.add({
      name: 'order',
      queueName: 'main',
      data: { orderId: '123' },
      children: [
        {
          name: 'payment',
          queueName: 'payment-queue',
          data: { amount: 100 },
        },
        {
          name: 'notification',
          queueName: 'notification-queue',
          data: { email: 'user@example.com' },
        },
        {
          name: 'shipping',
          queueName: 'shipping-queue',
          data: { address: '123 Main St' },
        },
      ],
    })
  }
}
```

### 註冊 FlowProducer

```typescript
@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: 'localhost',
        port: 6379,
      },
    }),
    BullModule.registerFlowProducer({
      name: 'flowProducerName',
    }),
  ],
})
export class AppModule {}
```

---

## 進程隔離（Separate Processes）

### 使用 Sandboxed Processor

```typescript
import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { join } from 'node:path'

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'audio',
      processors: [join(__dirname, 'processor.js')],
    }),
  ],
})
export class AppModule {}
```

### Processor 文件

```typescript
// processor.ts
import { Job } from 'bullmq'

export default async function (job: Job) {
  console.log(`Processing job ${job.id}`, job.data)
  // 重邏輯操作（不會阻塞主線程）
  return { result: 'success' }
}
```

---

## 高級示例

### 完整的隊列集成

```typescript
@Injectable()
export class EmailService {
  constructor(@InjectQueue('email') private emailQueue: Queue) {}

  async sendWelcomeEmail(userId: string) {
    const job = await this.emailQueue.add(
      'welcome',
      { userId },
      {
        delay: 1000,
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
      }
    )
    return job.id
  }
}

@Processor('email')
export class EmailConsumer extends WorkerHost {
  constructor(private emailService: EmailService) {
    super()
  }

  async process(job: Job<any>): Promise<void> {
    switch (job.name) {
      case 'welcome': {
        const { userId } = job.data
        await this.emailService.sendEmail(userId, 'Welcome!')
        break
      }
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    console.error(`Email job ${job.id} failed:`, error)
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    console.log(`Email job ${job.id} sent successfully`)
  }
}
```

### 條件隊列註冊

```typescript
@Module({
  imports: [
    BullModule.forRoot({
      extraOptions: {
        manualRegistration: true,
      },
    }),
  ],
})
export class AppModule implements OnModuleInit {
  constructor(private bullRegistrar: BullRegistrar) {}

  onModuleInit() {
    if (process.env.ENABLE_QUEUE_PROCESSING === 'true') {
      this.bullRegistrar.register()
    }
  }
}
```

---

## 常見配置選項

### ConnectionOptions

```typescript
{
  host: string;          // Redis 主機
  port: number;          // Redis 端口（預設 6379）
  password?: string;     // Redis 密碼
  db?: number;           // Redis 數據庫編號
  maxRetriesPerRequest?: number; // 最大重試次數
  enableReadyCheck?: boolean;    // 準備好檢查
}
```

### JobOptions 核心屬性

```typescript
{
  attempts?: number;              // 重試次數
  backoff?: BackoffOpts;          // 退避策略
  delay?: number;                 // 延遲時間（毫秒）
  priority?: number;              // 優先級（1 = 最高）
  repeat?: RepeatOpts;            // 重複規則（Cron）
  lifo?: boolean;                 // LIFO 順序
  jobId?: string | number;        // 自訂任務 ID
  removeOnComplete?: boolean | number; // 完成後移除
  removeOnFail?: boolean | number;     // 失敗後移除
}
```

### 隊列配置

```typescript
{
  name: string;                   // 隊列名稱
  configKey?: string;             // 命名配置鍵
  defaultJobOptions?: JobOpts;    // 預設任務選項
  prefix?: string;                // 鍵前綴
  settings?: AdvancedSettings;    // 進階設置
}
```

---

## 相關文檔參考

- [NestJS BullMQ 文檔](https://docs.nestjs.com/techniques/queues)
- [BullMQ 官方文檔](https://docs.bullmq.io/)
- [BullMQ API 參考](https://api.docs.bullmq.io/)
