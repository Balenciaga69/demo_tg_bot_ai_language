---
description: 這是一份初步分解的計畫
---

# 為何要拆解

- 不管 cloudflare, telegram 都是我們不熟悉的東西, 所以要測試各種功能可行性
- 但我熟悉 nestJs

# Telegram Bot 初步

## 任務需求

- 手機可以選指令 ping, 回應語言(en-us,zh-tw), 返回 pong or 砰
- 手機可以發送語音, bot 會發送正在處理..., 並存在本地入庫, delay 3sec 回傳一個默認語音
