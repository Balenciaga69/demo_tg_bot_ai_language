# OpenTelemetry (OTel) + Prometheus 導入指南 - v2 Monorepo 版

針對 `demo_tg_bot_ai_language/v2` 的完整 OTel 導入流程。本指南基於「全自動 + 生產環境優化」策略，運用 `@opentelemetry/auto-instrumentations-node` 統一處理 Traces 與 Metrics，最小化業務代碼侵入。

**核心特性：**

- ✅ **Monorepo 結構友善** - 共享 `libs/shared` 統一初始化邏輯
- ✅ **雙應用支援** - telegram-bot (HTTP) 與 stt-service (Microservice)
- ✅ **生產優化** - 批次導出、智能採樣、記憶體管理
- ✅ **無侵入性** - 自動埋點，無需修改業務代碼
- ✅ **可驗證** - 每個階段都有明確的預期結果

---

## 📋 前置檢查

執行以下檢查確認環境與現狀：

```powershell
# 1. 驗證 Docker 環境
docker-compose -f docker-compose.infrastructure.yml ps

# 2. 檢查現有依賴（確認無舊 prometheus 套件）
Select-String "prom-client|@willsoto/nestjs-prometheus" package.json

# 3. 檢查既有配置檔
Test-Path "otel-collector-config.yaml"
Test-Path "prometheus.yml"
```

---

## 🔧 第一階段：基礎設施確認與修正（耗時：20 分鐘）

**目標：** 確保 Docker Compose、Prometheus、OTel Collector 配置正確無誤。

### 1.1 驗證/修正 prometheus.yml

檢查 [v2/prometheus.yml](prometheus.yml)，確保 scrape targets 指向正確端點：

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'otel-collector'
    static_configs:
      - targets: ['otel-collector:8889'] # ✅ 必須是 8889（OTel Collector 暴露的 Prometheus port）
```

**常見錯誤：** ❌ `targets: ['localhost:9001']` 或 `['prometheus:9090']`

### 1.2 驗證 otel-collector-config.yaml

檢查 [v2/otel-collector-config.yaml](otel-collector-config.yaml)，確保包含以下關鍵配置：

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

exporters:
  prometheus:
    endpoint: '0.0.0.0:8889'
    namespace: 'nestjs_app'
  logging:
    verbosity: detailed

service:
  pipelines:
    metrics:
      receivers: [otlp]
      exporters: [prometheus, logging]
    traces:
      receivers: [otlp]
      exporters: [logging]
```

### 1.3 驗證 docker-compose.yml

檢查 [v2/docker-compose.yml](docker-compose.yml) 或 [v2/docker-compose.infrastructure.yml](docker-compose.infrastructure.yml)，確保包含 otel-collector 和 prometheus 服務：

```yaml
services:
  otel-collector:
    image: otel/opentelemetry-collector:latest
    command: ['--config=/etc/otel-collector-config.yaml']
    volumes:
      - ./otel-collector-config.yaml:/etc/otel-collector-config.yaml
    ports:
      - '4317:4317' # OTLP gRPC
      - '4318:4318' # OTLP HTTP
      - '8889:8889' # Prometheus exporter
    networks:
      - app-network

  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - '9090:9090'
    depends_on:
      - otel-collector
    networks:
      - app-network
```

### 1.4 驗證環境變數

在 [v2/.env](v2/.env) 中添加：

```env
# OpenTelemetry 配置
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_SERVICE_NAME=telegram-bot  # 會被 initTelemetry() 覆寫為各應用特定的名稱
NODE_ENV=development
```

同時在 [v2/.env.example](v2/.env.example) 中保持同步，供其他開發者參考。

**預期結果：**

```bash
# 啟動基礎設施
docker-compose up -d otel-collector prometheus

# 驗證
docker-compose ps
# 應看到 otel-collector 和 prometheus 為 Up

# 訪問 Prometheus UI
http://localhost:9090/targets
# 應看到 otel-collector job 為 UP 狀態
```

---

## 📦 第二階段：安裝 OTel 依賴（耗時：10 分鐘）

**目標：** 在 monorepo 中安裝必要的 OpenTelemetry 套件。

### 2.1 安裝依賴

在 [v2/](v2/) 根目錄執行：

```bash
pnpm add \
  @opentelemetry/api \
  @opentelemetry/sdk-node \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/sdk-trace-base \
  @opentelemetry/resources \
  @opentelemetry/semantic-conventions
```

**套件說明：**

| 套件                                        | 用途                                            |
| ------------------------------------------- | ----------------------------------------------- |
| `@opentelemetry/api`                        | 核心 API（trace、context、propagation）         |
| `@opentelemetry/sdk-node`                   | Node.js SDK 主體                                |
| `@opentelemetry/auto-instrumentations-node` | ⭐ **核心** - 自動埋點 NestJS、HTTP、Express 等 |
| `@opentelemetry/exporter-trace-otlp-http`   | Trace 導出至 OTel Collector                     |
| `@opentelemetry/sdk-trace-base`             | BatchSpanProcessor、Sampler 等                  |
| `@opentelemetry/resources`                  | 服務元資料（名稱、版本）                        |
| `@opentelemetry/semantic-conventions`       | 標準化屬性名稱常數                              |

### 2.2 驗證安裝

```bash
# 檢查 package.json 是否包含 OTel 相關依賴
Select-String "@opentelemetry" v2/package.json

# 確認 pnpm install 無誤
pnpm install
```

**預期結果：**

- `package.json` 中出現 7 個 OTel 相關依賴
- `pnpm install` 完成無誤
- 無重複或衝突提示

---

## 🎯 第三階段：建立共享 Monitoring 模組（耗時：30 分鐘）

**目標：** 在 `libs/shared` 建立統一的 OTel 初始化邏輯，供 telegram-bot 與 stt-service 共用。

### 3.1 建立目錄結構

```bash
# 在 v2/libs/shared/src 下建立 monitoring 資料夾
mkdir -p v2/libs/shared/src/monitoring
```

最終結構：

```
libs/shared/src/
├── monitoring/
│   ├── index.ts                    # 導出點
│   ├── instrumentation.ts          # OTel SDK 初始化（核心邏輯）
│   └── tracer.config.ts            # （選用）環境相關配置
├── audio/
├── config/
├── contracts/
├── index.ts                        # 需更新，加入 monitoring 導出
└── ...
```

### 3.2 建立 instrumentation.ts

在 [v2/libs/shared/src/monitoring/instrumentation.ts](v2/libs/shared/src/monitoring/instrumentation.ts) 建立初始化邏輯：

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { ConsoleSpanExporter, BatchSpanProcessor, ParentBasedSampler, TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions'

const isProduction = process.env.NODE_ENV === 'production'

/**
 * 初始化 OpenTelemetry SDK
 * 必須在 main.ts 最頂端呼叫，早於任何 NestJS import
 *
 * @param serviceName - 服務名稱（如 'telegram-bot' 或 'stt-service'）
 * @returns NodeSDK 實例
 *
 * @example
 * // main.ts 最頂端
 * import { initTelemetry } from '@shared/monitoring'
 * initTelemetry('telegram-bot')
 *
 * import { NestFactory } from '@nestjs/core'
 * // ... rest of imports
 */
export function initTelemetry(serviceName: string): NodeSDK {
  // 根據環境選擇 Exporter
  const traceExporter = isProduction
    ? new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ? `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces` : 'http://localhost:4318/v1/traces',
        headers: process.env.OTEL_EXPORTER_OTLP_HEADERS ? JSON.parse(process.env.OTEL_EXPORTER_OTLP_HEADERS) : {}
      })
    : new ConsoleSpanExporter() // 開發時直接打印到 console

  // 建立 SDK
  const sdk = new NodeSDK({
    // 生產環境採樣 10%，開發環境 100%（完整追蹤）
    sampler: new ParentBasedSampler({
      root: new TraceIdRatioBasedSampler(isProduction ? 0.1 : 1.0)
    }),

    // 批次導出（效能優化）
    spanProcessor: new BatchSpanProcessor(traceExporter, {
      maxExportBatchSize: isProduction ? 200 : 50,
      exportTimeoutMillis: isProduction ? 5000 : 2000,
      scheduledDelayMillis: isProduction ? 2000 : 1000
    }),

    // 服務元資料
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: serviceName,
      [ATTR_SERVICE_VERSION]: process.env.npm_package_version || '1.0.0'
    }),

    // 自動埋點（關鍵配置）
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false }, // 關閉高噪音
        '@opentelemetry/instrumentation-dns': { enabled: false }, // 關閉高噪音
        '@opentelemetry/instrumentation-http': {
          enabled: true,
          ignoreIncomingRequestHook: (req) => {
            // 忽略無意義的 Health Check 請求
            const ignorePaths = ['/health', '/metrics', '/favicon.ico']
            return ignorePaths.some((p) => req.url?.includes(p)) || false
          }
        }
      })
    ]
  })

  // 啟動 SDK
  sdk.start()

  // 優雅關閉
  const gracefulShutdown = async () => {
    try {
      await sdk.shutdown()
      console.log('OpenTelemetry SDK shutdown successfully')
    } catch (error) {
      console.error('Error shutting down OpenTelemetry SDK:', error)
    } finally {
      process.exit(0)
    }
  }

  process.on('SIGTERM', gracefulShutdown)
  process.on('SIGINT', gracefulShutdown)

  return sdk
}
```

### 3.3 建立 index.ts

在 [v2/libs/shared/src/monitoring/index.ts](v2/libs/shared/src/monitoring/index.ts) 建立導出點：

```typescript
export { initTelemetry } from './instrumentation'
```

### 3.4 更新共享庫導出

在 [v2/libs/shared/src/index.ts](v2/libs/shared/src/index.ts) 末尾加入：

```typescript
// 現有導出...
export * from './audio'
export * from './config'
export * from './contracts'

// ✅ 新增：Monitoring 模組導出
export * from './monitoring'
```

**預期結果：**

- 3 個新文件建立完成
- TypeScript 編譯無誤
- 可用 `import { initTelemetry } from '@shared/monitoring'` 引入

---

## 🚀 第四階段：修改 telegram-bot（HTTP 應用）（耗時：10 分鐘）

**目標：** 在 telegram-bot 中注入 OTel 初始化邏輯。

### 4.1 修改 main.ts

編輯 [v2/apps/telegram-bot/src/main.ts](v2/apps/telegram-bot/src/main.ts)，在 **最頂端** 加入：

```typescript
// ✅ 第一行：必須在任何其他 import 之前！
import { initTelemetry } from '@shared/monitoring'
initTelemetry('telegram-bot')

// 其他 import 後續
import 'tsconfig-paths/register'
import { INestApplication } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
// ... 其他 import
```

**關鍵要點：**

- ✅ `initTelemetry()` 必須在 `@nestjs/core` 之前執行
- ✅ 傳遞服務名稱 `'telegram-bot'`
- 其他代碼不變

### 4.2 驗證編譯

```bash
npm run build:bot
# 應無編譯錯誤
```

**預期結果：**

- 編譯成功
- 無 OTel 相關的運行期錯誤

---

## 🔄 第五階段：修改 stt-service（Microservice 應用）（耗時：10 分鐘）

**目標：** 在 stt-service 中注入 OTel，但需留意 TCP Microservice 的特殊性。

### 5.1 修改 main.ts

編輯 [v2/apps/stt-service/src/main.ts](v2/apps/stt-service/src/main.ts)，在 **最頂端** 加入：

```typescript
// ✅ 第一行：同樣必須在任何其他 import 之前！
import { initTelemetry } from '@shared/monitoring'
initTelemetry('stt-service')

// 其他 import 後續
import 'tsconfig-paths/register'
import { NestFactory } from '@nestjs/core'
// ... 其他 import

async function bootstrap() {
  // TCP Microservice 初始化
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(...)
  // ... 其他邏輯
}
```

### 5.2 ⚠️ Microservice OTel 支援注意事項

**TCP Microservice 的 OTel 自動追蹤有限制：**

- ✅ `@opentelemetry/auto-instrumentations-node` 主要針對 HTTP/Express/NestJS Controller
- ⚠️ TCP Microservice（基於 NestJS `MicroserviceOptions` 的 TCP transport）**未必能被自動埋點**
- 📌 Context Propagation 無法自動處理（TCP 不像 HTTP 有標準 Header 傳遞）

**解決策略（優先級排列）：**

1. **驗證優先（第六階段）** - 先啟動 stt-service，觀察 OTel Collector 日誌是否有 Trace 產生
2. **若無 Trace，補充手動埋點** - 在關鍵業務邏輯（Service 層）使用 `@Traced()` 裝飾器
3. **未來考慮 gRPC** - 若要完整 Trace，評估改用 gRPC transport（更易於 Context Propagation）

### 5.3 先驗證，後補充

暫時保持現狀，進行第六階段驗證。若 stt-service 的 Trace 未出現，再補充手動埋點。

---

## ✅ 第六階段：驗證與測試（耗時：40 分鐘）

**目標：** 確認整個 OTel 資料流打通，從應用 → OTel Collector → Prometheus。

### 6.1 啟動基礎設施與應用

```bash
# 1️⃣ 啟動 Docker 基礎設施
docker-compose -f docker-compose.infrastructure.yml up -d

# 驗證服務已啟動
docker-compose ps
# 確認 otel-collector 和 prometheus 為 Up

# 2️⃣ 編譯應用
npm run build:bot
npm run build:stt

# 3️⃣ 啟動應用（開發模式或生產模式）
# -- 終端 1：telegram-bot
npm run start:bot:dev

# -- 終端 2：stt-service
npm run start:stt
```

### 6.2 產生測試流量

對 telegram-bot 發送 HTTP 請求：

```bash
# 假設 telegram-bot 監聽 http://localhost:3000
curl http://localhost:3000/health
curl http://localhost:3000/<any-api-endpoint>

# 發送多次請求，產生足夠的 Trace 樣本
for ($i = 0; $i -lt 10; $i++) {
  curl http://localhost:3000/health
  Start-Sleep -Milliseconds 500
}
```

### 6.3 檢查 OTel Collector 日誌

```bash
# 查看 Collector 日誌，確認收到 Traces 與 Metrics
docker logs <otel-collector-container-id> --tail=50 -f

# 預期看到類似輸出：
# 2026-02-22T...Z    INFO    tracesexporter/traces_exporter.go:...
#   ResourceSpans #0
#   Resource labels (map-string string): service.name=telegram-bot
#   InstrumentationLibrarySpans #0
#   Span #0
#     ...
```

### 6.4 檢查 Prometheus

1. **開啟 Prometheus UI**

   ```
   http://localhost:9090
   ```

2. **驗證資料來源**
   - 訪問 `Status → Targets`
   - 確認 `otel-collector` job 為 `UP`

3. **搜尋 Metrics**
   - 在 `Graph` 分頁搜尋：`http_server_duration_milliseconds_total`
   - 或搜尋：`service_name="telegram-bot"`
   - 點擊 Execute，應看到數據點

4. **檢視 Trace Attributes**
   - 在圖表中應能看到標籤如 `job="otel-collector"`、`service_name="telegram-bot"`

### 6.5 驗收清單

完成以下檢查，確認導入成功：

```markdown
## Telegram-Bot (HTTP 應用)

- [ ] 應用啟動無誤，無 OTel 相關錯誤
- [ ] OTel Collector 日誌收到 Traces（service_name=telegram-bot）
- [ ] Prometheus 可搜尋到 http_server_duration_milliseconds_total
- [ ] Metrics 標籤包含 service_name="telegram-bot"

## STT-Service (Microservice 應用)

- [ ] 應用啟動無誤，無 OTel 相關錯誤
- [ ] OTel Collector 日誌是否收到 Traces（预期可能無法自動埋點）
  - ✅ 若有 Traces：無需額外操作
  - ⚠️ 若無 Traces：需補充手動埋點（見第七階段 - 進階）

## 基礎設施

- [ ] Docker Compose 服務全部 Up
- [ ] prometheus.yml targets 為 UP 狀態
- [ ] 未來可訪問 http://localhost:9090 查看 Metrics
```

---

## 🔍 常見問題排查

### 問題 1：Prometheus 看不到 otel-collector 為 UP

**原因：** prometheus.yml 的 targets 配置錯誤。

**解決：**

```yaml
# ❌ 錯誤
targets: ['localhost:9001']
targets: ['prometheus:9090']

# ✅ 正確
targets: ['otel-collector:8889']
```

重啟 prometheus 容器：

```bash
docker-compose restart prometheus
```

### 問題 2：應用啟動時 OTel 相關錯誤

**常見錯誤：**

```
Cannot find module '@opentelemetry/sdk-node'
```

**解決：**

```bash
pnpm install
```

若仍無法解決，檢查 [v2/package.json](v2/package.json) 是否包含依賴。

### 問題 3：沒有看到任何 Traces

**檢查清單：**

1. ✅ 確認 `initTelemetry()` 在 main.ts 最頂端
2. ✅ 確認環境變數 `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318`
3. ✅ 確認 OTel Collector 已啟動：`docker-compose ps`
4. ✅ 確認已產生請求流量
5. ✅ 開發模式下應看到 Console 日誌（ `ConsoleSpanExporter`）

若開發模式啟動應用，應在終端直接看到 Span 日誌：

```
ResourceSpans #0
Resource labels (map-string string): service.name=telegram-bot
InstrumentationLibrarySpans #0
Span #0
  Name: <ControllerName>.<methodName>
  ...
```

### 問題 4：STT-Service 無法自動埋點

**預期行為：** TCP Microservice 可能無法被自動埋點。

**驗證方法：**

- 檢查 OTel Collector 日誌是否有 stt-service 的 Traces
- 若無，進行第七階段（進階 - 手動埋點）

---

## 📞 第七階段（進階）：手動埋點與自訂 Span

若 stt-service 或其他服務無法被自動埋點，可補充手動埋點邏輯。詳見 [opentelemetry.md](.github/skills/nestjs/opentelemetry.md#自訂-instrumentation) 中的：

- **@Traced() 裝飾器** - 簡易裝飾器方案
- **手動建立 Span** - 細粒度控制

**快速範例：**

```typescript
import { trace, SpanStatusCode } from '@opentelemetry/api'
import { Injectable } from '@nestjs/common'

@Injectable()
export class SttProcessingService {
  private readonly tracer = trace.getTracer('stt-service', '1.0.0')

  async processAudio(audioBuffer: Buffer) {
    return this.tracer.startActiveSpan('process_audio', async (span) => {
      try {
        span.setAttributes({
          'audio.size': audioBuffer.length,
          'audio.format': 'wav'
        })
        const result = await this.doHeavyWork(audioBuffer)
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

詳細說明見 [opentelemetry.md](.github/skills/nestjs/opentelemetry.md)。

---

## 📊 完成後預期效果

完成所有階段後，你將擁有：

✅ **完整的 OTel 基礎設施**

- OTel Collector 接收並轉發 OTLP 數據
- Prometheus 定期抓取 metrics
- 可視化查看系統性能數據

✅ **自動埋點覆蓋**

- telegram-bot 所有 HTTP 請求自動追蹤
- NestJS Controller 層 Trace 自動生成
- Context Propagation 自動處理

✅ **生產級別配置**

- 採樣策略（生產 10%、開發 100%）
- 批次導出優化效能
- 優雅關閉邏輯

✅ **可擴展性**

- 可輕鬆補充手動埋點
- 可集成 Jaeger、Grafana Tempo 等後端
- 可建立自訂 Grafana Dashboard

---

## 📚 下一步建議

1. **完成基本驗證** - 確認 telegram-bot Traces 成功
2. **STT-Service 優化** - 若無自動埋點，補充手動埋點
3. **Grafana Dashboard** - 在 Prometheus 基礎上構建可視化
4. **Jaeger 整合**（可選）- 用於詳細的分散式追蹤視圖
5. **Alerts 設定**（可選）- 在 Prometheus 中設定告警規則

---

## 🔗 參考文檔

- 📖 [OpenTelemetry JS 官方文檔](https://opentelemetry.io/docs/languages/js/)
- 📖 [NestJS OpenTelemetry Skills](.github/skills/nestjs/opentelemetry.md)
- 📖 [原始導入指南](oTel導入.md)
- 📖 [NestJS 核心架構參考](.github/skills/nestjs/SKILL.md)

---

**最後更新：** 2026-02-22  
**適用版本：** v2 Monorepo  
**維護者：** AI Coding Agent
