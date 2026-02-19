# NestJS 資料驗證

使用 `class-validator` 和 `ValidationPipe` 進行強大的資料驗證。

---

## 安裝依賴

```bash
npm i --save class-validator class-transformer
```

---

## 內建 ValidationPipe

### 全域使用

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

### 配置選項

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    transform: true,              // 自動轉換資料類型
    disableErrorMessages: false,  // 显示詳細錯誤訊息
    whitelist: true,              // 移除未驗證的屬性
    forbidNonWhitelisted: true,   // 非白名單屬性會拋出異常
    skipMissingProperties: false, // 驗證缺失的屬性
  }),
);
```

---

## DTO 驗證裝飾器

### 常用驗證器

```typescript
import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, IsNumber, Min, Max, IsOptional, IsEnum } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty({ message: '用戶名不能為空' })
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  username: string;

  @IsEmail()
  email: string;

  @MinLength(8)
  password: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(120)
  age?: number;

  @IsEnum(['admin', 'user', 'guest'])
  role: string;
}
```

### 參數級別驗證

```typescript
import { IsNumberString } from 'class-validator';

export class FindOneParams {
  @IsNumberString()
  id: string;
}

// 在 Controller 中使用
@Get(':id')
findOne(@Param() params: FindOneParams) {
  return this.service.findOne(params.id);
}
```

---

## 自動轉換資料類型

### 啟用自動轉換

```typescript
new ValidationPipe({ transform: true })
```

### 效果

```typescript
@Get(':id')
findOne(@Param('id') id: number) {
  console.log(typeof id === 'number'); // true - 自動從字符串轉為數字
}
```

---

## 陣列驗證

### 使用 ParseArrayPipe

```typescript
import { ParseArrayPipe } from '@nestjs/common';

@Post()
createBulk(
  @Body(new ParseArrayPipe({ items: CreateUserDto }))
  createUserDtos: CreateUserDto[],
) {
  return 'Bulk creation successful';
}
```

### 查詢參數中的陣列

```typescript
@Get()
findByIds(
  @Query('ids', new ParseArrayPipe({ items: Number, separator: ',' }))
  ids: number[],
) {
  return this.service.findByIds(ids);
}

// 使用：GET /?ids=1,2,3
```

---

## Mapped Types（自動生成 DTO）

### PartialType - 所有欄位可選

```typescript
import { PartialType } from '@nestjs/mapped-types';

export class CreateUserDto {
  username: string;
  email: string;
  password: string;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {}
```

### OmitType - 排除特定欄位

```typescript
import { OmitType } from '@nestjs/mapped-types';

export class UpdateUserDto extends OmitType(CreateUserDto, ['password'] as const) {}
```

### PickType - 只保留特定欄位

```typescript
import { PickType } from '@nestjs/mapped-types';

export class GetUserEmailDto extends PickType(CreateUserDto, ['email'] as const) {}
```

### IntersectionType - 組合多個 DTO

```typescript
import { IntersectionType } from '@nestjs/mapped-types';

export class AdminUserDto extends IntersectionType(CreateUserDto, AdminMetaDto) {}
```

---

## 自訂驗證器

```typescript
import { ValidatorConstraint, ValidatorConstraintInterface, registerDecorator, ValidationOptions } from 'class-validator';

@ValidatorConstraint({ name: 'isValidUsername', async: false })
export class IsValidUsernameConstraint implements ValidatorConstraintInterface {
  validate(value: string) {
    return /^[a-zA-Z0-9_]*$/.test(value);
  }

  defaultMessage() {
    return 'Username can only contain letters, numbers, and underscores';
  }
}

export function IsValidUsername(validationOptions?: ValidationOptions) {
  return function (target: Object, propertyName: string) {
    registerDecorator({
      target: target.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidUsernameConstraint,
    });
  };
}

// 使用
export class CreateUserDto {
  @IsValidUsername()
  username: string;
}
```

---

## 錯誤回應自訂

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    exceptionFactory: (errors) => {
      const messages = errors.map(error => ({
        field: error.property,
        errors: Object.values(error.constraints || {}),
      }));
      return new BadRequestException({
        statusCode: 400,
        message: 'Validation failed',
        errors: messages,
      });
    },
  }),
);
```

---

## 參考資源

- https://docs.nestjs.com/techniques/validation
- https://github.com/typestack/class-validator
