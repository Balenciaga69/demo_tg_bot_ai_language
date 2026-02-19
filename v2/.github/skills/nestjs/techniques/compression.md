# NestJS 壓縮

使用 gzip 和 Brotli 壓縮 HTTP 響應。

---

## 安裝

### Express

```bash
npm install --save compression
```

### Fastify

```bash
npm install --save @fastify/compress
```

---

## Express 壓縮

### 基本設置

```typescript
import { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(compression());

  await app.listen(3000);
}
```

### 配置壓縮級別

```typescript
app.use(
  compression({
    level: 6,  // 默認，範圍 0-9，9 為最高壓縮率
    threshold: 1024,  // 最小 1KB 才壓縮
    filter: (req, res) => {
      // 排除特定路由或文件類型
      if (req.path?.includes('/stream')) {
        return false;
      }
      return compression.filter(req, res);
    },
  }),
);
```

### 支持 Brotli（需額外包）

```bash
npm install --save brotli-size iltorb
```

```typescript
import { brotliCompress } from 'zlib';

app.use(
  compression({
    // Express compression 默認使用 gzip
    // Fastify @fastify/compress 可配置 Brotli
  }),
);
```

---

## Fastify 壓縮

### 基本設置

```typescript
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import fastifyCompress from '@fastify/compress';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  await app.register(fastifyCompress, { threshold: 1024 });

  await app.listen(3000);
}
```

### 支持多種壓縮編碼

```typescript
await app.register(fastifyCompress, {
  threshold: 1024,
  encodings: ['gzip', 'deflate', 'br'],  // Brotli 支持
});
```

### 自訂壓縮級別

```typescript
await app.register(fastifyCompress, {
  zlibDeflateOptions: {
    level: 6,
    memLevel: 7,
    strategy: 3,
  },
  brotliOptions: {
    lgwin: 22,
    mode: 1,
    quality: 11,
  },
});
```

---

## 排除壓縮的文件類型

```typescript
// Express
app.use(
  compression({
    filter: (req, res) => {
      const type = res.getHeader('Content-Type');
      
      // 不壓縮已壓縮的文件
      if (type?.includes('image/') || type?.includes('video/')) {
        return false;
      }
      
      return compression.filter(req, res);
    },
  }),
);
```

---

## 動態部分響應

```typescript
import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';

@Controller('api')
export class ApiController {
  @Get('large-data')
  getLargeData(@Res() res: Response) {
    // 大型 JSON 響應會自動被壓縮
    const largeData = {
      items: Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        description: 'Lorem ipsum dolor sit amet...',
      })),
    };
    
    return res.json(largeData);
  }
}
```

---

## 直接使用壓縮中間件模塊

```typescript
import { Module } from '@nestjs/common';
import compression from 'compression';

@Module({
  imports: [],
})
export class CompressionModule {}

export const compressionMiddleware = compression({
  level: 6,
  threshold: 1024,
});
```

### 在其他模塊中使用

```typescript
@Module({
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(compressionMiddleware)
      .forRoutes('*');
  }
}
```

---

## 性能考慮

```typescript
// 生產環境建議配置
{
  level: 6,           // 平衡速度和壓縮率
  threshold: 1024,    // 只壓縮 > 1KB 的響應
  filter: customFilter, // 排除已壓縮類型
}
```

---

## 代理後面的壓縮

```typescript
// 如果使用反向代理（Nginx、Apache），
// 考慮禁用應用層壓縮，讓代理層處理
const shouldCompress = process.env.NODE_ENV !== 'production';

app.use(compression({ enabled: shouldCompress }));
```

---

## 參考資源

- https://docs.nestjs.com/techniques/compression
- https://github.com/expressjs/compression
- https://github.com/fastify/fastify-compress
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Encoding
