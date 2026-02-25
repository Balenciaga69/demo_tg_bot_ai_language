# v2-lab 架構與設計說明

---

## api-gateway 專案

### 整個專案用途
api-gateway 是整個微服務架構唯一的 HTTP 入口點。它做三件事：
1. 接收外部 HTTP 請求，建立任務並透過 RabbitMQ 分發給後端微服務
2. 監聽 RabbitMQ 上的完成事件，將多個服務的結果聚合後寫入 Redis
3. 提供查詢端點，讓 client 可以 poll 取得最終結果

### MetricsController 用途
暴露 `GET /metrics` 端點，輸出 Prometheus 文本格式的指標。Prometheus Server 會定期主動來 scrape 這個端點（pull 模型），收集請求數、延遲分佈、佇列大小等數據，再由 Grafana 呈現。

### PipelineController 用途
HTTP 入口，提供兩個端點：
- `POST /pipeline` → 202，生成 taskId，將任務非同步丟到 RabbitMQ，立即回傳 taskId（fire-and-forget）
- `GET /pipeline/:taskId` → 從 Redis 讀取聚合後的最終結果，若尚未完成則回 null

### RedisService 為何不是 global？global vs local 優缺點
這裡「global 無意義」，因為每個服務是獨立的 Node.js 進程，各自有獨立的 NestJS DI 容器。@Global() 的範圍只在同一個 NestJS 應用內，進程之間不共享。

| | Global (@Global()) | Local（現在做法） |
|---|---|---|
| 優點 | 任何 module 不用 import 就可注入；適合全應用共享的基礎建設（Logger, Config, DB） | 依賴明確，誰用誰聲明；單元測試易 mock |
| 缺點 | 隱式依賴，看不出哪个 module 真的用了它；誤用容易污染全域 | 代碼重複（每個獨立服務都需要自己的 RedisService） |

### ResultAggregatorController @MessagePattern 用途？RESTful 能進入嗎？
@MessagePattern 讓這個 controller 成為 RabbitMQ 消費者，監聽 stats.completed 和 transform.completed 兩個路由鍵。當兩個結果都進 Redis 後，aggregateResult() 才把最終 result:{taskId} 寫進去。

HTTP 完全無法觸發 @MessagePattern，這是 transport layer 決定的。這個 controller 從一開始就不是給 HTTP 用的，它是 api-gateway 作為「消費者」的那一面，負責接收來自 stats-service / transform-service 的完成通知。

### ClientsModule.register 用法
ClientsModule 是 NestJS 提供的 DI 容器，用來注入能發消息的客戶端（ClientProxy）。

| 用法 | 說明 |
|---|---|
| ClientsModule.register([...]) | 靜態同步配置，直接傳入設定物件，適合從 process.env 讀取（本專案的用法） |
| ClientsModule.registerAsync([...]) | 非同步配置，可注入 ConfigService 等依賴，適合複雜或需要 await 的設定 |

Transport 可以是：Transport.RMQ（RabbitMQ）、Transport.TCP、Transport.REDIS、Transport.NATS、Transport.KAFKA、Transport.GRPC...

注入後用 @Inject('RABBITMQ_CLIENT') private readonly rabbitmqClient: ClientProxy 取得。

### XXXModule.forRoot() vs forFeature()，不寫 forRoot 可以嗎？
forRoot() — 根層級配置，通常在 AppModule 呼叫一次。內部建立連線、資源等基礎建設，通常標記 global: true，讓整個應用共享。

forFeature() — 功能模組層級，依賴 forRoot 已建立的基礎。例如 TypeOrmModule.forFeature([UserEntity]) 表示「我這個模組想用 User 這張表」。

不寫 forRoot 可以嗎？
- ConfigModule.forRoot() 不寫 → process.env 不會被 .env 填充，環境變數要靠別的方式
- TypeOrmModule.forRoot() 不寫 → 沒有 DataSource 實例，forFeature() 完全失效
- 像 OTelModule（本專案）根本就沒有 forRoot/forFeature → 它是靜態 Module，只是把 initializeOTel() 這個副作用函式打包在一起，沒有動態配置需求

實際發生什麼：forRoot() 返回的是 DynamicModule（帶有動態 providers 的 module 物件），NestJS 在啟動時解析模組圖，把這些 providers 實例化並注冊進 IoC 容器。

---

## shared 專案

### Histogram、Counter、Gauge 是什麼？
這三個是 Prometheus 的核心指標類型（由 prom-client 實作）：

| 類型 | 特性 | 適合場景 |
|---|---|---|
| Counter | 只增不減，重啟歸零 | HTTP 請求總次數、錯誤次數、任務建立數 |
| Histogram | 將觀測值放入預定的 bucket 分桶統計，可算 p95/p99 | 響應時間、請求大小分佈 |
| Gauge | 可增可減，代表當前瞬時狀態 | 佇列長度、記憶體用量、同時連線數 |

### 使用 OTel 也要記錄這些指標嗎？
OTel 和 Prometheus 是兩個不同維度：
- prom-client / Prometheus → Metrics（數值型聚合，適合儀表板、告警）
- OTel → 主要做 Traces（分散式追蹤，記錄請求在多服務間的完整鏈路，帶有 span context）

OTel 也有 Metrics API 可以完全取代 prom-client（用 PrometheusExporter 暴露 /metrics），但這個專案目前分開用：prom-client 負責 metrics，OTel 負責 traces。兩者不衝突。

### prom-client 是標準套件嗎？NestJS 有更好的？OTel 支援嗎？
- prom-client 是 Node.js 生態實際標準，官方維護，幾乎所有 Node 專案直接用它
- NestJS 生態另有 @willsoto/nestjs-prometheus，提供更好的 DI 整合（用裝飾器宣告指標），以及 @nestjs/terminus 提供 health check 端點
- OTel 支援：OTel SDK 的 @opentelemetry/exporter-prometheus 可以將 OTel Metrics 以 Prometheus 格式暴露，理論上可以只用 OTel 全包，但 ecosystem 成熟度目前仍不如 prom-client 直接

### OTelModule 為何有 let sdk: NodeSDK？脫離生命週期會怎樣？
OTel 必須在 NestJS 啟動之前初始化，才能讓 auto-instrumentations-node 攔截到 HTTP、DB 等底層呼叫的 spans。所以 initializeOTel() 在 main.ts 最頂端、NestFactory.create() 之前被呼叫。

let sdk 是 module-level 的全域變數，脫離了 NestJS DI 生命週期，後果：
1. 無法被 DI 替換或 mock → 單元測試困難，每次跑測試都會帶著 OTel 副作用
2. 無法被 NestJS 的 OnModuleDestroy 管理 → shutdownOTel() 需要手動在 main.ts 的 graceful shutdown hook 裡呼叫
3. 如果 initializeOTel() 被多次呼叫 → 舊的 sdk 不會被 shutdown，可能造成 resource leak

這是 OTel 整合的已知妥協，目前社群普遍做法都是這樣。

### SEMRESATTRS 是啥的簡寫？
SEMRESATTRS = Semantic Resource Attributes（語意資源屬性）。
這是 OpenTelemetry Semantic Conventions 定義的標準常數，例如：
- SEMRESATTRS_SERVICE_NAME 實際值是字串 "service.name"
- SEMRESATTRS_SERVICE_VERSION → "service.version"

目的是讓所有語言的 OTel 實作、所有可觀測性後端（Jaeger、Tempo、Datadog）對資源屬性名稱有一致的理解，不會你寫 serviceName、我寫 service_name。

---

## stats-service、transform-service 專案

### stats-service 為何也有自己的 RedisService？
每個服務是獨立進程，DI 容器不共享。
stats-service 需要寫 stats:{taskId} 到 Redis，transform-service 需要寫 transform:{taskId}，兩者各自需要一條 Redis 連線。

這份代碼有重複是事實。改進方向是把 RedisService 移到 shared lib 並 export，各服務直接 import 使用，但需要確保 shared 的 package.json 和 barrel export (index.ts) 也要補上。

### ClientProxy 本質是什麼？
ClientProxy 是 NestJS microservices 的傳輸層抽象介面。本質是一個 RxJS 驅動的消息代理，底層可以替換成任何 transport（RabbitMQ、TCP、Redis、NATS、Kafka、gRPC）。

兩個核心方法：
- .emit(pattern, data) → fire-and-forget，用於不需要回應的事件（本專案全部用這個）
- .send(pattern, data) → request-response，返回 Observable，等對方 @MessagePattern 處理後回傳結果

### RabbitMQ 資料流怎麼流向？

```
HTTP Client
  │
  ↓ POST /pipeline
api-gateway (PipelineService)
  ├─ emit('stats.process', { taskId, text })
  └─ emit('transform.process', { taskId, text })
          │
          ▼ RabbitMQ
  ┌───────────────────────────────────┐
  │                                   │
  ↓                                   ↓
stats-service                 transform-service
StatsController               TransformController
  │ Redis: stats:{taskId}       │ Redis: transform:{taskId}
  │ emit('stats.completed')     │ emit('transform.completed')
  └──────────────┬──────────────┘
                 ▼ RabbitMQ → api_gateway_queue
        ResultAggregatorController
          onStatsCompleted / onTransformCompleted
          │ 若兩者皆存在於 Redis
          ↓ Redis: result:{taskId}

HTTP Client
  ↓ GET /pipeline/:taskId
api-gateway (PipelineService.getTaskResult)
  → 讀 Redis result:{taskId} 回傳
```

---

## 整體

### 整個 v2-lab 具體能做什麼？
本質是微服務架構的驗證實驗室。業務邏輯刻意簡單（文字統計 + 轉換），用來驗證以下整合是否正常運作：
- NestJS monorepo + 多服務並行處理
- RabbitMQ 事件驅動（emit → 消費 → 回報）
- Redis 作為跨服務共享狀態
- OpenTelemetry 分散式追蹤
- Prometheus metrics scraping

### 架構各角色和關係

```
┌─────────────────────────────────────────────────────┐
│  外部 HTTP Client                                    │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP
              ┌────────▼────────┐
              │   api-gateway   │  ← 唯一 HTTP 入口
              │  :3000          │    + RabbitMQ 消費者
              └──┬──────────┬───┘
        RabbitMQ │          │ RabbitMQ 監聽
      ┌──────────▼──┐  ┌────▼──────────┐
      │stats-service│  │transform-service│
      │ :3001 (MQ   │  │ :3002 (MQ only)│
      │ only)       │  └────────────────┘
      └─────────────┘
              │
         ┌────▼────┐
         │  Redis  │  ← 跨服務狀態共享
         │ :6379   │
         └─────────┘

         shared lib → 類型定義、PrometheusService、OTelModule
         RabbitMQ :5672 → 訊息傳遞
         OTel Collector → Traces
         Prometheus → Metrics
```

### YARP 與 api-gateway 定位一模一樣嗎？為何不用 nginx？
不一樣。YARP（C#）和 nginx 是純代理層，核心功能是路由轉發、負載均衡、TLS 終止、重試，本身不含業務邏輯。

這個 api-gateway 雖名為 gateway，實際上更接近 BFF（Backend for Frontend）或 Orchestrator：

| | nginx / YARP | 本專案 api-gateway |
|---|---|---|
| 路由轉發 | ✅ | 無 |
| 業務邏輯 | ❌ 不能 | ✅ taskId 生成、聚合 |
| 狀態操作 | ❌ | ✅ Redis 讀寫 |
| 消費 MQ 消息 | ❌ | ✅ @MessagePattern |
| 自訂 metrics | 有限 | ✅ 完整 prom-client |

不用 nginx 的原因：本專案的 gateway 需要有狀態的業務處理（接收 MQ 回報、Redis 聚合），這是 nginx 和 YARP 做不到的事。實務上若要兩者並用，nginx 放在最前面負責流量層（TLS、rate limit、static files），後面才是這個 NestJS api-gateway 負責業務協調。
