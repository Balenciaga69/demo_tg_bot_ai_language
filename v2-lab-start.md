---
description: v2-lab 完整启动计画
version: 1.0
createDate: 2026-02-23
---

# v2-lab 启动计画 - 完整指南

## 0. 项目概述

### 目标

验证 NestJS 微服务架构中，以下核心工具与模式的可行性：

- ✅ Monorepo 多包管理
- ✅ 微服务间 RabbitMQ 通讯
- ✅ OpenTelemetry 可观测性（链路追踪）
- ✅ Prometheus + Grafana 监控
- ✅ 自动化 CI/CD 脚本

### 业务逻辑（超简单）

**文本处理管道系统**

```
┌─────────────────────────────────────────────────────────┐
│ 用户请求（HTTP POST /pipeline）                         │
│ 输入：{ "text": "hello world" }                          │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────┐
│ API Gateway Service                                      │
│ 职责：接收请求、验证、发送消息到消息队列                │
│ 输出：{ "taskId": "uuid" }                              │
└────────────┬─────────────────────────────────────────────┘
             │
             ▼
      [RabbitMQ Exchange]
             │
    ┌────────┴────────┐
    ▼                 ▼
┌────────────────┐  ┌────────────────┐
│ Stats Service  │  │ Transform Svc  │
│                │  │                │
│ 计算：         │  │ 处理：         │
│ - 字符数       │  │ - 转大写       │
│ - 单词数       │  │ - 转小写       │
│ - 空格数       │  │ - 字符翻转     │
└────────┬───────┘  └────────┬───────┘
         │                   │
         └────────┬──────────┘
                  ▼
          [RabbitMQ Result Queue]
                  │
                  ▼
        ┌─────────────────────┐
        │ Result Handler      │
        │ (API Gateway中)     │
        │ 聚合结果、响应客户端│
        └─────────────────────┘
```

### 项目结构

```
v2-lab/
├── packages/
│   ├── api-gateway/           # HTTP 入口点 + 结果收集
│   ├── stats-service/         # 微服务1：文本统计
│   ├── transform-service/     # 微服务2：文本转换
│   └── shared/                # 共享库（OTEL、types、utils）
├── docker/
│   ├── docker-compose.yml     # 基础设施（RabbitMQ、Redis）
│   └── otel-collector-config.yaml
├── .eslintrc.json
├── package.json               # Monorepo 根配置
├── pnpm-workspace.yaml        # Monorepo 声明
├── tsconfig.json
├── tsconfig.build.json
└── v2-lab-start.md           # 本文档
```

---

## 阶段 1: Monorepo 初始化 + 基础架构

### 1.1 为什么这样做？

**Monorepo 的优势：**

- 统一依赖管理：避免包版本不一致
- 共享代码：`shared` 库可被所有微服务使用
- 统一构建流程：一条命令构建全部
- 原子提交：多个包的更改在一个 git commit

**pnpm 的选择：**

- 磁盘空间效率高（软链接）
- 严格的依赖隔离（防止幽灵依赖）
- monorepo 支持成熟

### 1.2 初始化步骤

#### Step 1.2.1 创建目录结构

```powershell
# 在 v2-lab 目录中执行
cd c:\Users\wits\Desktop\GitRepo\demo_tg_bot_ai_language\

# 创建 v2-lab 目录
mkdir v2-lab
cd v2-lab

# 创建子目录
mkdir packages
mkdir docker
```

#### Step 1.2.2 初始化 Monorepo 根 package.json

在 `v2-lab/package.json` 中创建：

```json
{
  "name": "v2-lab",
  "version": "0.0.1",
  "description": "NestJS Microservices Lab - Architecture Validation",
  "author": "",
  "private": true,
  "license": "UNLICENSED",
  "scripts": {
    "build": "nest build",
    "build:all": "nest build api-gateway && nest build stats-service && nest build transform-service",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:all:dev": "concurrently --kill-others \"nest start api-gateway --watch\" \"nest start stats-service --watch\" \"nest start transform-service --watch\"",
    "format": "prettier --write \"packages/**/*.ts\"",
    "lint": "eslint \"{packages}/**/*.ts\"",
    "lint:fix": "eslint \"{packages}/**/*.ts\" --fix",
    "test": "jest",
    "docker:up": "docker-compose -f docker/docker-compose.yml up -d",
    "docker:down": "docker-compose -f docker/docker-compose.yml down"
  },
  "dependencies": {
    "@nestjs/common": "^11.0.0",
    "@nestjs/core": "^11.0.0",
    "@nestjs/microservices": "^11.0.0",
    "@nestjs/platform-express": "^11.0.0",
    "@nestjs/config": "^4.0.0",
    "@opentelemetry/api": "^1.9.0",
    "@opentelemetry/sdk-node": "^0.212.0",
    "@opentelemetry/auto-instrumentations-node": "^0.70.0",
    "@opentelemetry/resources": "^2.5.0",
    "@opentelemetry/semantic-conventions": "^1.39.0",
    "@opentelemetry/exporter-trace-otlp-http": "^0.212.0",
    "@opentelemetry/sdk-trace-base": "^2.5.0",
    "amqplib": "^0.10.3",
    "redis": "^4.7.0",
    "prom-client": "^15.0.0",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.1",
    "uuid": "^9.0.1",
    "reflect-metadata": "^0.1.14",
    "rxjs": "^7.8.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^11.0.0",
    "typescript": "^5.3.0",
    "@types/node": "^20.10.0",
    "concurrently": "^8.2.0",
    "ts-loader": "^9.5.0",
    "@typescript-eslint/eslint-plugin": "^6.13.0",
    "@typescript-eslint/parser": "^6.13.0",
    "eslint": "^8.54.0",
    "prettier": "^3.1.0"
  }
}
```

**为什么这样配置？**

- `@opentelemetry/*`: OTEL 完整链路追踪堆栈
- `amqplib`: RabbitMQ 客户端
- `prom-client`: Prometheus metrics 导出
- `concurrently`: 并行启动多个微服务

#### Step 1.2.3 创建 pnpm-workspace.yaml

在 `v2-lab/pnpm-workspace.yaml`：

```yaml
packages:
  - 'packages/*'
```

**为什么？**

- 声明所有 `packages/*` 目录为独立包
- pnpm 会正确处理包间依赖解析

#### Step 1.2.4 创建 tsconfig.json 和 tsconfig.build.json

`v2-lab/tsconfig.json`：

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2021",
    "lib": ["ES2021"],
    "outDir": "./dist",
    "rootDir": ".",
    "baseUrl": ".",
    "paths": {
      "@app-gateway/*": ["packages/api-gateway/src/*"],
      "@stats-service/*": ["packages/stats-service/src/*"],
      "@transform-service/*": ["packages/transform-service/src/*"],
      "@shared/*": ["packages/shared/src/*"]
    },
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true
  },
  "include": ["packages"]
}
```

**路径别名的目的：**

- `@shared/*`: 轻松导入共享库，避免 `../../../` 地狱
- 提高代码可读性和可维护性

`v2-lab/tsconfig.build.json`：

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "dist", "packages/**/test"]
}
```

#### Step 1.2.5 创建 .eslintrc.json

在 `v2-lab/.eslintrc.json`：

```json
{
  "parser": "@typescript-eslint/parser",
  "extends": ["eslint:recommended", "plugin:@typescript-eslint/eslint-recommended", "plugin:@typescript-eslint/recommended"],
  "parserOptions": {
    "ecmaVersion": 2021,
    "sourceType": "module"
  },
  "env": {
    "node": true,
    "es2021": true
  },
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-types": "warn",
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  }
}
```

**严格规则的原因：**

- `no-explicit-any`: 强制类型安全
- 防止代码质量下滑

#### Step 1.2.6 安装依赖

```powershell
cd v2-lab
pnpm install
```

**预期结果：**

```
✓ pnpm install 完成
✓ node_modules 目录创建
✓ pnpm-lock.yaml 生成
```

---

## 阶段 2: 创建 Monorepo 包结构

### 2.1 为什么分离成多个包？

**微服务独立性：**

- 各微服务可独立构建、部署
- 清晰的依赖边界
- 便于未来容器化

**文件组织：**

```
packages/
  ├── shared/           # 跨服务公用代码
  │   └── src/
  │       ├── otel/
  │       ├── types/
  │       └── utils/
  ├── api-gateway/      # 微服务1
  ├── stats-service/    # 微服务2
  └── transform-service/# 微服务3
```

### 2.2 创建 Shared 库

#### Step 2.2.1 使用 NestJS CLI 生成

```powershell
cd v2-lab

# 生成 shared 库
nest generate library shared --prefix shared
```

**输出结构：**

```
packages/shared/
├── src/
│   ├── index.ts
│   └── shared.module.ts
├── tsconfig.lib.json
├── package.json
└── README.md
```

#### Step 2.2.2 在 shared 中创建 OTEL 配置

创建 `packages/shared/src/otel/otel.module.ts`：

```typescript
import { Module } from '@nestjs/common'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { ConsoleSpanExporter, BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { Resource } from '@opentelemetry/resources'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'

/**
 * OpenTelemetry 统一配置
 *
 * 为什么这样做？
 * - 所有微服务共享同一套 OTEL 配置
 * - 避免重复代码和配置不一致
 * - 便于集中管理 exporter 地址
 */

let sdk: NodeSDK

export function initializeOTel(serviceName: string): void {
  const resource = Resource.default().merge(
    new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: '0.0.1'
    })
  )

  sdk = new NodeSDK({
    resource,
    instrumentations: [getNodeAutoInstrumentations()],
    traceExporter: new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces'
    })
  })

  sdk.start()
  console.log(`✓ OpenTelemetry initialized for ${serviceName}`)
}

export function shutdownOTel(): Promise<void> {
  if (sdk) {
    return new Promise((resolve) => {
      sdk.shutdown(() => {
        console.log('✓ OpenTelemetry shutdown')
        resolve()
      })
    })
  }
  return Promise.resolve()
}

@Module({
  exports: []
})
export class OTelModule {}
```

**配置说明：**

- `OTLPTraceExporter`: 导出 trace 到 OTEL Collector（http://localhost:4318）
- `Resource`: 标记服务名称，便于在 Grafana 中识别
- 自动化instrumentation：自动埋点 HTTP、RabbitMQ 等

#### Step 2.2.3 创建共享 Types

新建 `packages/shared/src/types/task.types.ts`：

```typescript
/**
 * 任务相关的共享类型定义
 *
 * 为什么集中定义？
 * - API Gateway、Stats Service、Transform Service 都需要这些类型
 * - 避免类型定义散落各处
 * - 单一事实来源（Single Source of Truth）
 */

export interface PipelineTask {
  taskId: string
  text: string
  createdAt: Date
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
}

export interface StatsResult {
  taskId: string
  charCount: number
  wordCount: number
  spaceCount: number
  completedAt: Date
}

export interface TransformResult {
  taskId: string
  uppercase: string
  lowercase: string
  reversed: string
  completedAt: Date
}

export interface PipelineResult {
  taskId: string
  originalText: string
  stats: StatsResult | null
  transform: TransformResult | null
  aggregatedAt?: Date
}
```

#### Step 2.2.4 创建 Prometheus metrics 工具类

新建 `packages/shared/src/metrics/prometheus.service.ts`：

```typescript
import { Injectable } from '@nestjs/common'
import { Counter, Histogram, Gauge } from 'prom-client'

/**
 * Prometheus metrics 统一管理
 *
 * 为什么？
 * - 防止各服务重复定义 metrics
 * - 便于后续在 Grafana 中查询
 * - 提供一致的命名规范
 *
 * metrics 类型说明：
 * - Counter: 只递增的计数器（用于统计请求数、错误数）
 * - Histogram: 记录数值分布（用于响应时间）
 * - Gauge: 可增可减的指标（用于队列长度、活跃连接数）
 */

@Injectable()
export class PrometheusService {
  readonly requestCounter = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status']
  })

  readonly requestDuration = new Histogram({
    name: 'http_request_duration_ms',
    help: 'HTTP request latency',
    labelNames: ['method', 'route'],
    buckets: [10, 50, 100, 500, 1000, 5000]
  })

  readonly taskCounter = new Counter({
    name: 'pipeline_tasks_total',
    help: 'Total number of pipeline tasks',
    labelNames: ['status']
  })

  readonly queueSize = new Gauge({
    name: 'message_queue_size',
    help: 'Current size of message queue',
    labelNames: ['queue']
  })

  recordHttpRequest(method: string, route: string, statusCode: number, duration: number): void {
    this.requestCounter.labels(method, route, statusCode.toString()).inc()
    this.requestDuration.labels(method, route).observe(duration)
  }

  recordTaskCreated(status: string): void {
    this.taskCounter.labels(status).inc()
  }

  setQueueSize(queue: string, size: number): void {
    this.queueSize.labels(queue).set(size)
  }
}
```

#### Step 2.2.5 导出共享模块

编辑 `packages/shared/src/index.ts`：

```typescript
export { OTelModule, initializeOTel, shutdownOTel } from './otel/otel.module'
export { PrometheusService } from './metrics/prometheus.service'
export * from './types/task.types'
```

#### Step 2.2.6 创建 shared package.json

`packages/shared/package.json`：

```json
{
  "name": "@v2-lab/shared",
  "version": "0.0.1",
  "description": "Shared utilities for v2-lab microservices",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsc",
    "clean": "rm -rf dist"
  },
  "peerDependencies": {
    "@nestjs/common": "^11.0.0",
    "@nestjs/core": "^11.0.0"
  }
}
```

### 2.3 创建微服务包框架

#### Step 2.3.1 创建 API Gateway 微服务

```powershell
cd v2-lab

# 使用 NestJS CLI 生成应用
nest generate application api-gateway --prefix app
```

#### Step 2.3.2 创建 Stats Service 微服务

```powershell
nest generate application stats-service --prefix stats
```

#### Step 2.3.3 创建 Transform Service 微服务

```powershell
nest generate application transform-service --prefix transform
```

**预期结果：**

```
✓ packages/api-gateway 生成
✓ packages/stats-service 生成
✓ packages/transform-service 生成
✓ pnpm 自动解析 dependency（因为 pnpm-workspace.yaml）
```

---

## 阶段 3: 实现 API Gateway 服务

### 3.1 为什么需要 API Gateway？

**职责清晰：**

- 唯一的 HTTP 入口点
- 请求验证与转发
- 结果聚合与返回

**消息驱动：**

- 接收 HTTP 请求后，立即发送到 RabbitMQ
- 返回 taskId 给客户端
- 后台异步处理，客户端轮询结果

### 3.2 实现步骤

#### Step 3.2.1 配置 API Gateway 的 main.ts

编辑 `packages/api-gateway/src/main.ts`：

```typescript
import { NestFactory } from '@nestjs/core'
import { ApiGatewayModule } from './api-gateway.module'
import { initializeOTel, shutdownOTel } from '@shared'

async function bootstrap(): Promise<void> {
  // 初始化 OpenTelemetry
  initializeOTel('api-gateway')

  const app = await NestFactory.create(ApiGatewayModule)
  await app.listen(3000)

  console.log('✓ API Gateway running on http://localhost:3000')

  // 优雅关闭
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...')
    await app.close()
    await shutdownOTel()
    process.exit(0)
  })
}

bootstrap()
```

**why：**

- OTEL 必须在应用程序启动前初始化，才能捕获 traces
- SIGTERM 处理确保 trace 完整导出

#### Step 3.2.2 创建 Pipeline Controller

新建 `packages/api-gateway/src/pipeline/pipeline.controller.ts`：

```typescript
import { Controller, Post, Get, Body, Param, HttpCode } from '@nestjs/common'
import { CreatePipelineTaskDto } from './dto/create-pipeline-task.dto'
import { PipelineService } from './pipeline.service'
import { PipelineTask, PipelineResult } from '@shared'

/**
 * 管道控制器 - HTTP 入口点
 *
 * 为什么直接注入 PipelineService？
 * - 业务逻辑与 HTTP 层分离
 * - 便于单元测试（可 mock service）
 */

@Controller('pipeline')
export class PipelineController {
  constructor(private readonly pipelineService: PipelineService) {}

  /**
   * POST /pipeline
   * 创建新的处理任务
   *
   * Flow：
   * 1. 验证输入
   * 2. 生成 taskId
   * 3. 发送到 RabbitMQ
   * 4. 返回 taskId（异步处理）
   */
  @Post()
  @HttpCode(202) // 202 Accepted - 请求已接受，但尚未处理
  async createTask(@Body() dto: CreatePipelineTaskDto): Promise<{ taskId: string; message: string }> {
    const taskId = await this.pipelineService.createTask(dto.text)
    return {
      taskId,
      message: 'Task queued for processing. Use GET /pipeline/:taskId to check status.'
    }
  }

  /**
   * GET /pipeline/:taskId
   * 获取任务执行结果
   */
  @Get(':taskId')
  async getTaskResult(@Param('taskId') taskId: string): Promise<PipelineResult | null> {
    return this.pipelineService.getTaskResult(taskId)
  }
}
```

#### Step 3.2.3 创建 Pipeline Service

新建 `packages/api-gateway/src/pipeline/pipeline.service.ts`：

```typescript
import { Injectable, Inject } from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices'
import { v4 as uuid } from 'uuid'
import { PipelineTask, PipelineResult } from '@shared'
import { RedisService } from '../redis/redis.service'

/**
 * Pipeline Service - 业务逻辑层
 *
 * 职责：
 * 1. 接收任务并发送到 RabbitMQ
 * 2. 从 Redis 读取结果
 * 3. 聚合来自不同微服务的结果
 */

@Injectable()
export class PipelineService {
  constructor(
    @Inject('RABBITMQ_CLIENT')
    private readonly rabbitmqClient: ClientProxy,
    private readonly redisService: RedisService
  ) {}

  /**
   * 创建新任务
   *
   * Flow：
   * 1. 生成唯一的 taskId
   * 2. 保存任务到 Redis（状态：PENDING）
   * 3. 分别发送到 stats-service 和 transform-service
   *
   * Why Redis？
   * - 快速存取（内存）
   * - TTL 支持（自动过期）
   * - 支持发布/订阅（将来扩展通知功能）
   */
  async createTask(text: string): Promise<string> {
    const taskId = uuid()
    const task: PipelineTask = {
      taskId,
      text,
      createdAt: new Date(),
      status: 'PROCESSING'
    }

    // 保存任务元数据到 Redis（TTL: 1小时）
    await this.redisService.setAsync(`task:${taskId}`, JSON.stringify(task), 'EX', 3600)

    // 发送到统计服务
    this.rabbitmqClient.emit('stats.process', {
      taskId,
      text
    })

    // 发送到转换服务
    this.rabbitmqClient.emit('transform.process', {
      taskId,
      text
    })

    return taskId
  }

  /**
   * 获取任务结果
   *
   * 预期 Redis 中的结构：
   * {
   *   taskId: "xxx",
   *   originalText: "hello world",
   *   stats: { charCount: 11, wordCount: 2, ... },
   *   transform: { uppercase: "HELLO WORLD", ... },
   *   aggregatedAt: Date
   * }
   */
  async getTaskResult(taskId: string): Promise<PipelineResult | null> {
    const resultJson = await this.redisService.getAsync(`result:${taskId}`)
    if (!resultJson) {
      return null
    }
    return JSON.parse(resultJson)
  }
}
```

#### Step 3.2.4 创建 CreatePipelineTaskDto

新建 `packages/api-gateway/src/pipeline/dto/create-pipeline-task.dto.ts`：

```typescript
import { IsString, IsNotEmpty, MinLength } from 'class-validator'

/**
 * DTO - Data Transfer Object
 *
 * 为什么分离 DTO？
 * - 自动输入验证（通过 class-validator）
 * - API 文档清晰
 * - 防止恶意输入
 */

export class CreatePipelineTaskDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  text: string
}
```

#### Step 3.2.5 创建 Redis Service

新建 `packages/api-gateway/src/redis/redis.service.ts`：

```typescript
import { Injectable } from '@nestjs/common'
import { createClient, RedisClientType } from 'redis'

/**
 * Redis Service - 统一管理 Redis 连接
 *
 * 为什么？
 * - 避免在各处重复创建连接
 * - 提供统一接口
 * - 便于未来替换（如 Memcached）
 */

@Injectable()
export class RedisService {
  private client: RedisClientType

  async onModuleInit(): Promise<void> {
    this.client = createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10)
    })

    this.client.on('error', (err) => {
      console.error('Redis error:', err)
    })

    await this.client.connect()
    console.log('✓ Redis connected')
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.disconnect()
    }
  }

  async getAsync(key: string): Promise<string | null> {
    return this.client.get(key)
  }

  async setAsync(key: string, value: string, exOption?: 'EX' | 'PX', exTime?: number): Promise<string | null> {
    if (exOption && exTime) {
      return this.client.set(key, value, {
        [exOption === 'EX' ? 'EX' : 'PX']: exTime
      })
    }
    return this.client.set(key, value)
  }

  async delAsync(key: string): Promise<number> {
    return this.client.del(key)
  }

  async publishAsync(channel: string, message: string): Promise<number> {
    return this.client.publish(channel, message)
  }
}
```

#### Step 3.2.6 更新 API Gateway Module

编辑 `packages/api-gateway/src/api-gateway.module.ts`：

```typescript
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ClientsModule, Transport } from '@nestjs/microservices'
import { PipelineController } from './pipeline/pipeline.controller'
import { PipelineService } from './pipeline/pipeline.service'
import { RedisService } from './redis/redis.service'
import { OTelModule } from '@shared'

/**
 * API Gateway Module
 *
 * 为什么这样组织？
 * - ClientsModule.register: 配置 RabbitMQ 连接
 * - 所有 controllers 和 services 在这里注册
 * - ConfigModule 用于读取环境变量
 */

@Module({
  imports: [
    ConfigModule.forRoot(),
    OTelModule,
    ClientsModule.register([
      {
        name: 'RABBITMQ_CLIENT',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
          queue: 'api_gateway_queue',
          queueOptions: {
            durable: true
          }
        }
      }
    ])
  ],
  controllers: [PipelineController],
  providers: [PipelineService, RedisService]
})
export class ApiGatewayModule {}
```

---

## 阶段 4: 实现微服务（Stats Service）

### 4.1 为什么先从 Stats Service 开始？

**业务逻辑简单：**

- 纯文本处理，无外部依赖
- 计算字符数、单词数、空格数
- 生成结果并保存到 Redis

**通信模式清晰：**

- 监听 RabbitMQ `stats.process` 消息
- 处理完成后保存到 Redis
- 向 `result.aggregated` 发送完成信号

### 4.2 实现步骤

#### Step 4.2.1 创建 Stats Controller

新建 `packages/stats-service/src/stats/stats.controller.ts`：

```typescript
import { Controller } from '@nestjs/common'
import { MessagePattern, Payload } from '@nestjs/microservices'
import { StatsService } from './stats.service'

/**
 * Stats Microservice Controller
 *
 * @MessagePattern 装饰器：
 * - 监听 RabbitMQ 中的特定路由键
 * - 当消息到达时，自动调用对应方法
 * - 与 HTTP controller 概念类似
 */

@Controller()
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @MessagePattern('stats.process')
  async processStats(
    @Payload()
    payload: {
      taskId: string
      text: string
    }
  ): Promise<void> {
    await this.statsService.processAndStore(payload.taskId, payload.text)
  }
}
```

#### Step 4.2.2 创建 Stats Service

新建 `packages/stats-service/src/stats/stats.service.ts`：

```typescript
import { Injectable, Inject } from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices'
import { StatsResult } from '@shared'
import { RedisService } from '../redis/redis.service'

/**
 * Stats Service - 文本统计逻辑
 *
 * 职责：
 * 1. 接收文本
 * 2. 计算统计信息
 * 3. 保存结果到 Redis
 * 4. 发送完成信号
 */

@Injectable()
export class StatsService {
  constructor(
    @Inject('RABBITMQ_CLIENT')
    private readonly rabbitmqClient: ClientProxy,
    private readonly redisService: RedisService
  ) {}

  async processAndStore(taskId: string, text: string): Promise<void> {
    try {
      // 执行统计计算
      const result = this.calculateStats(taskId, text)

      // 保存结果到 Redis
      // Key: stats:${taskId}
      // Value: JSON 格式的统计结果
      await this.redisService.setAsync(
        `stats:${taskId}`,
        JSON.stringify(result),
        'EX',
        3600 // 1 小时过期
      )

      // 发送完成信号给 result aggregator
      // （稍后实现 aggregator）
      this.rabbitmqClient.emit('stats.completed', {
        taskId,
        result
      })

      console.log(`✓ Stats processed for task ${taskId}`)
    } catch (error) {
      console.error(`✗ Error processing stats for task ${taskId}:`, error)
      // 错误处理可以扩展：发送失败消息等
    }
  }

  /**
   * 计算文本统计
   *
   * 业务逻辑：
   * - charCount: 总字符数（包括空格）
   * - wordCount: 单词数（按空格分割）
   * - spaceCount: 空格数
   */
  private calculateStats(taskId: string, text: string): StatsResult {
    return {
      taskId,
      charCount: text.length,
      wordCount: text.split(/\s+/).filter((word) => word.length > 0).length,
      spaceCount: (text.match(/\s/g) || []).length,
      completedAt: new Date()
    }
  }
}
```

#### Step 4.2.3 创建 Stats Module

编辑 `packages/stats-service/src/stats/stats.module.ts`：

```typescript
import { Module } from '@nestjs/common'
import { StatsController } from './stats.controller'
import { StatsService } from './stats.service'
import { RedisService } from '../redis/redis.service'

@Module({
  controllers: [StatsController],
  providers: [StatsService, RedisService],
  exports: [StatsService]
})
export class StatsModule {}
```

#### Step 4.2.4 创建 Redis Service（stats-service 专用）

新建 `packages/stats-service/src/redis/redis.service.ts`：

```typescript
import { Injectable } from '@nestjs/common'
import { createClient, RedisClientType } from 'redis'

@Injectable()
export class RedisService {
  private client: RedisClientType

  async onModuleInit(): Promise<void> {
    this.client = createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10)
    })

    await this.client.connect()
    console.log('✓ Redis connected (Stats Service)')
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.disconnect()
    }
  }

  async getAsync(key: string): Promise<string | null> {
    return this.client.get(key)
  }

  async setAsync(key: string, value: string, exOption?: 'EX' | 'PX', exTime?: number): Promise<string | null> {
    if (exOption && exTime) {
      return this.client.set(key, value, {
        [exOption === 'EX' ? 'EX' : 'PX']: exTime
      })
    }
    return this.client.set(key, value)
  }
}
```

#### Step 4.2.5 更新 Stats Service Main Module

编辑 `packages/stats-service/src/app.module.ts`：

```typescript
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ClientsModule, Transport } from '@nestjs/microservices'
import { StatsModule } from './stats/stats.module'
import { OTelModule } from '@shared'

@Module({
  imports: [
    ConfigModule.forRoot(),
    OTelModule,
    ClientsModule.register([
      {
        name: 'RABBITMQ_CLIENT',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
          queue: 'stats_service_queue',
          queueOptions: {
            durable: true
          }
        }
      }
    ]),
    StatsModule
  ]
})
export class AppModule {}
```

#### Step 4.2.6 更新 main.ts

编辑 `packages/stats-service/src/main.ts`：

```typescript
import { NestFactory } from '@nestjs/core'
import { Transport, MicroserviceOptions } from '@nestjs/microservices'
import { AppModule } from './app.module'
import { initializeOTel, shutdownOTel } from '@shared'

async function bootstrap(): Promise<void> {
  // 初始化 OTEL
  initializeOTel('stats-service')

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
      queue: 'stats_service_queue',
      queueOptions: {
        durable: true
      }
    }
  })

  await app.listen()
  console.log('✓ Stats Service listening on RabbitMQ')

  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...')
    await app.close()
    await shutdownOTel()
    process.exit(0)
  })
}

bootstrap()
```

**为什么 Stats Service 是 Microservice 而非 HTTP？**

- 不需要对外暴露 HTTP 接口
- 只需监听 RabbitMQ 消息
- 更轻量级的通信方式

---

## 阶段 5: 实现微服务（Transform Service）

### 5.1 类似 Stats Service 的实现

#### Step 5.1.1 创建 Transform Controller

新建 `packages/transform-service/src/transform/transform.controller.ts`：

```typescript
import { Controller } from '@nestjs/common'
import { MessagePattern, Payload } from '@nestjs/microservices'
import { TransformService } from './transform.service'

@Controller()
export class TransformController {
  constructor(private readonly transformService: TransformService) {}

  @MessagePattern('transform.process')
  async processTransform(
    @Payload()
    payload: {
      taskId: string
      text: string
    }
  ): Promise<void> {
    await this.transformService.processAndStore(payload.taskId, payload.text)
  }
}
```

#### Step 5.1.2 创建 Transform Service

新建 `packages/transform-service/src/transform/transform.service.ts`：

```typescript
import { Injectable, Inject } from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices'
import { TransformResult } from '@shared'
import { RedisService } from '../redis/redis.service'

/**
 * Transform Service - 文本转换逻辑
 *
 * 职责：
 * 1. 接收文本
 * 2. 执行多种转换（大写、小写、反转）
 * 3. 保存结果到 Redis
 * 4. 发送完成信号
 */

@Injectable()
export class TransformService {
  constructor(
    @Inject('RABBITMQ_CLIENT')
    private readonly rabbitmqClient: ClientProxy,
    private readonly redisService: RedisService
  ) {}

  async processAndStore(taskId: string, text: string): Promise<void> {
    try {
      // 执行转换
      const result = this.transformText(taskId, text)

      // 保存结果到 Redis
      await this.redisService.setAsync(`transform:${taskId}`, JSON.stringify(result), 'EX', 3600)

      // 发送完成信号
      this.rabbitmqClient.emit('transform.completed', {
        taskId,
        result
      })

      console.log(`✓ Transform processed for task ${taskId}`)
    } catch (error) {
      console.error(`✗ Error processing transform for task ${taskId}:`, error)
    }
  }

  /**
   * 文本转换逻辑
   *
   * 业务逻辑：
   * - uppercase: 转大写
   * - lowercase: 转小写
   * - reversed: 字符翻转
   */
  private transformText(taskId: string, text: string): TransformResult {
    return {
      taskId,
      uppercase: text.toUpperCase(),
      lowercase: text.toLowerCase(),
      reversed: text.split('').reverse().join(''),
      completedAt: new Date()
    }
  }
}
```

#### Step 5.1.3 其他文件配置类似 Stats Service

复制相同的 redis.service.ts、transform.module.ts、app.module.ts、main.ts 并调整配置。

---

## 阶段 6: 实现结果聚合器

### 6.1 为什么需要结果聚合器？

**问题：**

- Stats Service 和 Transform Service 独立存储结果
- API Gateway 需要合并这两个结果

**解决方案：**

- 在 API Gateway 中创建一个 Result Aggregator
- 监听 `stats.completed` 和 `transform.completed` 消息
- 聚合结果到 `result:${taskId}`

### 6.2 实现步骤

#### Step 6.2.1 创建 Result Aggregator Service

新建 `packages/api-gateway/src/result/result-aggregator.service.ts`：

```typescript
import { Injectable, Inject } from '@nestjs/common'
import { MessagePattern, Payload } from '@nestjs/microservices'
import { StatsResult, TransformResult, PipelineResult } from '@shared'
import { RedisService } from '../redis/redis.service'

/**
 * Result Aggregator Service
 *
 * 职责：
 * 1. 监听来自各微服务的完成消息
 * 2. 从 Redis 读取各微服务的结果
 * 3. 合并为完整的 PipelineResult
 * 4. 保存到 Redis（result:${taskId}）
 *
 * 为什么需要聚合？
 * - Stats 和 Transform service 各自保存结果
 * - API Gateway GET 接口需要完整数据
 * - 便于未来添加更多微服务
 */

@Injectable()
export class ResultAggregatorService {
  constructor(private readonly redisService: RedisService) {}

  @MessagePattern('stats.completed')
  async onStatsCompleted(
    @Payload()
    payload: {
      taskId: string
      result: StatsResult
    }
  ): Promise<void> {
    await this.aggregateResult(payload.taskId)
  }

  @MessagePattern('transform.completed')
  async onTransformCompleted(
    @Payload()
    payload: {
      taskId: string
      result: TransformResult
    }
  ): Promise<void> {
    await this.aggregateResult(payload.taskId)
  }

  /**
   * 聚合结果
   *
   * Flow：
   * 1. 从 Redis 读取 task 元数据
   * 2. 从 Redis 读取 stats 结果（如果有）
   * 3. 从 Redis 读取 transform 结果（如果有）
   * 4. 合并为 PipelineResult
   * 5. 保存到 result:${taskId}
   */
  private async aggregateResult(taskId: string): Promise<void> {
    try {
      const taskJson = await this.redisService.getAsync(`task:${taskId}`)
      const statsJson = await this.redisService.getAsync(`stats:${taskId}`)
      const transformJson = await this.redisService.getAsync(`transform:${taskId}`)

      if (!taskJson) {
        console.warn(`Task ${taskId} not found in Redis`)
        return
      }

      const task = JSON.parse(taskJson)
      const stats = statsJson ? JSON.parse(statsJson) : null
      const transform = transformJson ? JSON.parse(transformJson) : null

      // 只有当两个服务都完成时，才生成完整结果
      if (stats && transform) {
        const pipelineResult: PipelineResult = {
          taskId,
          originalText: task.text,
          stats,
          transform,
          aggregatedAt: new Date()
        }

        await this.redisService.setAsync(`result:${taskId}`, JSON.stringify(pipelineResult), 'EX', 3600)

        console.log(`✓ Result aggregated for task ${taskId}`)
      } else {
        console.log(`⏳ Waiting for all services to complete for task ${taskId}`)
      }
    } catch (error) {
      console.error(`✗ Error aggregating result for task ${taskId}:`, error)
    }
  }
}
```

#### Step 6.2.2 更新 API Gateway Module

编辑 `packages/api-gateway/src/api-gateway.module.ts`：

```typescript
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ClientsModule, Transport } from '@nestjs/microservices'
import { PipelineController } from './pipeline/pipeline.controller'
import { PipelineService } from './pipeline/pipeline.service'
import { ResultAggregatorService } from './result/result-aggregator.service'
import { RedisService } from './redis/redis.service'
import { OTelModule } from '@shared'

@Module({
  imports: [
    ConfigModule.forRoot(),
    OTelModule,
    ClientsModule.register([
      {
        name: 'RABBITMQ_CLIENT',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
          queue: 'api_gateway_queue',
          queueOptions: {
            durable: true
          }
        }
      }
    ])
  ],
  controllers: [PipelineController],
  providers: [PipelineService, ResultAggregatorService, RedisService]
})
export class ApiGatewayModule {}
```

**为什么 ResultAggregator 在 api-gateway 中而不是独立微服务？**

- 逻辑简单，无需单独部署
- 与 API Gateway 强相关
- 避免过度微服务化（微服务过多反而增加复杂度）

---

## 阶段 7: 基础设施配置（Docker Compose）

### 7.1 为什么使用 Docker Compose？

**本地开发便利：**

- 一条命令启动所有依赖（RabbitMQ、Redis、OTEL Collector）
- 隔离环境，不污染本机
- 便于测试完整的微服务链路

### 7.2 创建 docker-compose.yml

在 `v2-lab/docker/docker-compose.yml`：

```yaml
version: '3.8'

services:
  # RabbitMQ - 消息队列
  rabbitmq:
    image: rabbitmq:3.13-management-alpine
    container_name: v2-lab-rabbitmq
    port:
      - '5672:5672' # AMQP 端口
      - '15672:15672' # 管理界面
    environment:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest
    healthcheck:
      test: rabbitmq-diagnostics -q ping
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - v2-lab

  # Redis - 结果存储、缓存
  redis:
    image: redis:7-alpine
    container_name: v2-lab-redis
    ports:
      - '6379:6379'
    command: redis-server --appendonly yes
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - v2-lab

  # OTEL Collector - 收集 traces
  otel-collector:
    image: otel/opentelemetry-collector-contrib:0.98.0
    container_name: v2-lab-otel-collector
    ports:
      - '4318:4318' # OTLP HTTP receiver
      - '4317:4317' # OTLP gRPC receiver
    volumes:
      - ./otel-collector-config.yaml:/etc/otel-collector-config.yaml
    command: ['--config=/etc/otel-collector-config.yaml']
    networks:
      - v2-lab
    depends_on:
      - prometheus
      - jaeger

  # Jaeger - Trace 查看
  jaeger:
    image: jaegertracing/all-in-one:latest
    container_name: v2-lab-jaeger
    ports:
      - '16686:16686' # Jaeger UI
    networks:
      - v2-lab
    environment:
      COLLECTOR_OTLP_ENABLED: 'true'

  # Prometheus - Metrics 存储
  prometheus:
    image: prom/prometheus:latest
    container_name: v2-lab-prometheus
    ports:
      - '9090:9090'
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    networks:
      - v2-lab

  # Grafana - 监控仪表板
  grafana:
    image: grafana/grafana:latest
    container_name: v2-lab-grafana
    ports:
      - '3001:3000'
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
      GF_SECURITY_ADMIN_USER: admin
    volumes:
      - grafana_data:/var/lib/grafana
    networks:
      - v2-lab
    depends_on:
      - prometheus

networks:
  v2-lab:
    driver: bridge

volumes:
  prometheus_data:
  grafana_data:
```

**配置的注意点：**

- `healthcheck`: 健康检查，等待服务就绪
- `networks`: 所有服务在同一网络，便于通讯
- `volumes`: 持久化数据（Prometheus、Grafana）

### 7.2 创建 OTEL Collector 配置

在 `v2-lab/docker/otel-collector-config.yaml`：

```yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: '0.0.0.0:4318'
      grpc:
        endpoint: '0.0.0.0:4317'

processors:
  batch:
    timeout: 10s
    send_batch_size: 100
  memory_limiter:
    check_interval: 5s
    limit_mib: 512

exporters:
  jaeger:
    endpoint: 'jaeger:14250'
  prometheus:
    endpoint: '0.0.0.0:8888'
  otlp:
    client:
      endpoint: 'jaeger:4317'
      tls:
        insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch, memory_limiter]
      exporters: [jaeger, otlp]
```

**为什么这样配置？**

- `otlp receiver`: 接收来自 NestJS 应用的 traces
- `jaeger exporter`: 将 traces 导出到 Jaeger（直观查看链路）
- `batch processor`: 批量处理，提高效率

### 7.3 创建 Prometheus 配置

在 `v2-lab/docker/prometheus.yml`：

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'api-gateway'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'

  - job_name: 'stats-service'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/metrics'

  - job_name: 'transform-service'
    static_configs:
      - targets: ['localhost:3002']
    metrics_path: '/metrics'

  - job_name: 'otel-collector'
    static_configs:
      - targets: ['otel-collector:8888']
```

**为什么？**

- Prometheus 定期拉取各服务暴露的 metrics
- `/metrics` 默认端点（稍后在应用中实现）

---

## 阶段 8: 性能监控端点

### 8.1 为什么每个微服务都需要 /metrics 端点？

**可观测性三要素：**

1. Logs（日志）
2. **Metrics**（指标）<-- 本阶段重点
3. Traces（链路）

**Prometheus workflo：**

```
NestJS App(/metrics)
        ↓ (定期抓取)
   Prometheus (存储时间序列数据)
        ↓ (PromQL 查询)
   Grafana (可视化仪表板)
```

### 8.2 在 API Gateway 中实现 /metrics 端点

编辑 `packages/api-gateway/src/api-gateway.module.ts`：

```typescript
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ClientsModule, Transport } from '@nestjs/microservices'
import { register } from 'prom-client'
import { PipelineController } from './pipeline/pipeline.controller'
import { PipelineService } from './pipeline/pipeline.service'
import { ResultAggregatorService } from './result/result-aggregator.service'
import { RedisService } from './redis/redis.service'
import { PrometheusService } from '@shared'
import { OTelModule } from '@shared'
import { MetricsController } from './metrics/metrics.controller'

@Module({
  imports: [
    ConfigModule.forRoot(),
    OTelModule,
    ClientsModule.register([
      {
        name: 'RABBITMQ_CLIENT',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
          queue: 'api_gateway_queue',
          queueOptions: {
            durable: true
          }
        }
      }
    ])
  ],
  controllers: [PipelineController, MetricsController],
  providers: [PipelineService, ResultAggregatorService, RedisService, PrometheusService]
})
export class ApiGatewayModule {}
```

创建 `packages/api-gateway/src/metrics/metrics.controller.ts`：

```typescript
import { Controller, Get } from '@nestjs/common'
import { register } from 'prom-client'

/**
 * Metrics 端点
 *
 * GET /metrics 暴露 Prometheus 格式的指标
 * Prometheus 定期拉取此端点，存储和查询
 */

@Controller('metrics')
export class MetricsController {
  @Get()
  async getMetrics(): Promise<string> {
    return register.metrics()
  }
}
```

**为什么必须导出到 Prometheus 格式？**

- Prometheus 只认识特定的文本格式
- `prom-client` 库自动处理序列化
- Grafana 通过 PromQL 查询 Prometheus 数据

### 8.3 在 Pipeline Controller 中集成 metrics 记录

编辑 `packages/api-gateway/src/pipeline/pipeline.controller.ts`：

```typescript
import { Controller, Post, Get, Body, Param, HttpCode } from '@nestjs/common'
import { CreatePipelineTaskDto } from './dto/create-pipeline-task.dto'
import { PipelineService } from './pipeline.service'
import { PrometheusService } from '@shared'
import { PipelineTask, PipelineResult } from '@shared'

@Controller('pipeline')
export class PipelineController {
  constructor(
    private readonly pipelineService: PipelineService,
    private readonly metricsService: PrometheusService
  ) {}

  @Post()
  @HttpCode(202)
  async createTask(@Body() dto: CreatePipelineTaskDto): Promise<{ taskId: string; message: string }> {
    const startTime = Date.now()

    try {
      const taskId = await this.pipelineService.createTask(dto.text)

      // 记录 metrics
      const duration = Date.now() - startTime
      this.metricsService.recordHttpRequest('POST', '/pipeline', 202, duration)
      this.metricsService.recordTaskCreated('PROCESSING')

      return {
        taskId,
        message: 'Task queued for processing. Use GET /pipeline/:taskId to check status.'
      }
    } catch (error) {
      const duration = Date.now() - startTime
      this.metricsService.recordHttpRequest('POST', '/pipeline', 500, duration)
      throw error
    }
  }

  @Get(':taskId')
  async getTaskResult(@Param('taskId') taskId: string): Promise<PipelineResult | null> {
    const startTime = Date.now()

    try {
      const result = await this.pipelineService.getTaskResult(taskId)

      const duration = Date.now() - startTime
      this.metricsService.recordHttpRequest('GET', '/pipeline/:taskId', result ? 200 : 404, duration)

      return result
    } catch (error) {
      const duration = Date.now() - startTime
      this.metricsService.recordHttpRequest('GET', '/pipeline/:taskId', 500, duration)
      throw error
    }
  }
}
```

**为什么在每个端点都记录 metrics？**

- 追踪请求数、响应时间、错误率
- 未来可生成 SLA 报表、告警规则

---

## 阶段 9: CI/CD 脚本

### 9.1 为什么需要自动化脚本？

**开发效率：**

- 一条命令构建、检查、启动所有服务
- 减少人工操作错误
- 便于快速迭代

### 9.2 创建 lint 和 build 验证脚本

在 `v2-lab/scripts/validate.ps1`：

```powershell
<#
.DESCRIPTION
验证项目的 lint、build、test 状态
.PARAMETER All
  构建所有包
.EXAMPLE
  PS> .\scripts\validate.ps1 -All
#>

param(
  [switch]$All = $false
)

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "   v2-lab Validation Script" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# 1. Lint 检查
Write-Host "`n[1/3] Running ESLint..." -ForegroundColor Yellow
$lintResult = & cmd /c "pnpm run lint" 2>&1
$lintExitCode = $LASTEXITCODE

if ($lintExitCode -eq 0) {
  Write-Host "✓ Lint passed" -ForegroundColor Green
} else {
  Write-Host "✗ Lint failed" -ForegroundColor Red
  Write-Host $lintResult
  exit 1
}

# 2. Build 检查
Write-Host "`n[2/3] Building..." -ForegroundColor Yellow
if ($All) {
  $buildResult = & cmd /c "pnpm run build:all" 2>&1
} else {
  $buildResult = & cmd /c "pnpm run build" 2>&1
}
$buildExitCode = $LASTEXITCODE

if ($buildExitCode -eq 0) {
  Write-Host "✓ Build passed" -ForegroundColor Green
} else {
  Write-Host "✗ Build failed" -ForegroundColor Red
  Write-Host $buildResult
  exit 1
}

# 3. 总结
Write-Host "`n[3/3] Summary" -ForegroundColor Yellow
Write-Host "Lint Exit Code: $lintExitCode" -ForegroundColor Green
Write-Host "Build Exit Code: $buildExitCode" -ForegroundColor Green
Write-Host "`n✓ All validations passed!" -ForegroundColor Green
```

### 9.3 创建启动脚本

在 `v2-lab/scripts/startup.ps1`：

```powershell
<#
.DESCRIPTION
启动整个 v2-lab 开发环境
.PARAMETER Services
  要启动的服务：all, infra, app
.EXAMPLE
  PS> .\scripts\startup.ps1 -Services all
#>

param(
  [ValidateSet('all', 'infra', 'app')]
  [string]$Services = 'all'
)

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "   v2-lab Startup Script" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# 启动基础设施（Docker）
if ($Services -eq 'infra' -or $Services -eq 'all') {
  Write-Host "`n[1] Starting infrastructure (Docker Compose)..." -ForegroundColor Yellow
  & docker-compose -f docker/docker-compose.yml up -d

  if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Infrastructure started" -ForegroundColor Green
    Write-Host "  - RabbitMQ: http://localhost:15672 (guest/guest)" -ForegroundColor Cyan
    Write-Host "  - Prometheus: http://localhost:9090" -ForegroundColor Cyan
    Write-Host "  - Grafana: http://localhost:3001 (admin/admin)" -ForegroundColor Cyan
    Write-Host "  - Jaeger: http://localhost:16686" -ForegroundColor Cyan
  } else {
    Write-Host "✗ Failed to start infrastructure" -ForegroundColor Red
    exit 1
  }
}

# 启动应用
if ($Services -eq 'app' -or $Services -eq 'all') {
  Write-Host "`n[2] Starting applications..." -ForegroundColor Yellow

  # 先 validate
  & .\scripts\validate.ps1 -All

  if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Validation passed, starting services..." -ForegroundColor Green
    Write-Host "`nRunning: pnpm run start:all:dev" -ForegroundColor Yellow
    & cmd /c "pnpm run start:all:dev"
  } else {
    Write-Host "✗ Validation failed" -ForegroundColor Red
    exit 1
  }
}

Write-Host "`n✓ v2-lab is ready!" -ForegroundColor Green
```

### 9.4 创建关闭脚本

在 `v2-lab/scripts/shutdown.ps1`：

```powershell
<#
.DESCRIPTION
停止整个 v2-lab 环境
#>

Write-Host "Shutting down v2-lab..." -ForegroundColor Yellow

# 停止 Docker Compose
Write-Host "Stopping Docker containers..." -ForegroundColor Cyan
& docker-compose -f docker/docker-compose.yml down

Write-Host "✓ v2-lab shutdown complete" -ForegroundColor Green
```

---

## 阶段 10: 快速启动流程

### 10.1 完整开发启动指南

#### 前置条件

```
✓ Node.js 18+ 已安装
✓ pnpm 已安装 (npm install -g pnpm)
✓ Docker & Docker Compose 已启动
```

#### 一键启动（全量）

```powershell
cd v2-lab

# 安装依赖
pnpm install

# 启动所有服务（基础设施 + 应用）
.\scripts\startup.ps1 -Services all
```

**预期看到：**

```
✓ Infrastructure started
  - RabbitMQ: http://localhost:15672
  - Prometheus: http://localhost:9090
  - Grafana: http://localhost:3001
  - Jaeger: http://localhost:16686

✓ Applications started
  ✓ API Gateway running on http://localhost:3000
  ✓ Stats Service listening on RabbitMQ
  ✓ Transform Service listening on RabbitMQ
```

#### 仅启动基础设施

```powershell
.\scripts\startup.ps1 -Services infra
```

#### 仅启动应用（假设已有 Docker 运行）

```powershell
.\scripts\startup.ps1 -Services app
```

#### 关闭

```powershell
.\scripts\shutdown.ps1
```

---

## 阶段 11: 测试完整链路

### 11.1 测试 API 调用（使用 curl 或 Postman）

#### 创建新任务

```bash
POST http://localhost:3000/pipeline
Content-Type: application/json

{
  "text": "hello world"
}
```

**预期响应（202 Accepted）：**

```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Task queued for processing. Use GET /pipeline/:taskId to check status."
}
```

#### 查询结果

```bash
GET http://localhost:3000/pipeline/550e8400-e29b-41d4-a716-446655440000
```

**预期响应（等待 1-2 秒后）：**

```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "originalText": "hello world",
  "stats": {
    "taskId": "550e8400-e29b-41d4-a716-446655440000",
    "charCount": 11,
    "wordCount": 2,
    "spaceCount": 1,
    "completedAt": "2026-02-23T10:30:45.123Z"
  },
  "transform": {
    "taskId": "550e8400-e29b-41d4-a716-446655440000",
    "uppercase": "HELLO WORLD",
    "lowercase": "hello world",
    "reversed": "dlrow olleh",
    "completedAt": "2026-02-23T10:30:45.456Z"
  },
  "aggregatedAt": "2026-02-23T10:30:45.789Z"
}
```

### 11.2 验证可观测性

#### 查看 Traces（Jaeger）

访问 http://localhost:16686

- 选择 Service: `api-gateway`
- 查看完整的请求链路（API → RabbitMQ → Stats/Transform → Redis）

#### 查看 Metrics（Prometheus）

访问 http://localhost:9090

- 查询：`http_requests_total{job="api-gateway"}`
- 查询：`http_request_duration_ms`

#### 查看仪表板（Grafana）

访问 http://localhost:3001

- username: admin
- password: admin
- 添加 Prometheus 数据源：http://prometheus:9090
- 导入或创建自定义仪表板

#### 查看消息队列（RabbitMQ 管理界面）

访问 http://localhost:15672

- username: guest
- password: guest
- 观察队列深度、消息吞吐量

---

## 总结与下一步

### 验证清单

- ✅ Monorepo 多包结构
- ✅ 微服务间 RabbitMQ 异步通讯
- ✅ OpenTelemetry 链路追踪（Jaeger）
- ✅ Prometheus metrics 收集
- ✅ Grafana 可视化监控
- ✅ Redis 结果存储
- ✅ 自动化 CI/CD 脚本

### 未来优化建议（仅供参考，不在本 lab 范围）

1. **数据持久化**
   - 集成 PostgreSQL（替换 Redis）
   - 实现真正的事务支持

2. **API 增强**
   - 添加 Swagger 文档
   - 实现分页、过滤、搜索

3. **错误处理**
   - 全局异常过滤器
   - 重试机制（Circuit Breaker）

4. **安全性**
   - API 认证与授权
   - 请求签名、速率限制

5. **部署**
   - Kubernetes 配置（YAML）
   - Helm Chart 打包
   - GitHub Actions CI/CD

6. **性能**
   - 缓存策略（多级缓存）
   - 数据库索引优化
   - 消息压缩

---

## 常见问题 & 故障排除

### Q: 启动时报 `ECONNREFUSED` 错误

**A:** 确保 Docker Compose 已启动依赖服务

```powershell
docker-compose -f docker/docker-compose.yml ps
```

查看各容器是否都在 `Up` 状态

### Q: Prometheus 找不到 metrics

**A:** 确保应用已启动，并访问 http://localhost:3000/metrics 验证端点可用

### Q: RabbitMQ 消息堆积没有消费

**A:** 检查微服务是否正确启动

```powershell
# 查看 Stats Service 日志
nest start stats-service --watch
```

### Q: Redis 连接失败

**A:** 验证 Redis 容器状态

```powershell
docker logs v2-lab-redis
```

---

## 文档维护

本文档每次更新时，请在最上方更新版本号和日期。

| 版本 | 日期       | 变更     |
| ---- | ---------- | -------- |
| 1.0  | 2026-02-23 | 初版发布 |

---

**写于:** 2026-02-23  
**下次审阅:** 2026-03-23
