# NestJS 配置管理

使用 `@nestjs/config` 管理環境變數和動態配置。

---

## 安裝

```bash
npm install --save @nestjs/config
```

---

## 基本設置

### 在 AppModule 中配置

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot()],
})
export class AppModule {}
```

---

## 環境變數管理

### .env 文件

```
DATABASE_USER=postgres
DATABASE_PASSWORD=secret
DATABASE_HOST=localhost
DATABASE_PORT=5432
PORT=3000
NODE_ENV=development
```

### 使用 ConfigService

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DatabaseService {
  constructor(private configService: ConfigService) {}

  connect() {
    const user = this.configService.get<string>('DATABASE_USER');
    const password = this.configService.get<string>('DATABASE_PASSWORD');
    const host = this.configService.get<string>('DATABASE_HOST');
    const port = this.configService.get<number>('DATABASE_PORT');
    
    console.log(`Connecting to ${host}:${port}`);
  }
}
```

---

## 自訂環境文件路徑

```typescript
ConfigModule.forRoot({
  envFilePath: '.development.env',
});

// 或多個文件
ConfigModule.forRoot({
  envFilePath: ['.env.development.local', '.env.development'],
});
```

---

## 全域使用

```typescript
ConfigModule.forRoot({
  isGlobal: true,
});

// 之後無需在其他模組中導入 ConfigModule
```

---

## 自訂配置文件

### 創建配置工廠

```typescript
// src/config/configuration.ts
export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
});
```

### 在 AppModule 中使用

```typescript
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
    }),
  ],
})
export class AppModule {}
```

### 訪問嵌套值

```typescript
const dbHost = this.configService.get<string>('database.host');
const jwtSecret = this.configService.get<string>('jwt.secret');
```

---

## Namespaced 配置

### 使用 registerAs

```typescript
// src/config/database.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
}));
```

### 訪問 Namespace 值

```typescript
// 方式1：點記號
const dbHost = this.configService.get<string>('database.host');

// 方式2：注入 Namespace
import databaseConfig from './config/database.config';

constructor(
  @Inject(databaseConfig.KEY)
  private dbConfig: ConfigType<typeof databaseConfig>,
) {}

// 使用
this.dbConfig.host;
```

---

## 配置驗證

### 使用 Joi 驗證

```bash
npm install joi
```

```typescript
import * as Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: Joi.number().port().default(3000),
        DATABASE_HOST: Joi.string().required(),
        DATABASE_USER: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
      }),
    }),
  ],
})
export class AppModule {}
```

---

## 自訂驗證函數

```typescript
import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, validateSync } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsNumber()
  PORT: number;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(
    EnvironmentVariables,
    config,
    { enableImplicitConversion: true },
  );
  const errors = validateSync(validatedConfig);

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}

@Module({
  imports: [ConfigModule.forRoot({ validate })],
})
export class AppModule {}
```

---

## 配置提供者

```typescript
// 在 ForRootAsync 中使用配置
TypeOrmModule.forRootAsync(databaseConfig.asProvider())
```

---

## 參考資源

- https://docs.nestjs.com/techniques/configuration
