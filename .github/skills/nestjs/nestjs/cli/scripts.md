# NestJS CLI 與 Scripts

說明 `nest` 命令如何與編譯器和 package.json scripts 協作。

---

## 推薦的 package.json Scripts

```json
{
  "scripts": {
    "build": "nest build",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main"
  }
}
```

---

## nest 子命令對應說明

| 子命令          | 說明                                                      |
| --------------- | --------------------------------------------------------- |
| `nest build`    | 包裝 `tsc` / `swc` / `webpack`，自動處理 `tsconfig-paths` |
| `nest start`    | 確保已建置後，以 `node` 執行編譯後的應用                  |
| `nest generate` | 生成新元件，不屬於 build/execute pipeline                 |

---

## Build 說明

`nest build` 是 `tsc`（標準模式）或 `webpack + ts-loader`（monorepo）的包裝：

```bash
# 等同執行 tsc + tsconfig-paths 處理
nest build

# 使用 SWC（速度提升 10x）
nest build --builder swc

# 使用 webpack
nest build --builder webpack
```

> **提示**：推薦使用 SWC builder 以獲得最快的建置速度。

---

## 執行說明

`nest start` 先建置，再用 `node` 執行：

```bash
# 開發模式（監控檔案變更）
nest start --watch

# Debug 模式
nest start --debug --watch

# 指定執行 binary
nest start --exec node
```

---

## 安裝（本地 + 全域）

```bash
# 全域安裝（確保最新版）
npm install -g @nestjs/cli

# 在專案本地安裝（推薦，確保版本一致）
npm install -D @nestjs/cli
```

---

## 為何使用 package scripts 而非直接呼叫 nest

使用 `npm run build` 而非 `nest build` 的優點：

1. **版本一致** — 所有開發者使用相同版本的 CLI
2. **依賴管理** — CLI 作為 dev dependency 管理
3. **可移植** — 不依賴全域安裝

---

## 向後相容與遷移

舊版 scripts 仍可運作，但建議遷移至新命令：

```json
// 舊方式（tsc-watch / ts-node）
"start:dev": "tsc-watch --onSuccess \"node dist/main.js\""

// 新方式（推薦）
"start:dev": "nest start --watch"
"start:debug": "nest start --debug --watch"
```

---

## 相關文檔

- [NestJS Scripts 文檔](https://docs.nestjs.com/cli/scripts)
