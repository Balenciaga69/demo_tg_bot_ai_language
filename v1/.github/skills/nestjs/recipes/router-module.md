# NestJS Router Module

使用 RouterModule 實現模組級路由前綴。

---

## 基本用法

### 簡單模組前綴

```typescript
import { Module } from '@nestjs/common'
import { RouterModule } from '@nestjs/core'
import { DashboardModule } from './dashboard/dashboard.module'

@Module({
  imports: [
    DashboardModule,
    RouterModule.register([
      {
        path: 'dashboard',
        module: DashboardModule,
      },
    ]),
  ],
})
export class AppModule {}
```

所有 DashboardModule 中的控制器將自動加上 `/dashboard` 前綴。

---

## 嵌套模組前綴

### 父子模組結構

```typescript
@Module({
  imports: [
    AdminModule,
    DashboardModule,
    MetricsModule,
    RouterModule.register([
      {
        path: 'admin',
        module: AdminModule,
        children: [
          {
            path: 'dashboard',
            module: DashboardModule,
          },
          {
            path: 'metrics',
            module: MetricsModule,
          },
        ],
      },
    ]),
  ],
})
export class AppModule {}
```

- DashboardModule 控制器路由: `/admin/dashboard`
- MetricsModule 控制器路由: `/admin/metrics`

---

## Controller 示例

### dashboard.controller.ts

```typescript
import { Controller, Get } from '@nestjs/common'

@Controller()
export class DashboardController {
  @Get()
  getDashboard() {
    return { message: 'Dashboard' }
  }

  @Get('stats')
  getStats() {
    return { stats: 'data' }
  }
}
```

- `GET /dashboard` → 返回 Dashboard
- `GET /dashboard/stats` → 返回 stats

---

## 完整示例

### app.module.ts

```typescript
import { Module } from '@nestjs/common'
import { RouterModule } from '@nestjs/core'
import { AdminModule } from './admin/admin.module'
import { UsersModule } from './admin/users/users.module'
import { RolesModule } from './admin/roles/roles.module'

@Module({
  imports: [
    AdminModule,
    UsersModule,
    RolesModule,
    RouterModule.register([
      {
        path: 'api',
        module: AdminModule,
        children: [
          {
            path: 'users',
            module: UsersModule,
          },
          {
            path: 'roles',
            module: RolesModule,
          },
        ],
      },
    ]),
  ],
})
export class AppModule {}
```

路由映射：

- `/api` → AdminModule
- `/api/users` → UsersModule
- `/api/roles` → RolesModule

---

## 注意事項

1. **避免過度使用** - 過度嵌套會導致代碼難以維護
2. **路由清晰** - 確保路由結構清晰易懂
3. **模組獨立** - 每個模組應保持相對獨立
4. **命名規範** - 使用小寫和連字符命名路由

---

## 參考資源

- https://docs.nestjs.com/recipes/router-module
