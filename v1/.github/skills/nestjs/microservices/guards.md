# NestJS 微服務守衛（Guards）

微服務授權與認證守衛實現。

---

## 認證守衛

注: 拋出 `RpcException` 而非 `HttpException`。

### 建立認證守衛

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Observable } from 'rxjs';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToRpc().getData();
    
    // 檢查認證信息
    if (!request.token) {
      throw new RpcException('Unauthorized: missing token');
    }

    // 驗證令牌
    if (!this.validateToken(request.token)) {
      throw new RpcException('Unauthorized: invalid token');
    }

    return true;
  }

  private validateToken(token: string): boolean {
    // 模擬令牌驗證
    return token.startsWith('Bearer ');
  }
}
```

### 在消息模式中使用

```typescript
import { MessagePattern, UseGuards } from '@nestjs/common';

@UseGuards(AuthGuard)
@MessagePattern('protected_action')
protectedAction(data: any) {
  return { success: true, data };
}
```

---

## 角色權限守衛

### 自訂角色檢查

```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private requiredRoles: string[]) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToRpc().getData();

    if (!request.user) {
      throw new RpcException('Unauthorized: user not found');
    }

    const hasRole = this.requiredRoles.some((role) =>
      request.user.roles?.includes(role),
    );

    if (!hasRole) {
      throw new RpcException(
        `Forbidden: required roles are ${this.requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
```

### 使用角色守衛

```typescript
@UseGuards(new RolesGuard(['admin']))
@MessagePattern('delete_user')
deleteUser(data: { userId: number }) {
  return { deleted: true };
}

@UseGuards(new RolesGuard(['admin', 'moderator']))
@MessagePattern('ban_user')
banUser(data: { userId: number }) {
  return { banned: true };
}
```

---

## 自訂守衛裝飾器

### 建立 Roles 裝飾器

```typescript
import { SetMetadata } from '@nestjs/common';

export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
```

### 改進角色守衛

```typescript
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      context.getHandler(),
    );

    if (!requiredRoles) {
      return true;  // 無需任何角色
    }

    const request = context.switchToRpc().getData();

    if (!request.user || !request.user.roles) {
      throw new RpcException('Unauthorized: user not found');
    }

    const hasRole = requiredRoles.some((role) =>
      request.user.roles.includes(role),
    );

    if (!hasRole) {
      throw new RpcException(
        `Forbidden: required roles are ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
```

### 在方法上使用

```typescript
@Roles('admin')
@UseGuards(RolesGuard)
@MessagePattern('delete_user')
deleteUser(data: { userId: number }) {
  return { deleted: true };
}

@Roles('admin', 'moderator')
@UseGuards(RolesGuard)
@MessagePattern('ban_user')
banUser(data: { userId: number }) {
  return { banned: true };
}
```

---

## 非同步守衛

```typescript
@Injectable()
export class AsyncAuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToRpc().getData();

    if (!request.token) {
      throw new RpcException('Unauthorized: missing token');
    }

    try {
      // 非同步驗證（如資料庫查詢）
      const user = await this.authService.validateToken(request.token);
      request.user = user;  // 附加用戶信息
      return true;
    } catch (error) {
      throw new RpcException('Unauthorized: invalid token');
    }
  }
}
```

---

## 多個守衛

```typescript
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
@MessagePattern('sensitive_action')
sensitiveAction(data: any) {
  return { success: true };
}

// 或在控制器級別
@Controller()
@UseGuards(AuthGuard, RolesGuard)
export class SensitiveController {
  @Roles('admin')
  @MessagePattern('action_1')
  action1(data: any) {
    return { ok: true };
  }

  @Roles('moderator')
  @MessagePattern('action_2')
  action2(data: any) {
    return { ok: true };
  }
}
```

---

## 完整示例

### 認證服務

```typescript
@Injectable()
export class AuthService {
  validateToken(token: string): Promise<any> {
    // 驗證 JWT 令牌
    try {
      const decoded = jwt.verify(token, 'secret-key');
      return Promise.resolve(decoded);
    } catch {
      return Promise.reject(new Error('Invalid token'));
    }
  }
}
```

### 守衛

```typescript
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToRpc().getData();
    const token = request.headers?.authorization?.split(' ')[1];

    if (!token) {
      throw new RpcException('Unauthorized: missing token');
    }

    try {
      const user = await this.authService.validateToken(token);
      request.user = user;
      return true;
    } catch (error) {
      throw new RpcException('Unauthorized: invalid token');
    }
  }
}
```

### 控制器

```typescript
@Controller()
export class UserController {
  @UseGuards(JwtAuthGuard)
  @Roles('admin')
  @UseGuards(RolesGuard)
  @MessagePattern('delete_user')
  deleteUser(data: { userId: number }) {
    return { deleted: true };
  }
}
```


