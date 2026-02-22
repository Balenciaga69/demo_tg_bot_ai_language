# Docker Compose 部署指南

## 📋 概述

本項目將 Docker Compose 分成三個文件，方便對應的部署和管理：

| 文件名                              | 用途                                   | 運行環境 | 依賴項                   |
| ----------------------------------- | -------------------------------------- | -------- | ------------------------ |
| `docker-compose.infrastructure.yml` | Postgres、Redis 基礎服務               | 主機     | 無                       |
| `docker-compose.ai-tools.yml`       | AI 工具 (Whisper、Ollama)              | WSL      | GPU (CUDA)               |
| `docker-compose.app.yml`            | 應用微服務 (Telegram Bot、STT Service) | 主機     | infrastructure、ai-tools |

---

## 🚀 完整啟動流程

### 第 1 步：啟動基礎服務（Postgres + Redis）

在主機上執行：

```powershell
# 啟動基礎服務
docker-compose -f docker-compose.infrastructure.yml up -d

# 驗證服務狀態
docker-compose -f docker-compose.infrastructure.yml ps
```

**預期結果：**

- `xx-nest-postgres` - 運行中 (埠 5432)
- `xx-nest-redis` - 運行中 (埠 6666)

### 第 2 步：啟動 AI 工具（在 WSL 執行）

在 WSL 終端執行：

```powershell
# 切換到項目目錄
cd /mnt/g/Coding/demo_tg_bot_ai_language/v2

# 啟動 AI 工具
docker-compose -f docker-compose.ai-tools.yml up -d

# 驗證服務狀態
docker-compose -f docker-compose.ai-tools.yml ps
```

**預期結果：**

- `xx-nest-whisper` - 運行中 (埠 8000)
- `xx-nest-ollama` - 運行中 (埠 11434)
- `xx-nest-ollama-setup` - 已完成或運行中
- `xx-nest-webui` - 運行中 (埠 3000)

**訪問：**

- Open WebUI: `http://localhost:3000`
- Ollama API: `http://localhost:11434`
- Whisper API: `http://localhost:8000`

### 第 3 步：啟動應用微服務

在主機上執行：

```powershell
# 構建並啟動應用
docker-compose -f docker-compose.app.yml up -d

# 驗證服務狀態
docker-compose -f docker-compose.app.yml ps
```

**預期結果：**

- `xx-nest-telegram-bot` - 運行中 (埠 3399)
- `xx-nest-stt-service` - 運行中

---

## 📖 分類說明

### 1️⃣ 基礎服務（Infrastructure）

**文件：** `docker-compose.infrastructure.yml`

**包含服務：**

- **Postgres** - 數據庫 (埠 5432)
- **Redis** - 緩存與消息隊列 (埠 6666)

**啟動語法：**

```powershell
# 完整啟動
docker-compose -f docker-compose.infrastructure.yml up -d

# 單獨啟動 Postgres
docker-compose -f docker-compose.infrastructure.yml up -d postgres

# 單獨啟動 Redis
docker-compose -f docker-compose.infrastructure.yml up -d redis

# 停止所有服務
docker-compose -f docker-compose.infrastructure.yml down

# 停止並刪除數據
docker-compose -f docker-compose.infrastructure.yml down -v

# 查看日誌
docker-compose -f docker-compose.infrastructure.yml logs -f
```

---

### 2️⃣ AI 工具（AI Tools - 部署於 WSL）

**文件：** `docker-compose.ai-tools.yml`

**包含服務：**

- **Whisper API** - 語音轉文字 (埠 8000)
- **Ollama** - 大語言模型本地推理 (埠 11434)
- **Ollama Pull Model** - 自動下載模型的輔助容器
- **Open WebUI** - Ollama 圖形介面 (埠 3000)

**啟動語法（在 WSL 中執行）：**

```powershell
# 完整啟動
docker-compose -f docker-compose.ai-tools.yml up -d

# 單獨啟動 Ollama
docker-compose -f docker-compose.ai-tools.yml up -d ollama

# 單獨啟動 Whisper API
docker-compose -f docker-compose.ai-tools.yml up -d whisper-api

# 單獨啟動 Open WebUI
docker-compose -f docker-compose.ai-tools.yml up -d open-webui

# 停止所有服務
docker-compose -f docker-compose.ai-tools.yml down

# 停止並刪除數據
docker-compose -f docker-compose.ai-tools.yml down -v

# 查看日誌
docker-compose -f docker-compose.ai-tools.yml logs -f

# 查看特定服務日誌
docker-compose -f docker-compose.ai-tools.yml logs -f ollama
docker-compose -f docker-compose.ai-tools.yml logs -f whisper-api
```

**⚠️ 注意事項：**

- 需要 GPU 支持 (CUDA)
- 若無 GPU，將 `whisper-api` 鏡像改為：`fedirz/faster-whisper-server:latest-cpu`
- Ollama 模型下載比較耗時，請耐心等待

---

### 3️⃣ 應用微服務（Application）

**文件：** `docker-compose.app.yml`

**包含服務：**

- **Telegram Bot** - Telegram 機器人 (埠 3399)
- **STT Service** - 語音轉文字服務

**啟動語法：**

```powershell
# 完整啟動
docker-compose -f docker-compose.app.yml up -d

# 單獨啟動 Telegram Bot
docker-compose -f docker-compose.app.yml up -d telegram-bot

# 單獨啟動 STT Service
docker-compose -f docker-compose.app.yml up -d stt-service

# 停止所有服務
docker-compose -f docker-compose.app.yml down

# 查看日誌
docker-compose -f docker-compose.app.yml logs -f

# 查看特定服務日誌
docker-compose -f docker-compose.app.yml logs -f telegram-bot
docker-compose -f docker-compose.app.yml logs -f stt-service
```

---

## 🔄 完整工作流

### 全部啟動

```powershell
# 主機上 - 第 1 步
docker-compose -f docker-compose.infrastructure.yml up -d

# WSL 上 - 第 2 步
cd /mnt/g/Coding/demo_tg_bot_ai_language/v2
docker-compose -f docker-compose.ai-tools.yml up -d

# 主機上 - 第 3 步
docker-compose -f docker-compose.app.yml up -d
```

### 全部停止

```powershell
# 主機上
docker-compose -f docker-compose.app.yml down
docker-compose -f docker-compose.infrastructure.yml down

# WSL 上
docker-compose -f docker-compose.ai-tools.yml down
```

### 驗證所有服務

```powershell
# 主機上
docker-compose -f docker-compose.infrastructure.yml ps
docker-compose -f docker-compose.app.yml ps

# WSL 上
docker-compose -f docker-compose.ai-tools.yml ps
```

---

## 🐛 故障排除

### Whisper API 連接失敗

```powershell
# WSL 驗證 Whisper 是否運行
docker-compose -f docker-compose.ai-tools.yml ps whisper-api

# 查看日誌
docker-compose -f docker-compose.ai-tools.yml logs whisper-api

# 測試連接 (在 WSL 中)
curl http://localhost:8000/health
```

### Ollama 模型下載卡住

```powershell
# 查看 ollama-pull-model 日誌
docker-compose -f docker-compose.ai-tools.yml logs ollama-pull-model

# 手動下載模型 (進入 ollama 容器)
docker exec xx-nest-ollama ollama pull thirdeyeai/DeepSeek-R1-Distill-Qwen-7B-uncensored:Q4_0
```

### 重新啟動所有服務

```powershell
# 完全重置
docker-compose -f docker-compose.infrastructure.yml down -v
docker-compose -f docker-compose.app.yml down

# WSL 上
docker-compose -f docker-compose.ai-tools.yml down -v

# 重新啟動
# ... 按照上方完整啟動流程執行
```

---

## 📊 服務檢查清單

啟動完成後，逐項檢查：

- [ ] Postgres 運行中 (埠 5432)
- [ ] Redis 運行中 (埠 6666)
- [ ] Whisper API 運行中 (埠 8000)
- [ ] Ollama 運行中 (埠 11434)
- [ ] Open WebUI 運行中 (埠 3000)
- [ ] Telegram Bot 運行中 (埠 3399)
- [ ] STT Service 運行中
