# NestJS CLI Workspaces（Monorepo）

NestJS 支援兩種專案組織模式：標準模式與 Monorepo 模式。

---

## 標準模式 → Monorepo 模式

```bash
# 建立標準專案
nest new my-project

# 轉換為 monorepo（新增 app 後自動轉換）
cd my-project
nest generate app my-app
```

轉換後目錄結構：

```
apps/
  my-app/
    src/
    tsconfig.app.json
  my-project/        ← 原專案（成為預設專案）
    src/
    tsconfig.app.json
nest-cli.json
package.json
tsconfig.json
```

---

## 專案類型

| 類型        | 說明                                           |
| ----------- | ---------------------------------------------- |
| application | 完整 NestJS 應用，含 `main.ts`，可獨立執行     |
| library     | 可重用模組包，無 `main.ts`，需匯入應用才能執行 |

---

## 啟動指定專案

```bash
# 啟動預設專案（nest-cli.json 中 "root" 指定的）
nest start

# 啟動特定專案
nest start my-app
```

---

## nest-cli.json 結構

```json
{
  "collection": "@nestjs/schematics",
  "sourceRoot": "apps/my-project/src",
  "monorepo": true,
  "root": "apps/my-project",
  "compilerOptions": {
    "webpack": true,
    "tsConfigPath": "apps/my-project/tsconfig.app.json"
  },
  "projects": {
    "my-project": {
      "type": "application",
      "root": "apps/my-project",
      "entryFile": "main",
      "sourceRoot": "apps/my-project/src",
      "compilerOptions": {
        "tsConfigPath": "apps/my-project/tsconfig.app.json"
      }
    },
    "my-app": {
      "type": "application",
      "root": "apps/my-app",
      "entryFile": "main",
      "sourceRoot": "apps/my-app/src",
      "compilerOptions": {
        "tsConfigPath": "apps/my-app/tsconfig.app.json"
      }
    }
  }
}
```

---

## 全域編譯器選項（compilerOptions）

| 屬性                | 類型          | 說明                                   |
| ------------------- | ------------- | -------------------------------------- |
| `webpack`           | boolean       | 使用 webpack（已棄用，改用 `builder`） |
| `builder`           | string/object | 指定編譯器：`tsc`、`swc`、`webpack`    |
| `tsConfigPath`      | string        | tsconfig.json 路徑（monorepo 用）      |
| `webpackConfigPath` | string        | webpack 設定檔路徑                     |
| `deleteOutDir`      | boolean       | 編譯前刪除輸出目錄                     |
| `assets`            | array         | 非 TS 靜態資源分發設定                 |
| `watchAssets`       | boolean       | 監控非 TS 資源                         |
| `manualRestart`     | boolean       | 啟用 `rs` 手動重啟伺服器               |
| `typeCheck`         | boolean       | SWC 模式下啟用型別檢查                 |

---

## 全域產生選項（generateOptions）

```json
{
  "generateOptions": {
    "spec": false, // 停用所有 spec 文件生成
    "flat": true // 使用扁平結構（不建子目錄）
  }
}
```

```json
{
  "generateOptions": {
    "spec": {
      "service": false, // 只停用 service 的 spec
      "s": false // 別名也要設定
    }
  }
}
```

---

## 靜態資源（Assets）設定

```json
{
  "compilerOptions": {
    "assets": ["**/*.graphql"],
    "watchAssets": true
  }
}
```

```json
{
  "assets": [
    {
      "include": "**/*.graphql",
      "exclude": "**/omitted.graphql",
      "watchAssets": true
    }
  ]
}
```

---

## 相關文檔

- [NestJS Workspaces 文檔](https://docs.nestjs.com/cli/monorepo)
