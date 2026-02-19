# NestJS HTTP 客戶端（HttpModule）

使用 @nestjs/axios 與 Axios 發送 HTTP 請求。

---

## 安裝

```bash
npm install --save @nestjs/axios axios
```

---

## 基本設置

### 導入 HttpModule

```typescript
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

### 注入 HttpService

```typescript
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AppService {
  constructor(private readonly httpService: HttpService) {}

  async getData() {
    const { data } = await firstValueFrom(
      this.httpService.get('https://api.example.com/data')
    );
    return data;
  }
}
```

---

## GET 請求

### 基本 GET

```typescript
async getUser(id: string) {
  const { data } = await firstValueFrom(
    this.httpService.get(`https://api.example.com/users/${id}`)
  );
  return data;
}
```

### 帶查詢參數

```typescript
async searchUsers(name: string) {
  const { data } = await firstValueFrom(
    this.httpService.get('https://api.example.com/users', {
      params: { name: name },
    })
  );
  return data;
}
```

### 帶請求頭

```typescript
async getAuthData() {
  const { data } = await firstValueFrom(
    this.httpService.get('https://api.example.com/protected', {
      headers: {
        'Authorization': 'Bearer token123',
        'Custom-Header': 'value',
      },
    })
  );
  return data;
}
```

---

## POST 請求

```typescript
async createUser(userData: any) {
  const { data } = await firstValueFrom(
    this.httpService.post('https://api.example.com/users', userData, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
  );
  return data;
}
```

---

## 全局配置

### 設置超時和基礎 URL

```typescript
HttpModule.register({
  timeout: 5000,
  maxRedirects: 5,
})
```

### 異步配置

```typescript
HttpModule.registerAsync({
  useFactory: () => ({
    timeout: 5000,
    maxRedirects: 5,
  }),
});
```

---

## 錯誤處理

```typescript
import { catchError } from 'rxjs';
import { HttpException, HttpStatus } from '@nestjs/common';

async getDataWithErrorHandling() {
  try {
    const { data } = await firstValueFrom(
      this.httpService.get('https://api.example.com/data').pipe(
        catchError((error) => {
          throw new HttpException(
            error.response?.data || error.message,
            error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }),
      ),
    );
    return data;
  } catch (error) {
    throw error;
  }
}
```

---

## 重試邏輯

```typescript
import { retry } from 'rxjs';

async getDataWithRetry() {
  const { data } = await firstValueFrom(
    this.httpService.get('https://api.example.com/data').pipe(
      retry(3),  // 失敗後重試 3 次
    ),
  );
  return data;
}
```

---

## 超時控制

```typescript
import { timeout } from 'rxjs';

async getDataWithTimeout() {
  const { data } = await firstValueFrom(
    this.httpService.get('https://api.example.com/data').pipe(
      timeout(10000),  // 10 秒超時
    ),
  );
  return data;
}
```

---

## 參考資源

- https://docs.nestjs.com/techniques/http-module
- https://github.com/axios/axios
