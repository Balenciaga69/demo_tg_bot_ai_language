# NestJS CLI Libraries

Monorepo 中的可重用庫，用於在多個應用間共享模組、服務、控制器等元件。

> **注意**：Library 支援僅適用於 Monorepo 模式。

---

## 建立 Library

```bash
# 建立 library（需在 monorepo 中執行）
nest g library my-library

# 提示輸入前綴（別名），預設為 @app
# What prefix would you like to use for the library (default: @app)?
```

生成的目錄結構：

```
libs/
  my-library/
    src/
      index.ts
      my-library.module.ts
      my-library.service.ts
    tsconfig.lib.json
```

---

## nest-cli.json Library 設定

```json
{
  "projects": {
    "my-library": {
      "type": "library", // 注意：library 而非 application
      "root": "libs/my-library",
      "entryFile": "index", // 注意：index 而非 main
      "sourceRoot": "libs/my-library/src",
      "compilerOptions": {
        "tsConfigPath": "libs/my-library/tsconfig.lib.json"
      }
    }
  }
}
```

---

## 在應用中使用 Library

```typescript
// apps/my-project/src/app.module.ts
import { Module } from '@nestjs/common'
import { MyLibraryModule } from '@app/my-library' // 使用前綴路徑

@Module({
  imports: [MyLibraryModule],
})
export class AppModule {}
```

---

## tsconfig.json 路徑映射（自動生成）

```json
{
  "paths": {
    "@app/my-library": ["libs/my-library/src"],
    "@app/my-library/*": ["libs/my-library/src/*"]
  }
}
```

---

## 編譯 Library

```bash
# 單獨編譯
nest build my-library

# 在應用中使用時，nest build 會自動處理依賴
nest build my-project
```

---

## Library vs Application

| 特性       | Application         | Library             |
| ---------- | ------------------- | ------------------- |
| 可獨立執行 | ✅                  | ❌                  |
| 含 main.ts | ✅                  | ❌                  |
| entryFile  | `main`              | `index`             |
| type       | `application`       | `library`           |
| tsconfig   | `tsconfig.app.json` | `tsconfig.lib.json` |

---

## 相關文檔

- [NestJS Libraries 文檔](https://docs.nestjs.com/cli/libraries)
