# NestJS 微服務管道（Pipes）

微服務管道數據驗證與轉換。

---

## 基本概念

微服務管道與 HTTP 管道相似，但在異常時必須拋出 `RpcException` 而非 `HttpException`。

---

## 驗證管道

### 使用 ValidationPipe

```typescript
import { MessagePattern, UsePipes, ValidationPipe } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

class CreateUserDto {
  name: string;
  email: string;
  age: number;
}

@UsePipes(
  new ValidationPipe({
    exceptionFactory: (errors) => new RpcException(errors),
  }),
)
@MessagePattern('create_user')
async createUser(data: CreateUserDto) {
  return { userId: 1, ...data };
}
```

### DTO 驗證

```typescript
import { IsEmail, IsNotEmpty, IsNumber, Min, Max } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @Min(1)
  @Max(100)
  name: string;

  @IsEmail()
  email: string;

  @IsNumber()
  @Min(0)
  @Max(150)
  age: number;
}
```

---

## 自訂管道

### 建立自訂管道

```typescript
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseIntPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    const val = parseInt(value, 10);
    if (isNaN(val)) {
      throw new RpcException('Validation failed: value is not a number');
    }
    return val;
  }
}
```

### 在消息模式中使用

```typescript
import { MessagePattern, Param } from '@nestjs/common';

@MessagePattern({ cmd: 'get_user' })
getUser(@Param('id', ParseIntPipe) id: number) {
  return { id, name: 'John Doe' };
}
```

---

## 綁定管道

### 方法級別

```typescript
@UsePipes(ValidationPipe)
@MessagePattern('create_post')
async createPost(data: CreatePostDto) {
  return { postId: 1, ...data };
}
```

---

## 數據轉換

### 自訂轉換管道

```typescript
import { PipeTransform, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class TransformDataPipe implements PipeTransform {
  transform(data: any) {
    try {
      // 轉換為大寫
      if (typeof data === 'string') {
        return data.toUpperCase();
      }
      
      // 轉換對象中的字符串
      if (typeof data === 'object') {
        const transformed = {};
        for (const [key, value] of Object.entries(data)) {
          transformed[key] = typeof value === 'string' ? (value as string).toUpperCase() : value;
        }
        return transformed;
      }
      
      return data;
    } catch (error) {
      throw new RpcException('Data transformation failed');
    }
  }
}

@UsePipes(TransformDataPipe)
@MessagePattern('process_text')
processText(data: { text: string }) {
  console.log(data.text);  // 大寫形式
  return { processed: true };
}
```

---

## 驗證裝飾器

### 類驗證裝飾器

```typescript
import { IsEnum, IsInt, Min, Max } from 'class-validator';

enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
}

export class UpdateUserDto {
  @IsEnum(UserRole)
  role: UserRole;

  @IsInt()
  @Min(1)
  @Max(100)
  level: number;
}
```

### 自訂驗證裝飾器

```typescript
import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsValidPhone(validationOptions?: ValidationOptions) {
  return function (target: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidPhone',
      target: target.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return /^\+?[1-9]\d{1,14}$/.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid phone number`;
        },
      },
    });
  };
}

export class CreateContactDto {
  @IsValidPhone()
  phone: string;
}
```

---

## 複雜驗證

### 條件驗證

```typescript
import { ValidateIf } from 'class-validator';

export class RegisterUserDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;

  @ValidateIf((obj) => obj.agreeTerms === true)
  @IsNotEmpty()
  acceptedDate?: Date;

  agreeTerms: boolean;
}
```

### 嵌套對象驗證

```typescript
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

export class AddressDto {
  @IsNotEmpty()
  street: string;

  @IsNotEmpty()
  city: string;
}

export class CreatePersonDto {
  @IsNotEmpty()
  name: string;

  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;
}
```

---

## 完整示例

### DTO 定義

```typescript
import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsEnum,
  IsOptional,
  ValidateNested,
  Type,
} from 'class-validator';

enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

class ProfileDto {
  @IsNotEmpty()
  bio: string;

  @IsOptional()
  avatar: string;
}

export class CreateUserDto {
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  name: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsEnum(UserRole)
  role: UserRole;

  @ValidateNested()
  @Type(() => ProfileDto)
  @IsOptional()
  profile?: ProfileDto;
}
```

### 控制器

```typescript
@Controller()
export class UserController {
  @UsePipes(
    new ValidationPipe({
      whitelist: true,           // 移除未定義的屬性
      forbidNonWhitelisted: true, // 如果有未定義屬性則拒絕
      transform: true,           // 自動轉換類型
      exceptionFactory: (errors) => new RpcException(errors),
    }),
  )
  @MessagePattern('create_user')
  async createUser(data: CreateUserDto) {
    return { userId: 1, ...data };
  }
}
```
