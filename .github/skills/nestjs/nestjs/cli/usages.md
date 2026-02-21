# NestJS CLI 命令使用參考

所有 `nest` CLI 命令的完整參數與選項說明。

---

## nest new

建立新的標準模式應用程式。

```bash
$ nest new <name> [options]
$ nest n <name> [options]
```

| 選項                | 別名 | 說明                                  |
| ------------------- | ---- | ------------------------------------- |
| `--dry-run`         | `-d` | 模擬執行，不實際變更檔案              |
| `--skip-git`        | `-g` | 跳過 git 初始化                       |
| `--skip-install`    | `-s` | 跳過套件安裝                          |
| `--package-manager` | `-p` | 指定套件管理器：`npm`、`yarn`、`pnpm` |
| `--language`        | `-l` | 指定語言：`TS` 或 `JS`                |
| `--collection`      | `-c` | 指定 schematics collection            |
| `--strict`          | -    | 啟用嚴格 TypeScript 模式              |

---

## nest generate

根據 schematic 生成或修改文件。

```bash
$ nest generate <schematic> <name> [options]
$ nest g <schematic> <name> [options]
```

### Schematics 清單

| Schematic     | 別名  | 說明                            |
| ------------- | ----- | ------------------------------- |
| `app`         | -     | 在 monorepo 中新增應用          |
| `library`     | `lib` | 在 monorepo 中新增 library      |
| `class`       | `cl`  | 生成 class                      |
| `controller`  | `co`  | 生成 controller                 |
| `decorator`   | `d`   | 生成自訂 decorator              |
| `filter`      | `f`   | 生成 filter                     |
| `gateway`     | `ga`  | 生成 gateway                    |
| `guard`       | `gu`  | 生成 guard                      |
| `interface`   | `itf` | 生成 interface                  |
| `interceptor` | `itc` | 生成 interceptor                |
| `middleware`  | `mi`  | 生成 middleware                 |
| `module`      | `mo`  | 生成 module                     |
| `pipe`        | `pi`  | 生成 pipe                       |
| `provider`    | `pr`  | 生成 provider                   |
| `resolver`    | `r`   | 生成 resolver                   |
| `resource`    | `res` | 生成完整 CRUD resource（僅 TS） |
| `service`     | `s`   | 生成 service                    |

### 選項

| 選項           | 別名 | 說明                       |
| -------------- | ---- | -------------------------- |
| `--dry-run`    | `-d` | 模擬執行                   |
| `--project`    | `-p` | 指定目標專案（monorepo）   |
| `--flat`       | -    | 不建立子目錄               |
| `--collection` | `-c` | 指定 schematics collection |
| `--spec`       | -    | 強制生成 spec 文件         |
| `--no-spec`    | -    | 停用 spec 文件生成         |

---

## nest build

編譯應用程式或 workspace 到輸出目錄。

```bash
$ nest build [name] [options]
```

| 選項            | 別名 | 說明                                |
| --------------- | ---- | ----------------------------------- |
| `--path`        | `-p` | tsconfig 文件路徑                   |
| `--config`      | `-c` | nest-cli.json 路徑                  |
| `--watch`       | `-w` | 監控模式（即時重新編譯）            |
| `--builder`     | `-b` | 指定編譯器：`tsc`、`swc`、`webpack` |
| `--watchAssets` | -    | 同時監控非 TS 資源                  |
| `--type-check`  | -    | 啟用型別檢查（SWC 模式）            |
| `--all`         | -    | 編譯 monorepo 中所有專案            |
| `--tsc`         | -    | 強制使用 tsc                        |
| `--webpackPath` | -    | webpack 設定檔路徑                  |

---

## nest start

編譯並執行應用程式。

```bash
$ nest start [name] [options]
```

| 選項                  | 別名 | 說明                                |
| --------------------- | ---- | ----------------------------------- |
| `--watch`             | `-w` | 監控模式（即時重載）                |
| `--debug [host:port]` | `-d` | Debug 模式（`--inspect` flag）      |
| `--builder`           | `-b` | 指定編譯器：`tsc`、`swc`、`webpack` |
| `--exec`              | `-e` | 執行的 binary（預設：`node`）       |
| `--env-file`          | -    | 從文件載入環境變數                  |
| `--tsc`               | -    | 強制使用 tsc                        |
| `--no-shell`          | -    | 不在 shell 中產生子程序             |

---

## nest add

匯入並安裝 nest library。

```bash
$ nest add <name> [options]
```

---

## nest info

顯示已安裝 nest 套件與系統資訊。

```bash
$ nest info
$ nest i
```

---

## 相關文檔

- [NestJS CLI Usage 文檔](https://docs.nestjs.com/cli/usages)
