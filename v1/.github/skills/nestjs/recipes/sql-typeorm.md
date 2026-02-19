# NestJS SQL (TypeORM)

使用 TypeORM 進行數據庫操作。

---

## 安裝

```bash
npm install --save typeorm mysql2
npm install --save @nestjs/typeorm
```

---

## 數據庫提供商

### database.providers.ts

```typescript
import { DataSource } from 'typeorm'

export const databaseProviders = [
  {
    provide: 'DATA_SOURCE',
    useFactory: async () => {
      const dataSource = new DataSource({
        type: 'mysql',
        host: 'localhost',
        port: 3306,
        username: 'root',
        password: 'password',
        database: 'test_db',
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        synchronize: true,
      })

      return dataSource.initialize()
    },
  },
]
```

---

## Database Module

```typescript
import { Module } from '@nestjs/common'
import { databaseProviders } from './database.providers'

@Module({
  providers: [...databaseProviders],
  exports: [...databaseProviders],
})
export class DatabaseModule {}
```

---

## Entity 定義

### user.entity.ts

```typescript
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm'

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ unique: true })
  email: string

  @Column({ nullable: true })
  name: string

  @Column()
  password: string
}
```

### post.entity.ts

```typescript
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm'
import { User } from './user.entity'

@Entity()
export class Post {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  title: string

  @Column({ nullable: true })
  content: string

  @Column({ default: false })
  published: boolean

  @ManyToOne(() => User)
  author: User
}
```

---

## 儲存庫提供商

### user.providers.ts

```typescript
import { DataSource } from 'typeorm'
import { User } from './user.entity'

export const userProviders = [
  {
    provide: 'USER_REPOSITORY',
    useFactory: (dataSource: DataSource) => dataSource.getRepository(User),
    inject: ['DATA_SOURCE'],
  },
]
```

---

## Service

```typescript
import { Injectable, Inject } from '@nestjs/common'
import { Repository } from 'typeorm'
import { User } from './user.entity'

@Injectable()
export class UsersService {
  constructor(
    @Inject('USER_REPOSITORY')
    private userRepository: Repository<User>
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepository.find()
  }

  async findOne(id: number): Promise<User> {
    return this.userRepository.findOneBy({ id })
  }

  async create(user: Partial<User>): Promise<User> {
    return this.userRepository.save(user)
  }

  async update(id: number, user: Partial<User>): Promise<User> {
    await this.userRepository.update(id, user)
    return this.findOne(id)
  }

  async remove(id: number): Promise<void> {
    await this.userRepository.delete(id)
  }
}
```

---

## Module

```typescript
import { Module } from '@nestjs/common'
import { DatabaseModule } from '../database/database.module'
import { userProviders } from './user.providers'
import { UsersService } from './users.service'

@Module({
  imports: [DatabaseModule],
  providers: [...userProviders, UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

---

## Controller

```typescript
import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common'
import { UsersService } from './users.service'
import { User } from './user.entity'

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  findAll(): Promise<User[]> {
    return this.usersService.findAll()
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<User> {
    return this.usersService.findOne(Number(id))
  }

  @Post()
  create(@Body() user: Partial<User>): Promise<User> {
    return this.usersService.create(user)
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() user: Partial<User>): Promise<User> {
    return this.usersService.update(Number(id), user)
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.usersService.remove(Number(id))
  }
}
```

---

## 參考資源

- https://docs.nestjs.com/recipes/sql-typeorm
- https://typeorm.io/
