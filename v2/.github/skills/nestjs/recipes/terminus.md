# NestJS 健康檢查 (Terminus)

使用 Terminus 實現應用程式健康檢查。

---

## 安裝

```bash
npm install --save @nestjs/terminus
npm install --save @nestjs/axios axios
```

---

## 基本設置

### health.module.ts

```typescript
import { Module } from '@nestjs/common'
import { TerminusModule } from '@nestjs/terminus'
import { HttpModule } from '@nestjs/axios'
import { HealthController } from './health.controller'

@Module({
  imports: [TerminusModule, HttpModule],
  controllers: [HealthController],
})
export class HealthModule {}
```

---

## HTTP 健康檢查

### health.controller.ts

```typescript
import { Controller, Get } from '@nestjs/common'
import { HealthCheckService, HttpHealthIndicator, HealthCheck } from '@nestjs/terminus'

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([() => this.http.pingCheck('nestjs-docs', 'https://docs.nestjs.com')])
  }
}
```

**回應：**

```json
{
  "status": "ok",
  "info": {
    "nestjs-docs": {
      "status": "up"
    }
  },
  "error": {},
  "details": {
    "nestjs-docs": {
      "status": "up"
    }
  }
}
```

---

## 自訂健康指標

```typescript
import { Injectable } from '@nestjs/common'
import { HealthIndicatorService } from '@nestjs/terminus'

@Injectable()
export class CustomHealthIndicator {
  constructor(private readonly healthIndicatorService: HealthIndicatorService) {}

  async isHealthy(key: string) {
    const indicator = this.healthIndicatorService.check(key)

    // 自訂檢查邏輯
    const isHealthy = await this.performCheck()

    if (!isHealthy) {
      return indicator.down({ error: 'Service is down' })
    }

    return indicator.up()
  }

  private async performCheck(): Promise<boolean> {
    // 實現你的檢查邏輯
    return true
  }
}
```

---

## 記憶體健康檢查

```typescript
import { MemoryHealthIndicator, HealthCheckService, HealthCheck } from '@nestjs/terminus'

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator
  ) {}

  @Get('memory')
  @HealthCheck()
  checkMemory() {
    return this.health.check([() => this.memory.checkHeap('memory', 150 * 1024 * 1024)])
  }
}
```

---

## 磁盤健康檢查

```typescript
import { DiskHealthIndicator } from '@nestjs/terminus'

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private disk: DiskHealthIndicator
  ) {}

  @Get('disk')
  @HealthCheck()
  checkDisk() {
    return this.health.check([
      () =>
        this.disk.checkStorage('storage', {
          path: '/',
          thresholdPercent: 0.5,
        }),
    ])
  }
}
```

---

## 多重檢查

```typescript
@Get('/full')
@HealthCheck()
checkFull() {
  return this.health.check([
    () =>
      this.http.pingCheck('http', 'https://example.com'),
    () =>
      this.memory.checkHeap('memory', 150 * 1024 * 1024),
    () =>
      this.disk.checkStorage('disk', { path: '/', thresholdPercent: 0.5 }),
  ]);
}
```

---

## 參考資源

- https://docs.nestjs.com/recipes/terminus
- https://github.com/nestjs/terminus
