# NestJS Cookies

使用 Express 和 Fastify 處理 HTTP Cookies。

---

## 安裝

### Express（預設）

```bash
npm install --save cookie-parser
npm install -D @types/cookie-parser
```

### Fastify

```bash
npm install --save @fastify/cookie
```

---

## Express Cookie 處理

### 設置中間件

```typescript
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use(cookieParser('secret-key'));  // 用於簽名 cookies
  await app.listen(3000);
}
```

### 讀取 Cookies

```typescript
import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';

@Controller('cookies')
export class CookiesController {
  @Get('get')
  getCookie(@Res() res: Response) {
    const cookies = res.req.cookies;
    return res.json(cookies);
  }
}
```

### 設置 Cookies

```typescript
@Get('set')
setCookie(@Res() res: Response) {
  res.cookie('name', 'value', {
    maxAge: 1000 * 60 * 60 * 24,  // 24 小時
    httpOnly: true,
    secure: true,  // HTTPS only
    signed: true,  // 簽名
  });
  return res.json({ success: true });
}
```

### 清除 Cookies

```typescript
@Get('clear')
clearCookie(@Res() res: Response) {
  res.clearCookie('name');
  return res.json({ success: true });
}
```

---

## Fastify Cookie 處理

### 註冊插件

```typescript
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  await app.register(fastifyCookie, {
    secret: 'secret-key',
  });
  await app.listen(3000);
}
```

### 讀取 Cookies（Fastify）

```typescript
@Get('get')
getCookie(@Req() req: FastifyRequest) {
  const cookies = req.cookies;
  return cookies;
}
```

### 設置 Cookies（Fastify）

```typescript
@Get('set')
setCookie(@Res() res: FastifyReply) {
  res.setCookie('name', 'value', {
    maxAge: 1000 * 60 * 60 * 24,
    httpOnly: true,
    secure: true,
    signed: true,
  });
  return res.send({ success: true });
}
```

---

## 自訂 Cookie 裝飾器

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const Cookie = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return data ? request.cookies?.[data] : request.cookies;
  },
);
```

### 使用自訂裝飾器

```typescript
@Get('profile')
getProfile(@Cookie('userId') userId: string) {
  return { userId };
}
```

---

## 跨平台支持

```typescript
import { Req, Res } from '@nestjs/common';

@Get('data')
handleCookie(
  @Req() req: any,
  @Res() res: any,
) {
  const isExpress = req.cookies !== undefined;
  
  if (isExpress) {
    res.cookie('name', 'value', { maxAge: 3600000 });
  } else {
    res.setCookie('name', 'value', { maxAge: 3600000 });
  }
  
  return res.send({ success: true });
}
```

---

## 安全最佳實踐

```typescript
@Get('set-secure')
setSecureCookie(@Res() res: Response) {
  res.cookie('sessionId', generateToken(), {
    maxAge: 1000 * 60 * 60,  // 1 小時
    httpOnly: true,          // 無法通過 JavaScript 存取
    secure: true,            // 僅在 HTTPS 下傳送
    signed: true,            // 簽名以防止篡改
    sameSite: 'strict',      // CSRF 防護
  });
  return res.json({ success: true });
}
```

---

## 參考資源

- https://docs.nestjs.com/techniques/cookies
- https://github.com/expressjs/cookie-parser
- https://github.com/fastify/fastify-cookie
