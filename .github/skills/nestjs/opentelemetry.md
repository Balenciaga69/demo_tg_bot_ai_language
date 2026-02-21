# NestJS OpenTelemetry 分散式追蹤

使用 OpenTelemetry 為 NestJS 應用程式加入可觀測性（Traces / Metrics / Logs）。
基於 OTLP 標準，與後端無關（Jaeger、Grafana Tempo、SigNoz 等皆可使用）。

> NestJS 官方**沒有**提供 OTel 套件，使用 `@opentelemetry/instrumentation-nestjs-core`（由 OpenTelemetry 社群維護）。

---

## 核心概念

| 概念                    | 說明                                                     |
| ----------------------- | -------------------------------------------------------- |
| **Trace**               | 一次完整請求的處理過程（跨服務）                         |
| **Span**                | Trace 的最小單元，代表一個操作的時間段                   |
| **Context Propagation** | 透過 HTTP Header 將 Trace Context 傳遞到下游服務         |
| **Instrumentation**     | 自動抓取特定套件操作資訊的機制（monkey-patch）           |
| **Exporter**            | 將 Telemetry 匯出至後端的元件（OTLP gRPC/HTTP、Console） |
| **Resource**            | 標示 Span 所屬實體資源的 Attributes（服務名稱、版本等）  |

---

## 安裝依賴

### 最小化安裝（精細控制）

```bash
pnpm install --save @opentelemetry/api
pnpm install --save @opentelemetry/sdk-node
pnpm install --save @opentelemetry/resources
pnpm install --save @opentelemetry/semantic-conventions
pnpm install --save @opentelemetry/instrumentation-nestjs-core  # NestJS 控制器追蹤
pnpm install --save @opentelemetry/instrumentation-http         # HTTP 自動追蹤與 Context Propagation
pnpm install --save @opentelemetry/exporter-trace-otlp-grpc    # gRPC Exporter（推薦）
# 或
pnpm install --save @opentelemetry/exporter-trace-otlp-http    # HTTP Exporter
```

### 一鍵全自動安裝（包含所有常見 instrumentation）

```bash
pnpm install --save @opentelemetry/api
pnpm install --save @opentelemetry/sdk-node
pnpm install --save @opentelemetry/auto-instrumentations-node   # 包含 NestJS、Express、TypeORM 等
pnpm install --save @opentelemetry/exporter-trace-otlp-http
pnpm install --save @opentelemetry/sdk-trace-base              # BatchSpanProcessor、Sampler 等
```

> `@opentelemetry/auto-instrumentations-node` 已內含 `instrumentation-nestjs-core`，支援 `@nestjs/core >= 4.0.0 < 12`。

---

## 套件說明

| 套件                                         | 說明                                                                    |
| -------------------------------------------- | ----------------------------------------------------------------------- |
| `@opentelemetry/api`                         | 核心 API（`trace`、`context`、`propagation`），用於自訂 instrumentation |
| `@opentelemetry/sdk-node`                    | Node.js SDK 主體，管理 trace 收集與匯出                                 |
| `@opentelemetry/instrumentation-nestjs-core` | 自動追蹤 NestJS Controller 的 Handler                                   |
| `@opentelemetry/instrumentation-http`        | 自動追蹤 HTTP 請求，並處理 Context Propagation                          |
| `@opentelemetry/auto-instrumentations-node`  | 批次安裝所有常見 instrumentation                                        |
| `@opentelemetry/exporter-trace-otlp-grpc`    | 透過 gRPC 匯出 Trace 到 Collector                                       |
| `@opentelemetry/exporter-trace-otlp-http`    | 透過 HTTP 匯出 Trace 到 Collector                                       |
| `@opentelemetry/resources`                   | 建立 Resource Attributes                                                |
| `@opentelemetry/semantic-conventions`        | Resource / Span Attribute 的標準命名常數                                |

---

## tracer.ts 設定

### 基本設定（精細控制）

```typescript
// src/tracer.ts
import { NodeSDK } from '@opentelemetry/sdk-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc'
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core'
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http'
import { Resource } from '@opentelemetry/resources'
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions'
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api'

function generateTracer(): NodeSDK {
  const traceExporter = new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317',
  })

  return new NodeSDK({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: process.env.SERVICE_NAME || 'nestjs-app',
    }),
    traceExporter,
    instrumentations: [new NestInstrumentation(), new HttpInstrumentation()],
  })
}

function main() {
  // （開發時）啟用 Debug Log
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG)

  const sdk = generateTracer()
  sdk.start()

  // Graceful Shutdown
  process.on('SIGTERM', () => {
    sdk
      .shutdown()
      .then(() => console.log('SDK shutdown successfully.'))
      .catch((err) => console.error('Error shutting down SDK.', err))
      .finally(() => process.exit(0))
  })
}

main()
```

### 全自動 + 生產環境優化設定

```typescript
// src/tracer.ts
import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import {
  ConsoleSpanExporter,
  BatchSpanProcessor,
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
} from '@opentelemetry/sdk-trace-base'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions'

const isProduction = process.env.NODE_ENV === 'production'

const traceExporter = isProduction
  ? new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || 'http://localhost:4318/v1/traces',
      headers: process.env.OTEL_EXPORTER_OTLP_HEADERS ? JSON.parse(process.env.OTEL_EXPORTER_OTLP_HEADERS) : {},
    })
  : new ConsoleSpanExporter() // 開發時印到 console

const sdk = new NodeSDK({
  // 生產環境採樣 10%，開發環境 100%
  sampler: new ParentBasedSampler({
    root: new TraceIdRatioBasedSampler(isProduction ? 0.1 : 1.0),
  }),

  // 批次匯出（效能更好）
  spanProcessor: new BatchSpanProcessor(traceExporter, {
    maxExportBatchSize: isProduction ? 200 : 50,
    exportTimeoutMillis: isProduction ? 5000 : 2000,
    scheduledDelayMillis: isProduction ? 2000 : 1000,
  }),

  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: process.env.SERVICE_NAME || 'nestjs-app',
    [ATTR_SERVICE_VERSION]: process.env.SERVICE_VERSION || '1.0.0',
  }),

  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false }, // 關閉高噪音的 fs
      '@opentelemetry/instrumentation-dns': { enabled: false },
      '@opentelemetry/instrumentation-http': {
        enabled: true,
        ignoreIncomingRequestHook: (req) => {
          // 忽略 health check，避免產生無意義的 Trace
          const ignorePaths = ['/health', '/metrics', '/favicon.ico']
          return ignorePaths.some((p) => req.url?.includes(p)) || false
        },
      },
    }),
  ],
})

export default sdk
```

---

## main.ts 初始化順序（關鍵！）

> **OTel 必須在任何其他模組之前初始化**，否則無法 patch 已載入的模組。

```typescript
// src/main.ts

// ✅ 正確：第一行匯入 tracer（精細控制版）
import './tracer'

// 或（全自動版，需先 await start）
import tracer from './tracer'

import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap() {
  // 若使用 export default sdk 方式，需在此 start
  await tracer.start()

  const app = await NestFactory.create(AppModule)
  await app.listen(process.env.PORT || 3000)
}

bootstrap()
```

```typescript
// ❌ 錯誤：NestJS 先於 tracer 載入
import { NestFactory } from '@nestjs/core'
import tracer from './tracer' // 太晚了，Express/HTTP 已被載入
```

---

## NestJS Instrumentation 自動生成的 Spans

| Span 名稱                       | 類型              | 說明                        |
| ------------------------------- | ----------------- | --------------------------- |
| `Create Nest App`               | `app_creation`    | NestFactory.create 啟動過程 |
| `<ControllerName>.<memberName>` | `request_context` | 整個 Request 處理週期       |
| `<memberName>`                  | `handler`         | 特定 Controller 方法的執行  |

### 自動收集的 Attributes

| Attribute             | 說明                        |
| --------------------- | --------------------------- |
| `nestjs.version`      | @nestjs/core 版本           |
| `nestjs.type`         | NestJS 元件類型             |
| `nestjs.controller`   | Controller class 名稱       |
| `nestjs.callback`     | Handler 方法名稱            |
| `http.route`          | 路由模式（如 `/users/:id`） |
| `http.request.method` | HTTP 方法                   |

---

## 自訂 Instrumentation

### @Traced() 裝飾器

```typescript
// src/decorators/traced.decorator.ts
import { trace, SpanStatusCode } from '@opentelemetry/api'

export function Traced(spanName?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value
    const tracer = trace.getTracer('nestjs-app', '1.0.0')

    descriptor.value = async function (...args: any[]) {
      const name = spanName || `${target.constructor.name}.${propertyKey}`

      return tracer.startActiveSpan(name, async (span) => {
        try {
          span.setAttributes({
            'method.class': target.constructor.name,
            'method.name': propertyKey,
          })
          const result = await originalMethod.apply(this, args)
          span.setStatus({ code: SpanStatusCode.OK })
          return result
        } catch (error) {
          span.recordException(error)
          span.setStatus({ code: SpanStatusCode.ERROR, message: error.message })
          throw error
        } finally {
          span.end()
        }
      })
    }
    return descriptor
  }
}
```

```typescript
// 使用方式
@Injectable()
export class UserService {
  @Traced('user_creation')
  async createUser(dto: CreateUserDto): Promise<User> {
    /* ... */
  }

  @Traced() // 預設名稱：UserService.findById
  async findById(id: string): Promise<User> {
    /* ... */
  }
}
```

### 手動建立 Span

```typescript
import { trace, SpanStatusCode } from '@opentelemetry/api'

@Injectable()
export class OrderService {
  private readonly tracer = trace.getTracer('order-service', '1.0.0')

  async processOrder(data: OrderDto) {
    return this.tracer.startActiveSpan('process_order', async (span) => {
      try {
        span.setAttributes({
          'order.userId': data.userId,
          'order.amount': data.amount,
        })
        const result = await this.doWork(data)
        span.setStatus({ code: SpanStatusCode.OK })
        return result
      } catch (error) {
        span.recordException(error)
        span.setStatus({ code: SpanStatusCode.ERROR, message: error.message })
        throw error
      } finally {
        span.end()
      }
    })
  }
}
```

---

## 微服務 Context Propagation

當跨服務發 HTTP 請求時，需手動注入 Trace Context 到 Header。

> 使用 `@opentelemetry/instrumentation-http` 時，HTTP 請求的 Context Propagation **自動處理**。
> 以下為手動注入方式（用於非 HTTP 情境或需要客製化時）：

```typescript
import { Injectable } from '@nestjs/common'
import { HttpService } from '@nestjs/axios'
import { trace, context, propagation, SpanStatusCode } from '@opentelemetry/api'
import { firstValueFrom } from 'rxjs'

@Injectable()
export class OrderService {
  private readonly tracer = trace.getTracer('order-service')

  constructor(private readonly httpService: HttpService) {}

  async callPaymentService(data: any) {
    return this.tracer.startActiveSpan('call_payment', async (span) => {
      try {
        // 將當前 Trace Context 注入 HTTP Header
        const headers: Record<string, string> = {}
        propagation.inject(context.active(), headers)

        const response = await firstValueFrom(
          this.httpService.post('http://payment-service/process', data, { headers })
        )

        span.setStatus({ code: SpanStatusCode.OK })
        return response.data
      } catch (error) {
        span.recordException(error)
        span.setStatus({ code: SpanStatusCode.ERROR, message: error.message })
        throw error
      } finally {
        span.end()
      }
    })
  }
}
```

---

## Graceful Shutdown（Service 封裝版）

```typescript
import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common'
import { NodeSDK } from '@opentelemetry/sdk-node'

@Injectable()
export class TelemetryService implements OnModuleDestroy {
  private readonly logger = new Logger(TelemetryService.name)
  private sdk: NodeSDK

  async initialize(sdk: NodeSDK): Promise<void> {
    this.sdk = sdk
    await this.sdk.start()
    process.on('SIGTERM', () => this.shutdown())
    process.on('SIGINT', () => this.shutdown())
    this.logger.log('OpenTelemetry initialized')
  }

  async onModuleDestroy(): Promise<void> {
    await this.shutdown()
  }

  private async shutdown(): Promise<void> {
    try {
      await this.sdk?.shutdown()
      this.logger.log('OpenTelemetry shutdown complete')
    } catch (error) {
      this.logger.error('Error shutting down OpenTelemetry', error)
    }
  }
}
```

---

## 環境變數

```bash
# 服務識別
OTEL_SERVICE_NAME=my-nestjs-app
OTEL_SERVICE_VERSION=1.0.0

# Exporter 設定（OTLP HTTP）
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces

# Exporter 設定（含 Auth Header，如 SigNoz Cloud）
OTEL_EXPORTER_OTLP_HEADERS={"signoz-ingestion-key":"<your-key>"}

# 語意化設定
OTEL_SEMCONV_STABILITY_OPT_IN=http  # 使用新版 HTTP 語意規範（v1.23.0+）

NODE_ENV=production
```

---

## 常見後端整合

| 後端                                 | Protocol    | 預設 Port   |
| ------------------------------------ | ----------- | ----------- |
| Grafana Tempo（透過 OTel Collector） | gRPC OTLP   | 4317        |
| Grafana Tempo（透過 OTel Collector） | HTTP OTLP   | 4318        |
| Jaeger                               | gRPC OTLP   | 4317        |
| SigNoz Cloud                         | HTTP OTLP   | 443         |
| OpenTelemetry Collector              | gRPC / HTTP | 4317 / 4318 |

### 快速架設 Grafana Tempo + OTel Collector（docker-compose）

```yaml
# otel-collector.yaml（關鍵設定）
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: '0.0.0.0:4317'
      http:
        endpoint: '0.0.0.0:4318'
```

---

## 除錯與疑難排解

### 問題 1：沒有 Trace 出現

```typescript
// 1. 用 ConsoleSpanExporter 確認是否有產生 Span
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base'
const sdk = new NodeSDK({ traceExporter: new ConsoleSpanExporter() })

// 2. 確認初始化順序：tracer 必須在第一行
import './tracer' // ✅ main.ts 最頂端
```

### 問題 2：記憶體持續增長

```typescript
import { EventEmitter } from 'events'
EventEmitter.defaultMaxListeners = 20 // 調高監聽器上限

// 並使用採樣降低壓力
sampler: new TraceIdRatioBasedSampler(0.1) // 只追蹤 10%
```

### 問題 3：微服務 Trace 斷開（無法串聯）

```typescript
// 確保所有服務使用相容的 Propagator
import { CompositePropagator, TraceContextPropagator, BaggagePropagator } from '@opentelemetry/core'

const sdk = new NodeSDK({
  textMapPropagator: new CompositePropagator({
    propagators: [
      new TraceContextPropagator(), // W3C 標準
      new BaggagePropagator(),
    ],
  }),
})
```

### 將 Trace ID 加入 Log

```typescript
import { trace } from '@opentelemetry/api'
import { Logger } from '@nestjs/common'

const logger = new Logger('OrderService')
const span = trace.getActiveSpan()

if (span) {
  const { traceId, spanId } = span.spanContext()
  logger.log(`Processing order`, { traceId, spanId, orderId })
}
```

---

## 效能影響參考

| 環境                       | 採樣率 | 預估 Overhead |
| -------------------------- | ------ | ------------- |
| 開發                       | 100%   | 10–15%        |
| 生產                       | 10%    | 5–10%         |
| 生產優化（BatchProcessor） | 10%    | 2–5%          |

---

## 相關文檔

- [OpenTelemetry JS 官方文檔](https://opentelemetry.io/docs/languages/js/)
- [@opentelemetry/instrumentation-nestjs-core](https://www.npmjs.com/package/@opentelemetry/instrumentation-nestjs-core)
- [opentelemetry-js-contrib GitHub](https://github.com/open-telemetry/opentelemetry-js-contrib)
- [SigNoz NestJS 整合指南](https://signoz.io/blog/opentelemetry-nestjs/)
- [Grafana Tempo 範例](https://github.com/grafana/tempo/tree/main/example/docker-compose/otel-collector)
