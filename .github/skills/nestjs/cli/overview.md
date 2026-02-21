# NestJS CLI 概覽

NestJS CLI 命令行工具，用於初始化、開發和維護 NestJS 應用程式。

---

## 安裝

```bash
# 全域安裝
npm install -g @nestjs/cli

# 或不安裝直接使用
npx @nestjs/cli@latest
```

---

## 基本工作流程

```bash
# 建立新專案
nest new my-nest-project

# 進入目錄並啟動開發模式
cd my-nest-project
npm run start:dev
```

---

## 命令語法

```bash
nest commandOrAlias requiredArg [optionalArg] [options]

# 範例
nest new my-nest-project --dry-run
nest n my-nest-project -d  # 等同上面（使用別名）

# 查看所有指令說明
nest --help
nest generate --help
```

---

## 命令總覽

| 命令       | 別名 | 說明                                   |
| ---------- | ---- | -------------------------------------- |
| `new`      | `n`  | 建立新的標準模式應用程式               |
| `generate` | `g`  | 根據 schematic 生成/修改文件           |
| `build`    | -    | 編譯應用程式到輸出目錄                 |
| `start`    | -    | 編譯並執行應用程式                     |
| `add`      | -    | 匯入 nest library 並執行安裝 schematic |
| `info`     | `i`  | 顯示已安裝 nest 套件及系統資訊         |

---

## 專案結構模式

| 特性         | 標準模式        | Monorepo 模式 |
| ------------ | --------------- | ------------- |
| 多專案       | 獨立目錄結構    | 單一目錄結構  |
| node_modules | 各自獨立        | 共享          |
| 預設編譯器   | tsc             | webpack       |
| Libraries    | 手動管理（npm） | 內建支援      |

---

## 需求

```bash
# 確認 Node.js 有國際化支援（必要）
node -p process.versions.icu
# 若印出 undefined 則不支援
```

---

## 相關文檔

- [NestJS CLI 文檔](https://docs.nestjs.com/cli/overview)
