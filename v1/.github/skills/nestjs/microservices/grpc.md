# NestJS gRPC 微服務

使用 Protocol Buffers 和 gRPC 實現高性能遠程調用。

---

## 安裝

```bash
npm install --save @grpc/grpc-js @grpc/proto-loader
```

---

## Proto 定義

建立 `.proto` 文件定義服務：

```protobuf
// hero/hero.proto
syntax = "proto3";

package hero;

service HeroesService {
  rpc FindOne (HeroById) returns (Hero) {}
  rpc FindAll (Empty) returns (Heroes) {}
  rpc CreateHero (CreateHeroRequest) returns (Hero) {}
}

message HeroById {
  int32 id = 1;
}

message Empty {}

message Hero {
  int32 id = 1;
  string name = 2;
  string email = 3;
}

message Heroes {
  repeated Hero items = 1;
}

message CreateHeroRequest {
  string name = 1;
  string email = 2;
}
```

---

## 服務端設置

### 配置主文件

```typescript
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.GRPC,
      options: {
        package: 'hero',
        protoPath: join(__dirname, '../hero/hero.proto'),
        url: '0.0.0.0:5000',  // gRPC 服務地址
      },
    },
  );
  await app.listen();
}
bootstrap();
```

### Nest CLI 配置

```json
{
  "compilerOptions": {
    "assets": ["**/*.proto"],
    "watchAssets": true
  }
}
```

### 控制器實現

```typescript
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { Metadata, ServerUnaryCall } from '@grpc/grpc-js';

interface HeroById {
  id: number;
}

interface Hero {
  id: number;
  name: string;
  email: string;
}

@Controller()
export class HeroesController {
  private heroes = [
    { id: 1, name: 'John', email: 'john@example.com' },
    { id: 2, name: 'Jane', email: 'jane@example.com' },
  ];

  @GrpcMethod('HeroesService', 'FindOne')
  findOne(
    data: HeroById,
    metadata: Metadata,
    call: ServerUnaryCall<any, any>,
  ): Hero {
    return this.heroes.find(({ id }) => id === data.id);
  }

  @GrpcMethod('HeroesService')  // 自動匹配 FindAll
  findAll(): { items: Hero[] } {
    return { items: this.heroes };
  }

  @GrpcMethod('HeroesService')
  createHero(data: { name: string; email: string }): Hero {
    const newHero = {
      id: this.heroes.length + 1,
      name: data.name,
      email: data.email,
    };
    this.heroes.push(newHero);
    return newHero;
  }
}
```

---

## 客戶端設置

### 模塊配置

```typescript
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'HERO_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'hero',
          protoPath: join(__dirname, '../hero/hero.proto'),
          url: 'localhost:5000',
        },
      },
    ]),
  ],
})
export class AppModule {}
```

### 服務使用

```typescript
import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Observable } from 'rxjs';

interface HeroesService {
  findOne(data: { id: number }): Observable<any>;
  findAll(data: {}): Observable<any>;
  createHero(data: { name: string; email: string }): Observable<any>;
}

@Injectable()
export class AppService implements OnModuleInit {
  private heroesService: HeroesService;

  constructor(@Inject('HERO_PACKAGE') private client: ClientGrpc) {}

  onModuleInit() {
    this.heroesService = this.client.getService<HeroesService>('HeroesService');
  }

  getHero(id: number): Observable<any> {
    return this.heroesService.findOne({ id });
  }

  getAllHeroes(): Observable<any> {
    return this.heroesService.findAll({});
  }

  createNewHero(name: string, email: string): Observable<any> {
    return this.heroesService.createHero({ name, email });
  }
}
```

---

## 元數據處理

### 讀取請求元數據

```typescript
@GrpcMethod('HeroesService')
findOne(
  data: HeroById,
  metadata: Metadata,
  call: ServerUnaryCall<any, any>,
): Hero {
  const authToken = metadata.get('authorization')[0] as string;
  console.log('Token:', authToken);
  
  return this.heroes.find(({ id }) => id === data.id);
}
```

### 發送響應元數據

```typescript
@GrpcMethod('HeroesService')
findOne(
  data: HeroById,
  metadata: Metadata,
  call: ServerUnaryCall<any, any>,
): Hero {
  const responseMetadata = new Metadata();
  responseMetadata.add('custom-header', 'custom-value');
  
  call.sendMetadata(responseMetadata);
  
  return this.heroes.find(({ id }) => id === data.id);
}
```

### 發送元數據給服務端

```typescript
import { Metadata } from '@grpc/grpc-js';

const metadata = new Metadata();
metadata.add('authorization', `Bearer ${token}`);

this.heroesService.findOne({ id: 1 }, metadata).subscribe(hero => {
  console.log(hero);
});
```

---

## gRPC Streaming

### Proto 定義

```protobuf
service HelloService {
  rpc BidiHello(stream HelloRequest) returns (stream HelloResponse);
  rpc LotsOfGreetings(stream HelloRequest) returns (HelloResponse);
}

message HelloRequest {
  string greeting = 1;
}

message HelloResponse {
  string reply = 1;
}
```

### 實現流

```typescript
import { GrpcStreamMethod } from '@nestjs/microservices';
import { Subject, Observable } from 'rxjs';

@GrpcStreamMethod('HelloService')
bidiHello(
  messages: Observable<any>,
  metadata: Metadata,
  call: ServerDuplexStream<any, any>,
): Observable<any> {
  const subject = new Subject();

  const onNext = (message: any) => {
    console.log('Message:', message);
    subject.next({ reply: `Hello, ${message.greeting}!` });
  };

  const onComplete = () => subject.complete();

  messages.subscribe({
    next: onNext,
    complete: onComplete,
    error: (error) => subject.error(error),
  });

  return subject.asObservable();
}
```

### 客戶端流

```typescript
import { ReplaySubject } from 'rxjs';

const helloRequest$ = new ReplaySubject();

helloRequest$.next({ greeting: 'Hello (1)!' });
helloRequest$.next({ greeting: 'Hello (2)!' });
helloRequest$.complete();

this.helloService.bidiHello(helloRequest$).subscribe(response => {
  console.log('Response:', response);
});
```

---

## gRPC Reflection

### 安裝

```bash
npm install --save @grpc/reflection
```

### 配置反射

```typescript
import { ReflectionService } from '@grpc/reflection';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.GRPC,
      options: {
        package: 'hero',
        protoPath: join(__dirname, '../hero/hero.proto'),
        onLoadPackageDefinition: (pkg, server) => {
          new ReflectionService(pkg).addToServer(server);
        },
      },
    },
  );
  await app.listen();
}
bootstrap();
```

---

## 健康檢查

### 安裝

```bash
npm install --save grpc-health-check
```

### 配置健康檢查

```typescript
import { HealthImplementation, protoPath as healthCheckProtoPath } from 'grpc-health-check';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.GRPC,
      options: {
        package: ['hero', 'grpc.health.v1'],
        protoPath: [
          healthCheckProtoPath,
          join(__dirname, '../hero/hero.proto'),
        ],
        onLoadPackageDefinition: (pkg, server) => {
          const healthImpl = new HealthImplementation({
            '': 'UNKNOWN',
          });
          healthImpl.addToServer(server);
          healthImpl.setStatus('hero.HeroesService', 'SERVING');
        },
      },
    },
  );
  await app.listen();
}
bootstrap();
```

---

## 完整工作流

### 1. 啟動服務端

```bash
npm run start:microservice
# 監聽 localhost:5000
```

### 2. 在客戶端調用

```typescript
@Controller()
export class AppController {
  constructor(private appService: AppService) {}

  @Get('hero/:id')
  async getHero(@Param('id') id: string) {
    return this.appService.getHero(parseInt(id)).toPromise();
  }

  @Get('heroes')
  async getAllHeroes() {
    const result = await this.appService.getAllHeroes().toPromise();
    return result.items;
  }
}
```

---

## 參考資源

- https://docs.nestjs.com/microservices/grpc
- https://grpc.io/
- https://protobuf.dev/
- https://github.com/grpc/grpc-node
