# NestJS 日誌系統

NestJS 內建日誌系統，並可集成 Winston、Pino 等外部日誌庫。

---

## 基本 Logger 使用

### 在 Service 中使用

```typescript
import { Logger, Injectable } from '@nestjs/common';

@Injectable()
export class CatsService {
  private readonly logger = new Logger(CatsService.name);

  create(cat: CreateCatDto) {
    this.logger.log(`Creating cat: ${cat.name}`);
    return 'Cat created';
  }

  findAll() {
    this.logger.debug('Fetching all cats');
    return [];
  }

  remove(id: string) {
    this.logger.warn(`Deleting cat with ID: ${id}`);
  }

  error(error: Error) {
    this.logger.error(`Error occurred: ${error.message}`, error.stack);
  }
}
```

### Logger 方法

```typescript
this.logger.log(message);        // 一般日誌
this.logger.error(message, stack);  // 錯誤日誌
this.logger.warn(message);       // 警告日誌
this.logger.debug(message);      // 調試日誌
this.logger.verbose(message);    // 詳細日誌
this.logger.fatal(message);      // 致命錯誤
```

---

## 基本自訂配置

### 禁用日誌

```typescript
const app = await NestFactory.create(AppModule, {
  logger: false,
});
```

### 指定日誌級別

```typescript
const app = await NestFactory.create(AppModule, {
  logger: ['error', 'warn'],  // 只显示錯誤和警告
});
```

### 自訂日誌格式

```typescript
import { ConsoleLogger } from '@nestjs/common';

const app = await NestFactory.create(AppModule, {
  logger: new ConsoleLogger({
    prefix: 'MyApp',
    timestamp: true,
    json: false,
    colors: true,
  }),
});
```

---

## ConsoleLogger 配置選項

```typescript
{
  logLevels: ['log', 'error', 'warn', 'debug', 'verbose'],
  timestamp: true,              // 显示時間戳
  prefix: 'Nest',               // 日誌前綴
  json: false,                  // JSON 格式
  colors: true,                 // 彩色輸出
  context: undefined,           // 日誌上下文
  compact: true,                // 緊湊格式
  maxArrayLength: 100,          // 陣列最大長度
  depth: 5,                     // 對象深度
}
```

---

## JSON 日誌輸出

```typescript
const app = await NestFactory.create(AppModule, {
  logger: new ConsoleLogger({
    json: true,
  }),
});

// 輸出格式：
// {
//   "level": "log",
//   "pid": 19096,
//   "timestamp": 1607370779834,
//   "message": "Message here",
//   "context": "ServiceName"
// }
```

---

## 自訂 Logger 實現

### 基本實現

```typescript
import { Injectable, LoggerService } from '@nestjs/common';

@Injectable()
export class MyLogger implements LoggerService {
  log(message: any, context?: string) {
    console.log(`[${context || 'APP'}] ${message}`);
  }

  error(message: any, trace?: string, context?: string) {
    console.error(`[${context || 'ERROR'}] ${message}`, trace);
  }

  warn(message: any, context?: string) {
    console.warn(`[${context || 'WARN'}] ${message}`);
  }

  debug(message: any, context?: string) {
    console.debug(`[${context || 'DEBUG'}] ${message}`);
  }

  verbose(message: any, context?: string) {
    console.log(`[${context || 'VERBOSE'}] ${message}`);
  }

  fatal(message: any, context?: string) {
    console.error(`[${context || 'FATAL'}] ${message}`);
  }
}
```

### 在 main.ts 中使用

```typescript
const app = await NestFactory.create(AppModule);
app.useLogger(new MyLogger());
await app.listen(process.env.PORT ?? 3000);
```

---

## 擴展 ConsoleLogger

```typescript
import { Injectable, Scope, ConsoleLogger } from '@nestjs/common';

@Injectable({ scope: Scope.TRANSIENT })
export class MyLogger extends ConsoleLogger {
  error(message: any, stackOrContext?: string) {
    // 添加自訂邏輯
    console.error('Custom error handling:', message);
    super.error(message, stackOrContext);
  }

  customLog(message: string) {
    this.log(`[CUSTOM] ${message}`);
  }
}
```

---

## 日誌時戳

### 啟用時戳記錄

```typescript
@Injectable()
export class MyService {
  private readonly logger = new Logger(MyService.name, { timestamp: true });

  doSomething() {
    this.logger.log('Doing something');
    // 輸出：[Nest] 19096 04/19/2024, 7:12:59 AM [MyService] Doing something +5ms
  }
}
```

---

## 與 Winston 集成

### 安裝 Winston

```bash
npm install winston
```

###  Winston Logger 實現

```typescript
import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';

@Injectable()
export class WinstonLogger implements LoggerService {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
        new winston.transports.Console({
          format: winston.format.simple(),
        }),
      ],
    });
  }

  log(message: string) {
    this.logger.info(message);
  }

  error(message: string, trace: string) {
    this.logger.error(message, { stack: trace });
  }

  warn(message: string) {
    this.logger.warn(message);
  }

  debug(message: string) {
    this.logger.debug(message);
  }

  verbose(message: string) {
    this.logger.verbose(message);
  }

  fatal(message: string) {
    this.logger.error(message, { level: 'fatal' });
  }
}
```

---

## 參考資源

- https://docs.nestjs.com/techniques/logger
- https://github.com/winstonjs/winston
