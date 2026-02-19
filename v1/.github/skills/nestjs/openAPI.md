# NestJS OpenAPI / Swagger 最小限度可行代碼參考

OpenAPI/Swagger 集成 CheatSheet。

---

## 安裝與初始設定

### 安裝套件

```bash
npm install --save @nestjs/swagger swagger-ui-express
```

### 在 main.ts 中設定

```typescript
import { NestFactory } from '@nestjs/core'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // 建立 Swagger 配置
  const config = new DocumentBuilder()
    .setTitle('API 文檔')
    .setDescription('My API 描述')
    .setVersion('1.0')
    .addBearerAuth() // 如果需要認證
    .build()

  // 產生文檔
  const document = SwaggerModule.createDocument(app, config)

  // 設定 Swagger UI 路由
  SwaggerModule.setup('api/docs', app, document)

  await app.listen(process.env.PORT || 3000)
}

bootstrap()
```

---

## Controller 層級的 API 文檔裝飾器

```typescript
import { Controller, Get, Post, Body, Param } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { UsersService } from './users.service'

@ApiTags('users') // 群組化 API
@Controller('users')
export class UsersController {
  constructor(private service: UsersService) {}

  @Get()
  @ApiOperation({ summary: '取得所有用戶' })
  @ApiResponse({ status: 200, description: '成功取得用戶列表' })
  @ApiResponse({ status: 500, description: '伺服器錯誤' })
  findAll() {
    return this.service.findAll()
  }

  @Get(':id')
  @ApiOperation({ summary: '依 ID 取得用戶' })
  @ApiResponse({ status: 200, description: '用戶已找到' })
  @ApiResponse({ status: 404, description: '用戶未找到' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id)
  }

  @Post()
  @ApiOperation({ summary: '建立新用戶' })
  @ApiResponse({ status: 201, description: '用戶已建立', type: CreateUserResponse })
  create(@Body() createUserDto: CreateUserDto) {
    return this.service.create(createUserDto)
  }
}
```

---

## DTO 與 Entity 文檔

### 使用 class-validator 和 swagger 裝飾器

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsEmail, IsOptional, MinLength } from 'class-validator'

export class CreateUserDto {
  @ApiProperty({ example: 'john_doe' })
  @IsString()
  @MinLength(3)
  username: string

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string

  @ApiPropertyOptional({ description: '用戶描述' })
  @IsOptional()
  @IsString()
  description?: string
}

export class UserEntity {
  @ApiProperty({ example: '123' })
  id: string

  @ApiProperty({ example: 'john_doe' })
  username: string

  @ApiProperty({ example: 'john@example.com' })
  email: string

  @ApiPropertyOptional()
  description?: string
}
```

---

## 常用裝飾器速查

```typescript
// 操作文檔
@ApiOperation({ summary: '簡短描述', description: '詳細描述' })

// 回應文檔
@ApiResponse({ status: 200, description: '成功', type: ResponseDto })
@ApiResponse({ status: 404, description: '未找到' })

// 參數文檔
@ApiParam({ name: 'id', description: '用戶 ID' })

// 查詢字符串文檔
@ApiQuery({ name: 'page', required: false, type: Number })

// Bearer Token 認證
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: '未授權' })

// 標籤分組
@ApiTags('users', 'products')

// 不含此端點在 Swagger 中
@ApiExcludeEndpoint()
```

---

## Mapped Types（自動生成 DTO）

NestJS 提供工具自動生成衍生 DTO，減少重複代碼。

```typescript
import { ApiProperty, OmitType, PartialType, IntersectionType } from '@nestjs/swagger'

// 原始 DTO
export class CreateUserDto {
  @ApiProperty()
  username: string

  @ApiProperty()
  email: string

  @ApiProperty()
  password: string
}

// 更新 DTO：省略 password
export class UpdateUserDto extends OmitType(CreateUserDto, ['password']) {}

// 所有欄位選項：所有欄位變為可選
export class PartialUpdateUserDto extends PartialType(CreateUserDto) {}

// 組合多個 DTO
export class AdminUserDto extends IntersectionType(CreateUserDto, AdminMetaDto) {}
```

---

## 應用範例：完整 CRUD API

```typescript
import { Controller, Get, Post, Body, Param, Delete, Put } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger'
import { ProductsService } from './products.service'
import { CreateProductDto, UpdateProductDto, ProductEntity } from './dtos'

@ApiTags('products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private service: ProductsService) {}

  @Get()
  @ApiOperation({ summary: '列出所有產品' })
  @ApiResponse({ status: 200, type: [ProductEntity] })
  findAll() {
    return this.service.findAll()
  }

  @Get(':id')
  @ApiOperation({ summary: '依 ID 取得產品' })
  @ApiResponse({ status: 200, type: ProductEntity })
  @ApiResponse({ status: 404, description: '產品未找到' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id)
  }

  @Post()
  @ApiOperation({ summary: '建立新產品' })
  @ApiResponse({ status: 201, type: ProductEntity })
  create(@Body() createDto: CreateProductDto) {
    return this.service.create(createDto)
  }

  @Put(':id')
  @ApiOperation({ summary: '更新產品' })
  @ApiResponse({ status: 200, type: ProductEntity })
  update(@Param('id') id: string, @Body() updateDto: UpdateProductDto) {
    return this.service.update(id, updateDto)
  }

  @Delete(':id')
  @ApiOperation({ summary: '刪除產品' })
  @ApiResponse({ status: 204, description: '產品已刪除' })
  remove(@Param('id') id: string) {
    return this.service.remove(id)
  }
}
```

---

## 進階配置

### 自訂文檔標題和說明

```typescript
const config = new DocumentBuilder()
  .setTitle('My API')
  .setDescription('完整的 API 文檔')
  .setVersion('1.0.0')
  .setContact({
    name: '支援',
    url: 'https://example.com/support',
    email: 'support@example.com',
  })
  .setLicense('MIT', 'https://opensource.org/licenses/MIT')
  .addServer('http://localhost:3000', 'Development')
  .addServer('https://api.example.com', 'Production')
  .build()
```

### 設定多個 Swagger 文檔

```typescript
// API v1 文檔
const configV1 = new DocumentBuilder().setTitle('API v1').setVersion('1.0').build()
const documentV1 = SwaggerModule.createDocument(app, configV1)
SwaggerModule.setup('api/v1/docs', app, documentV1)

// API v2 文檔
const configV2 = new DocumentBuilder().setTitle('API v2').setVersion('2.0').build()
const documentV2 = SwaggerModule.createDocument(app, configV2)
SwaggerModule.setup('api/v2/docs', app, documentV2)
```

---

## 常見裝飾器組合

### 分頁列表端點

```typescript
@Get()
@ApiOperation({ summary: '分頁列表' })
@ApiQuery({ name: 'page', default: 1, type: Number })
@ApiQuery({ name: 'limit', default: 10, type: Number })
@ApiResponse({ status: 200, type: [UserEntity] })
findAll(@Query('page') page: number, @Query('limit') limit: number) {
  return this.service.findAll(page, limit);
}
```

### 檔案上傳端點

```typescript
import { UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiBody } from '@nestjs/swagger';

@Post('upload')
@ApiOperation({ summary: '上傳檔案' })
@ApiConsumes('multipart/form-data')
@ApiBody({
  schema: {
    type: 'object',
    properties: {
      file: {
        type: 'string',
        format: 'binary',
      },
    },
  },
})
@UseInterceptors(FileInterceptor('file'))
uploadFile(@UploadedFile() file: Express.Multer.File) {
  return { filename: file.filename };
}
```

---

## 參考資源

- https://docs.nestjs.com/openapi/introduction#setup-options
- https://docs.nestjs.com/openapi/mapped-types
- https://docs.nestjs.com/openapi/decorators
- https://docs.nestjs.com/openapi/other-features
