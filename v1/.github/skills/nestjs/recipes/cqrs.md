# NestJS CQRS 模式

命令查詢責任隔離（CQRS）將應用程式的讀寫操作分離。

---

## 安裝

```bash
npm install --save @nestjs/cqrs
```

---

## 基本設置

### 導入 CqrsModule

```typescript
import { Module } from '@nestjs/common'
import { CqrsModule } from '@nestjs/cqrs'

@Module({
  imports: [CqrsModule.forRoot()],
})
export class AppModule {}
```

---

## 命令（Commands）

### 定義命令

```typescript
import { Command } from '@nestjs/cqrs'

export class CreateHeroCommand extends Command {
  constructor(
    public readonly heroId: string,
    public readonly name: string
  ) {
    super()
  }
}
```

### 命令處理器

```typescript
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs'

@CommandHandler(CreateHeroCommand)
export class CreateHeroHandler implements ICommandHandler<CreateHeroCommand> {
  constructor(private readonly repository: HeroRepository) {}

  async execute(command: CreateHeroCommand) {
    const hero = new Hero(command.heroId, command.name)
    await this.repository.save(hero)
    return { success: true }
  }
}
```

### 在服務中使用命令

```typescript
import { Injectable } from '@nestjs/common'
import { CommandBus } from '@nestjs/cqrs'

@Injectable()
export class HeroService {
  constructor(private commandBus: CommandBus) {}

  async createHero(heroId: string, name: string) {
    return this.commandBus.execute(new CreateHeroCommand(heroId, name))
  }
}
```

---

## 查詢（Queries）

### 定義查詢

```typescript
import { Query } from '@nestjs/cqrs'

export class GetHeroQuery extends Query {
  constructor(public readonly heroId: string) {
    super()
  }
}
```

### 查詢處理器

```typescript
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs'

@QueryHandler(GetHeroQuery)
export class GetHeroHandler implements IQueryHandler<GetHeroQuery> {
  constructor(private readonly repository: HeroRepository) {}

  async execute(query: GetHeroQuery) {
    return this.repository.findById(query.heroId)
  }
}
```

### 在控制器中使用查詢

```typescript
import { Controller, Get, Param } from '@nestjs/common'
import { QueryBus } from '@nestjs/cqrs'

@Controller('heroes')
export class HeroController {
  constructor(private queryBus: QueryBus) {}

  @Get(':id')
  async getHero(@Param('id') id: string) {
    return this.queryBus.execute(new GetHeroQuery(id))
  }
}
```

---

## 事件（Events）

### 定義事件

```typescript
export class HeroCreatedEvent {
  constructor(
    public readonly heroId: string,
    public readonly name: string
  ) {}
}
```

### 事件處理器

```typescript
import { EventsHandler, IEventHandler } from '@nestjs/cqrs'

@EventsHandler(HeroCreatedEvent)
export class HeroCreatedHandler implements IEventHandler<HeroCreatedEvent> {
  handle(event: HeroCreatedEvent) {
    console.log(`Hero ${event.name} was created`)
    // 更新讀模型或發送通知
  }
}
```

### 發佈事件

```typescript
import { EventPublisher } from '@nestjs/cqrs'
import { AggregateRoot } from '@nestjs/cqrs'

export class Hero extends AggregateRoot {
  constructor(
    private id: string,
    private name: string
  ) {
    super()
  }

  createHero() {
    this.apply(new HeroCreatedEvent(this.id, this.name))
  }
}

@CommandHandler(CreateHeroCommand)
export class CreateHeroHandler {
  constructor(
    private publisher: EventPublisher,
    private repository: HeroRepository
  ) {}

  async execute(command: CreateHeroCommand) {
    const hero = this.publisher.mergeObjectContext(new Hero(command.heroId, command.name))
    hero.createHero()
    hero.commit()
    await this.repository.save(hero)
  }
}
```

---

## Sagas

Sagas 是長期運行的流程，監聽事件並觸發命令。

```typescript
import { Injectable } from '@nestjs/common'
import { Saga, ofType, map } from '@nestjs/cqrs'
import { Observable } from 'rxjs'
import { HeroCreatedEvent } from './hero-created.event'
import { SendNotificationCommand } from './send-notification.command'

@Injectable()
export class HeroSagas {
  @Saga()
  heroCreated = (events$: Observable<any>): Observable<any> => {
    return events$.pipe(
      ofType(HeroCreatedEvent),
      map((event) => new SendNotificationCommand(event.heroId, `Hero ${event.name} was created`))
    )
  }
}
```

---

## 模組註冊

```typescript
import { Module } from '@nestjs/common'
import { CqrsModule } from '@nestjs/cqrs'

@Module({
  imports: [CqrsModule],
  providers: [CreateHeroHandler, GetHeroHandler, HeroCreatedHandler, HeroSagas],
})
export class HeroModule {}
```

---

## 參考資源

- https://docs.nestjs.com/recipes/cqrs
- https://github.com/nestjs/cqrs
