import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { NodeSDK } from '@opentelemetry/sdk-node'
import {
  BatchSpanProcessor,
  ConsoleSpanExporter,
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
} from '@opentelemetry/sdk-trace-base'
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'

const isProduction = process.env.NODE_ENV === 'production'

function createTraceExporter(): OTLPTraceExporter | ConsoleSpanExporter {
  if (isProduction) {
    const headers: Record<string, string> = process.env.OTEL_EXPORTER_OTLP_HEADERS
      ? (JSON.parse(process.env.OTEL_EXPORTER_OTLP_HEADERS) as Record<string, string>)
      : {}

    return new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT
        ? `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`
        : 'http://localhost:4318/v1/traces',
      headers,
    })
  }

  return new ConsoleSpanExporter()
}

function createNodeSDK(serviceName: string, traceExporter: OTLPTraceExporter | ConsoleSpanExporter): NodeSDK {
  return new NodeSDK({
    sampler: new ParentBasedSampler({
      root: new TraceIdRatioBasedSampler(isProduction ? 0.1 : 1),
    }),

    spanProcessor: new BatchSpanProcessor(traceExporter, {
      maxExportBatchSize: isProduction ? 200 : 50,
      exportTimeoutMillis: isProduction ? 5000 : 2000,
      scheduledDelayMillis: isProduction ? 2000 : 1000,
    }),

    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: serviceName,
      [ATTR_SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
    }),

    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-dns': { enabled: false },
        '@opentelemetry/instrumentation-http': {
          enabled: true,
          ignoreIncomingRequestHook: (request) => {
            const ignorePaths = ['/health', '/metrics', '/favicon.ico']
            return ignorePaths.some((p) => request.url?.includes(p)) || false
          },
        },
      }),
    ],
  })
}

function setupGracefulShutdown(sdk: NodeSDK): void {
  const gracefulShutdown = async (): Promise<void> => {
    try {
      await sdk.shutdown()
      console.log('OpenTelemetry SDK shutdown successfully')
    } catch (error) {
      console.error('Error shutting down OpenTelemetry SDK:', error)
      throw error
    }
  }

  process.on('SIGTERM', () => {
    gracefulShutdown().catch((error) => {
      console.error('Failed to shutdown gracefully on SIGTERM:', error)
    })
  })

  process.on('SIGINT', () => {
    gracefulShutdown().catch((error) => {
      console.error('Failed to shutdown gracefully on SIGINT:', error)
    })
  })
}

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
  const traceExporter = createTraceExporter()
  const sdk = createNodeSDK(serviceName, traceExporter)
  sdk.start()
  setupGracefulShutdown(sdk)

  return sdk
}
