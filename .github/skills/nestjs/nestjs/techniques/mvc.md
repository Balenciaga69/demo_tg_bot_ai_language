# NestJS MVC

使用 NestJS 構建動態模板視圖應用。支援 Express 和 Fastify。

---

## 安裝

### Express（Handlebars）

```bash
npm install --save hbs
```

### Fastify（@fastify/view）

```bash
npm install --save @fastify/view
```

---

## Express 模板設置

### 配置主文件

```typescript
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 設置視圖引擎
  app.setViewEngine('hbs');
  
  // 設置視圖文件夾
  app.setBaseViewsDir(join(__dirname, '..', 'views'));
  
  // 設置靜態資源文件夾
  app.useStaticAssets(join(__dirname, '..', 'public'));

  await app.listen(3000);
}
```

### 建立 View 文件夾結構

```
views/
├── index.hbs
├── profile.hbs
└── layouts/
    └── main.hbs
```

### 控制器使用 @Render

```typescript
import { Controller, Get, Render, Param } from '@nestjs/common';

@Controller('views')
export class ViewsController {
  @Get('index')
  @Render('index')
  getIndex() {
    return {
      title: 'Welcome',
      message: 'Hello NestJS',
    };
  }

  @Get('profile/:id')
  @Render('profile')
  getProfile(@Param('id') id: string) {
    return {
      id,
      name: 'John Doe',
      email: 'john@example.com',
    };
  }
}
```

### Handlebars 模板範例

```handlebars
<!-- views/index.hbs -->
<!DOCTYPE html>
<html>
  <head>
    <title>{{ title }}</title>
  </head>
  <body>
    <h1>{{ message }}</h1>
    <p>Welcome to NestJS MVC</p>
  </body>
</html>
```

### 帶條件判斷

```handlebars
<!-- views/profile.hbs -->
<h1>Profile</h1>
{{#if name}}
  <p>Name: {{ name }}</p>
{{else}}
  <p>Name not found</p>
{{/if}}

<ul>
  {{#each items}}
    <li>{{ this }}</li>
  {{/each}}
</ul>
```

---

## Fastify 模板設置

### 配置主文件

```typescript
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import fastifyView from '@fastify/view';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  await app.register(fastifyView, {
    engine: {
      handlebars: require('handlebars'),
    },
    templates: join(__dirname, '..', 'views'),
  });

  await app.listen(3000);
}
```

### 控制器（Fastify）

```typescript
@Get('index')
@Render('index')
getIndex() {
  return {
    title: 'Welcome',
    message: 'Hello Fastify',
  };
}
```

---

## 全局視圖變量

```typescript
async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setViewEngine('hbs');
  app.setBaseViewsDir(join(__dirname, '..', 'views'));

  // 設置全局變量
  app.locals = {
    appName: 'My App',
    version: '1.0.0',
  };

  await app.listen(3000);
}
```

### 在模板中使用

```handlebars
<footer>
  <p>{{ appName }} v{{ version }}</p>
</footer>
```

---

## 動態路由和佈局

```typescript
@Get('page/:slug')
@Render('page')
getPage(@Param('slug') slug: string) {
  return {
    slug,
    title: `Page: ${slug}`,
    content: 'Dynamic content here',
  };
}
```

---

## 靜態資源投放

```typescript
app.useStaticAssets({
  root: join(__dirname, '..', 'public'),
  prefix: '/static/',
});
```

### HTML 中引用

```handlebars
<link rel="stylesheet" href="/static/css/style.css">
<script src="/static/js/main.js"></script>
```

---

## 參考資源

- https://docs.nestjs.com/techniques/mvc
- https://handlebarsjs.com
- https://github.com/fastify/point-of-view
