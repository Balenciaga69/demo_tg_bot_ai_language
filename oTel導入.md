# OpenTelemetry (OTel) + Prometheus 導入指南

這是一份極度嚴謹的實作指南，旨在指導開發者或 AI 代理在 NestJS Monorepo 專案中，逐步且安全地導入 OpenTelemetry (OTel) 並與 Prometheus 整合。

**核心原則：**

1. **單一職責：** 每個階段只做一件小事，確保可驗證。
2. **大一統架構：** 捨棄 `@willsoto/nestjs-prometheus`，全面改用 `@opentelemetry/sdk-node` 統一處理 Traces 與 Metrics。
3. **無侵入性優先：** 優先使用 Auto-Instrumentation，減少對業務代碼的修改。
4. **基礎設施先行：** 先建立可觀測的環境，再寫代碼。

---

## 階段一：建立監控基礎設施 (Docker Compose)

**目標：** 啟動 Prometheus 與 OpenTelemetry Collector，建立接收遙測數據的後端。

**為何這樣做：** 在應用程式發送數據之前，必須先有地方接收。OTel Collector 作為中繼站，可以接收 OTLP 數據並轉換為 Prometheus 格式供其抓取 (scrape)。

### 1.1 新增 OTel Collector 配置

在專案根目錄建立 `otel-collector-config.yaml`：

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
      exporters: [logging] # 暫時只印出 trace，後續可接 Jaeger
```

_說明：設定 OTLP 接收器 (port 4317/4318)，並將 metrics 導出為 Prometheus 格式 (port 8889)。_

### 1.2 新增 Prometheus 配置

在專案根目錄建立 `prometheus.yml`：

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'otel-collector'
    static_configs:
      - targets: ['otel-collector:8889']
```

_說明：設定 Prometheus 每 15 秒去抓取 OTel Collector 暴露的 metrics。_

### 1.3 修改 `docker-compose.yml`

在現有的 `docker-compose.yml` (或 `docker-compose.app.yml`) 中加入：

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

  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - '9090:9090'
    depends_on:
      - otel-collector
```

**預期結果：**
執行 `docker-compose up -d otel-collector prometheus` 後，訪問 `http://localhost:9090/targets`，應能看到 `otel-collector` 處於 `UP` 狀態。

---

## 階段二：安裝與配置 OTel SDK 依賴

**目標：** 在專案中安裝必要的 OpenTelemetry 套件。

**為何這樣做：** 準備好 Node.js 環境所需的 SDK，我們選擇 `@opentelemetry/sdk-node` 因為它封裝了大部分繁瑣的設定。

### 2.1 安裝依賴

在專案根目錄執行：

```bash
pnpm add @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-metrics-otlp-http @opentelemetry/exporter-trace-otlp-http @opentelemetry/resources @opentelemetry/semantic-conventions
```

_說明：_

- `sdk-node`: Node.js 的 OTel SDK 核心。
- `auto-instrumentations-node`: 自動攔截 HTTP, Express, NestJS 等常用庫。
- `exporter-*-otlp-http`: 透過 HTTP 傳送數據到 Collector。

### 2.2 移除舊有依賴 (若有)

如果專案中存在 `@willsoto/nestjs-prometheus` 或 `prom-client`，請將其移除，以確保架構統一。

```bash
pnpm remove @willsoto/nestjs-prometheus prom-client
```

**預期結果：**
`package.json` 中出現 OTel 相關依賴，且專案能正常 `pnpm install`。

---

## 階段三：建立 OTel 初始化腳本

**目標：** 撰寫 OTel SDK 的啟動邏輯。

**為何這樣做：** OTel 必須在應用程式 (NestJS) 啟動**之前**載入，才能成功攔截並 monkey-patch 底層模組 (如 `http`, `express`)。

### 3.1 建立 `instrumentation.ts`

在 `v2/libs/shared/src/` 下建立 `monitoring/instrumentation.ts`：

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http'
import { Resource } from '@opentelemetry/resources'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'

export function initTelemetry(serviceName: string) {
  const sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '1.0.0'
    }),
    traceExporter: new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ? `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces` : 'http://localhost:4318/v1/traces'
    }),
    metricReader: new (require('@opentelemetry/sdk-metrics').PeriodicExportingMetricReader)({
      exporter: new OTLPMetricExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ? `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/metrics` : 'http://localhost:4318/v1/metrics'
      }),
      exportIntervalMillis: 10000 // 每 10 秒導出一次
    }),
    instrumentations: [getNodeAutoInstrumentations()]
  })

  sdk.start()

  // 優雅關閉
  process.on('SIGTERM', () => {
    sdk
      .shutdown()
      .then(() => console.log('Tracing terminated'))
      .catch((error) => console.log('Error terminating tracing', error))
      .finally(() => process.exit(0))
  })

  return sdk
}
```

_說明：此腳本定義了服務名稱、導出目標 (OTLP HTTP)，並啟用了所有 Node.js 自動埋點。_

**預期結果：**
代碼編譯通過，無語法錯誤。

---

## 階段四：在應用程式中注入 OTel

**目標：** 讓 NestJS 應用程式在啟動時載入 OTel。

**為何這樣做：** 確保 OTel 在 `main.ts` 執行任何業務邏輯前生效。

### 4.1 修改環境變數

在 `.env` 檔案中加入：

```env
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

### 4.2 修改 `main.ts`

以 `v2/apps/telegram-bot/src/main.ts` 為例 (其他 app 依此類推)：

```typescript
// 必須是第一行！
import { initTelemetry } from '@shared/monitoring/instrumentation'
initTelemetry('telegram-bot')

import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  await app.listen(3000)
}
bootstrap()
```

_注意：`initTelemetry` 必須在任何其他 import (尤其是 `@nestjs/core`) 之前執行。_

**預期結果：**
啟動應用程式 (`npm run start:bot:dev`)，應用程式正常啟動，且終端機沒有報錯。

---

## 階段五：驗證與確認

**目標：** 確認遙測數據成功流向 Prometheus。

**為何這樣做：** 驗證整個資料流 (App -> OTel SDK -> OTel Collector -> Prometheus) 是否打通。

### 5.1 觸發數據

對你的 NestJS 應用程式發送幾個 HTTP 請求 (例如訪問隨便一個 API endpoint)。

### 5.2 檢查 OTel Collector 日誌

執行 `docker logs <otel-collector-container-id>`。
你應該會看到類似 `MetricsExporter` 或 `TracesExporter` 輸出接收到的數據 (因為我們在 config 中設定了 `logging` exporter)。

### 5.3 檢查 Prometheus

1. 打開瀏覽器訪問 `http://localhost:9090`。
2. 在搜尋框輸入 `http_server_duration_milliseconds_count` (或類似的 HTTP metrics)。
3. 點擊 Execute。

**預期結果：**
你應該能在 Prometheus 介面中看到帶有 `job="otel-collector"` 且 `service_name="telegram-bot"` 的 metrics 數據。

---

## 總結與下一步

完成以上五個階段後，你已經成功建立了一個基於 OTel 標準的監控基底。

**下一棒可以考慮的進階任務：**

1. 導入 Jaeger 接收 Traces 數據。
2. 在 NestJS 中實作自定義的 Span (手動埋點)。
3. 建立 Grafana Dashboard 來視覺化 Prometheus 收集到的 Metrics。
4. 調整 `getNodeAutoInstrumentations` 的配置，關閉不需要的自動埋點以節省效能。
