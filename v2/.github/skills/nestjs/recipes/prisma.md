# NestJS Prisma ORM

使用 Prisma 進行現代化的數據庫操作。

---

## 安裝

```bash
npm install --save @prisma/client
npm install -D prisma
```

---

## 初始化 Prisma

```bash
npx prisma init
```

---

## Schema 定義

### prisma/schema.prisma

```prisma
// This is your Prisma schema file,
generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
  posts Post[]
}

model Post {
  id        Int     @id @default(autoincrement())
  title     String
  content   String?
  published Boolean @default(false)
  author    User?   @relation(fields: [authorId], references: [id])
  authorId  Int?
}
```

---

## 生成數據庫

```bash
npx prisma migrate dev --name init
npx prisma generate
```

---

## Prisma Service

### prisma.service.ts

```typescript
import { Injectable } from '@nestjs/common'
import { PrismaClient } from './generated/prisma/client'

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    super()
  }
}
```

---

## Data Access Service

### user.service.ts

```typescript
import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { User, Prisma } from 'generated/prisma'

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async user(userWhereUniqueInput: Prisma.UserWhereUniqueInput): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: userWhereUniqueInput,
    })
  }

  async users(params: {
    skip?: number
    take?: number
    where?: Prisma.UserWhereInput
    orderBy?: Prisma.UserOrderByWithRelationInput
  }): Promise<User[]> {
    const { skip, take, where, orderBy } = params
    return this.prisma.user.findMany({
      skip,
      take,
      where,
      orderBy,
    })
  }

  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data,
    })
  }

  async updateUser(params: { where: Prisma.UserWhereUniqueInput; data: Prisma.UserUpdateInput }): Promise<User> {
    const { where, data } = params
    return this.prisma.user.update({
      data,
      where,
    })
  }

  async deleteUser(where: Prisma.UserWhereUniqueInput): Promise<User> {
    return this.prisma.user.delete({
      where,
    })
  }
}
```

---

## Controller

```typescript
import { Controller, Get, Post, Param, Body } from '@nestjs/common'
import { UsersService } from './users.service'
import { User as UserModel } from 'generated/prisma'

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get(':email')
  async getUser(@Param('email') email: string): Promise<UserModel> {
    return this.usersService.user({ email })
  }

  @Get()
  async getAllUsers(): Promise<UserModel[]> {
    return this.usersService.users({})
  }

  @Post()
  async createUser(@Body() userData: { email: string; name?: string }): Promise<UserModel> {
    return this.usersService.createUser(userData)
  }
}
```

---

## Module 設置

```typescript
import { Module } from '@nestjs/common'
import { PrismaService } from './prisma/prisma.service'
import { UsersService } from './users/users.service'
import { UsersController } from './users/users.controller'

@Module({
  providers: [PrismaService, UsersService],
  controllers: [UsersController],
})
export class AppModule {}
```

---

## 常用查詢方法

```typescript
// 查詢單個記錄
const user = await prisma.user.findUnique({
  where: { email: 'test@example.com' },
})

// 查詢多個記錄
const users = await prisma.user.findMany({
  where: {},
  take: 10,
  skip: 0,
})

// 創建記錄
const newUser = await prisma.user.create({
  data: { email: 'new@example.com', name: 'John' },
})

// 更新記錄
const updated = await prisma.user.update({
  where: { id: 1 },
  data: { name: 'John Doe' },
})

// 刪除記錄
await prisma.user.delete({
  where: { id: 1 },
})
```

---

## 參考資源

- https://docs.nestjs.com/recipes/prisma
- https://www.prisma.io/docs
