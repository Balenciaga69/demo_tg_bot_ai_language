# NestJS Sessions

管理用戶會話狀態。支援 Express 和 Fastify。

---

## 安裝

### Express

```bash
npm install --save express-session
npm install -D @types/express-session
```

### Fastify

```bash
npm install --save @fastify/secure-session
```

---

## Express Sessions

### 基本設置

```typescript
import { NestExpressApplication } from '@nestjs/platform-express';
import session from 'express-session';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  app.use(
    session({
      secret: 'secret-key',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: true,     // HTTPS only
        maxAge: 1000 * 60 * 60 * 24,  // 24 小時
        httpOnly: true,
      },
    }),
  );
  
  await app.listen(3000);
}
```

### 使用會話

```typescript
import { Controller, Get, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';

@Controller('session')
export class SessionController {
  @Get('login')
  login(@Req() req: Request, @Res() res: Response) {
    req.session.userId = 123;
    req.session.username = 'john';
    return res.json({ success: true });
  }

  @Get('profile')
  getProfile(@Req() req: Request) {
    return {
      userId: req.session.userId,
      username: req.session.username,
    };
  }

  @Get('logout')
  logout(@Req() req: Request, @Res() res: Response) {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  }
}
```

---

## Fastify Sessions

### 基本設置

```typescript
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import fastifySecureSession from '@fastify/secure-session';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  
  await app.register(fastifySecureSession, {
    secret: 'averylogscretkey',  // 至少 32 個字符
    salt: 'mNxzflFpF0dfxlzf',
    cookie: {
      path: '/',
      secure: true,
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24,
    },
  });
  
  await app.listen(3000);
}
```

### 使用會話（Fastify）

```typescript
@Get('login')
login(@Req() req: FastifyRequest) {
  req.session.userId = 123;
  req.session.username = 'john';
  return { success: true };
}

@Get('profile')
getProfile(@Req() req: FastifyRequest) {
  return {
    userId: req.session.userId,
    username: req.session.username,
  };
}

@Get('logout')
logout(@Req() req: FastifyRequest) {
  req.session.delete();
  return { success: true };
}
```

---

## 配置存儲

### 使用 Redis（推薦用於生產）

```bash
npm install --save connect-redis redis
```

```typescript
import session from 'express-session';
import RedisStore from 'connect-redis';
import { createClient } from 'redis';

const redisClient = createClient();
const store = new RedisStore({ client: redisClient });

app.use(
  session({
    store: store,
    secret: 'secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true,
      maxAge: 1000 * 60 * 60 * 24,
    },
  }),
);
```

---

## 自訂會話裝飾器

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentSession = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return data ? request.session?.[data] : request.session;
  },
);
```

### 使用

```typescript
@Get('profile')
getProfile(@CurrentSession() session: any) {
  return { userId: session.userId };
}

@Get('user-id')
getUserId(@CurrentSession('userId') userId: number) {
  return { userId };
}
```

---

## 會話中間件

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class SessionMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    if (!req.session.userId) {
      req.session.visitCount = (req.session.visitCount || 0) + 1;
    }
    next();
  }
}
```

---

## 參考資源

- https://docs.nestjs.com/techniques/session
- https://github.com/expressjs/session
- https://github.com/fastify/fastify-secure-session
- https://github.com/tj/connect-redis
