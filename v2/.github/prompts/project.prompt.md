---
description: 這是一份初步構思的計畫, 僅做為參考
---

# 專案說明

- 這是一個給少人(熟人)使用的 AI 專案, 他有幾個目的:
- 服務我朋友們讓他們不用花錢使用 epop, speak ai, voiceTube 等等 SAAS
- 我電腦有高級的 GTX 5070 16GB 不想讓他白白浪費
- 我不希望太多API真的打到我在用的電腦上

# 使用者怎麼用

- 來自前端(還沒設計好), 可能來自 LINE, 也可能來自網頁, 也可能來自手機 app
- 使用者會傳輸 15 sec 內語音
- 本地 faster-whisper-large-v3 會將聲音轉成文字
- 本地 llm (deepseek-r1-distill-qwen-14b(q6_k)) 修正文法或文字
- azure pronunciation assessment api 會評分發音
- edge tts 會將正確發音的文字轉成語音回傳給使用者
- 使用者可以看評分與反饋 或者單純說英文修正文法 甚至中文語音自動更正成英文而已

# 防止濫用

- 使用 google sso 登入, 有個 DB 會記錄使用者的登入資訊與安全
- 我會手動寫 SQL 我自己親自手動發放點數, 他們本人需要跟我說他們需要多少點數, 我會手動發放給他們
- 每次使用服務會扣點數(真的完成才扣, 失敗不扣)
- 每個帳號一次只能一個任務(不管發音評分或是文字更正)
- 雲 worker 會去檢查我電腦是否有開機或服務有啟動

# 我預想的方式

- cloudflare Worker 處理請求
- cloudflare d1 存儲使用者資訊與點數(DB)
- cloudflare tunnels 連接到我家電腦
- cloudflare r2 存儲使用者的語音檔案和轉錄文本(File Storage)
- cloudflare cache 儲存各種反饋結果
- 本地 nestjs 快速開發整合AI (bullMQ+SSE或LinePush)

> 前端 > cloudflare Worker > cloudflare tunnels
> 本地服務器 (faster-whisper, llm, azure api, edge tts)
> cloudflare r2 (存儲語音檔案和轉錄文本) > cloudflare cache (存儲反饋結果) > 前端

## 別人給的建議 B

- 語音檔案處理：Telegram Webhook 傳給 Worker 的是 file_id。Worker 需要先打一次 Telegram API 換取下載連結，下載二進位檔 (Blob/Buffer) 後，直接透過 Tunnel POST 給你的 NestJS。
- SSO 與 點數管理：這部分放在 Cloudflare Worker 端做最合適。Worker 攔截請求 -> 檢查 D1 中的點數 -> 餘額不足直接回覆 Telegram 訊息 -> 餘額足夠才發送到本地。

## 別人給的建議 A

- Cache 主要針對靜態資源, 每次對話都不一樣, Cache命中率不高
- 發語音 > r2 似乎沒必要, 可以直接傳到本地服務器處理
- Cloudflare Access 前 50 個帳號免費可以考慮(之後7usd但我覺得太貴了)
- Telegram Bot (最強推薦 )機器人 API 對語音檔 (OGG) 的支援非常完美，檔案上限高達 50MB。每個 User 有唯一的 chat_id，你可以直接寫在白名單裡。支援 Inline Buttons（按鈕），朋友可以點選「開始評分」或「單純語音修正」。如果你用 Telegram，其實不需要 R2
- 利用 wrangler.toml 的 environments 設定，可以分開 local (開發用) 和 production (正式用)，這樣你在本地測試發放點數時不會影響到雲端的正式資料。

# 老油條給的想法

```md
1. **使用者** -> 發送語音 -> **Telegram Server**
2. **Telegram Webhook** -> 觸發 **Cloudflare Worker**
3. **Worker** -> 檢查 **D1 (點數)** -> 驗證通過 -> 下載語音二進位位元
4. **Worker** -> 透過 **CF Tunnel** -> 傳送到 **本地 NestJS API**
5. **本地 NestJS** -> 放入 **Redis Queue** -> 立即回傳 `Success` 給 Worker
6. **本地 Worker (5070 待命)** -> 執行 AI 串燒 (Whisper/LLM/Azure/TTS)
7. **本地 NestJS** -> 呼叫 **Telegram API** -> 回傳評分結果與修正語音給使用者
```

# 她自己準備依賴的套件

- faster-whisper (自己包的 docker image)
- edge-tts python 安裝後 跑在自己的 windows 上
- pnpm install bullmq ioredis
- pnpm install microsoft-cognitiveservices-speech-sdk
- pnpm install grammy 用於 telegram bot 開發
- npm install -g wrangler 用於 cloudflare 模擬
