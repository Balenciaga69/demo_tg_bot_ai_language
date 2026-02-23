import { Module } from '@nestjs/common'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { Resource } from '@opentelemetry/resources'
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions'

/**
 * OpenTelemetry 統一設定
 *
 * 所有微服務共享同一套 OTEL 設定，避免重複程式碼與設定不一致。
 * OTEL 必須在 NestJS app 啟動前初始化，才能捕獲完整 traces。
 */

let sdk: NodeSDK

export function initializeOTel(serviceName: string): void {
  const resource = Resource.default().merge(
    new Resource({
      [SEMRESATTRS_SERVICE_NAME]: serviceName,
      [SEMRESATTRS_SERVICE_VERSION]: '0.0.1'
    })
  )

  sdk = new NodeSDK({
    resource,
    instrumentations: [getNodeAutoInstrumentations()],
    traceExporter: new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318/v1/traces'
    })
  })

  sdk.start()
}

export async function shutdownOTel(): Promise<void> {
  if (sdk) {
    await sdk.shutdown()
  }
}

@Module({
  exports: []
})
export class OTelModule {}
