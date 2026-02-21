# grammY 最小限度可行代碼參考

grammY 核心元件 CheatSheet。

---

## 基本 Bot 初始化

```typescript
import { Bot } from 'grammy'

// 創建 bot 實例
const bot = new Bot('YOUR_BOT_TOKEN')

// 啟動 bot
bot.start()
```

---

## 基本事件監聽

### 監聽訊息

```typescript
// 監聽所有訊息
bot.on('message', async (ctx) => {
  // ctx.message - 訊息對象
  // ctx.msg - 快捷方式，同上
})

// 監聽特定類型訊息
bot.on('message:text', async (ctx) => {
  const text = ctx.msg.text
})

bot.on('message:photo', async (ctx) => {
  const photo = ctx.msg.photo
})

bot.on('message:voice', async (ctx) => {
  const voice = ctx.msg.voice
})
```

### 監聽回調查詢（Callback Query）

```typescript
bot.on('callback_query:data', async (ctx) => {
  const data = ctx.callbackQuery.data
  await ctx.answerCallbackQuery()
})
```

### 監聽反應（Reactions）

```typescript
bot.reaction('👍', async (ctx) => {
  // 用戶添加反應
})

bot.on('message_reaction', async (ctx) => {
  const { old_reaction, new_reaction } = ctx.messageReaction
})
```

---

## Context 對象 (ctx)

### 主要屬性

| 屬性          | 用途               |
| ------------- | ------------------ |
| `ctx.msg`     | 當前訊息對象       |
| `ctx.message` | 訊息對象（同 msg） |
| `ctx.chat`    | 聊天對象           |
| `ctx.from`    | 發送者信息         |
| `ctx.me`      | Bot 自身信息       |
| `ctx.update`  | 原始更新對象       |

### 快捷方法

| 方法                    | 用途         |
| ----------------------- | ------------ |
| `ctx.reply()`           | 回覆訊息     |
| `ctx.replyWithPhoto()`  | 回覆照片     |
| `ctx.replyWithVideo()`  | 回覆視頻     |
| `ctx.editMessageText()` | 編輯訊息文本 |
| `ctx.deleteMessage()`   | 刪除訊息     |
| `ctx.react()`           | 添加反應     |
| `ctx.getFile()`         | 獲取文件信息 |

### Context 過濾檢查

```typescript
// Has checks - 檢查是否包含
if (ctx.hasCommand('start')) {
  // 訊息包含 /start 命令
}

if (ctx.hasCallbackQuery(/pattern/)) {
  // 包含匹配的回調查詢
}

if (ctx.hasText()) {
  // 訊息有文本
}
```

---

## 發送訊息

### 基本回覆

```typescript
await ctx.reply('Hello!')

// 帶選項
await ctx.reply('Hello!', {
  parse_mode: 'HTML',
  reply_markup: { inline_keyboard: [[{ text: 'Button', callback_data: 'btn' }]] },
})
```

### 通過 API 發送

```typescript
// 發送文本
await bot.api.sendMessage(chatId, 'Text')

// 發送照片
await bot.api.sendPhoto(chatId, photoFileId)

// 發送視頻
await bot.api.sendVideo(chatId, videoFileId)

// 設置反應
await ctx.api.setMessageReaction(chatId, messageId, [{ type: 'emoji', emoji: '👍' }])
```

---

## 命令處理

### 基本命令

```typescript
bot.command('start', async (ctx) => {
  await ctx.reply('Welcome!')
})

bot.command('help', async (ctx) => {
  await ctx.reply('Help text')
})

// 多個命令
bot.command(['a', 'b', 'c'], async (ctx) => {
  const cmd = ctx.msg.text
})
```

### 帶參數的命令

```typescript
bot.command('add', async (ctx) => {
  const args = ctx.match // 命令後的文本
  const parts = args?.split(' ') || []
})
```

---

## 中間件（Middleware）

### 中間件結構

```typescript
// 標準中間件
bot.use(async (ctx, next) => {
  // 前置處理
  console.log('Before')

  // 傳遞給下一個中間件
  await next()

  // 後置處理
  console.log('After')
})

// 不傳遞下游
bot.use((ctx) => {
  // 處理後不調用 next，更新不會傳遞下去
})
```

### Context 自定義

```typescript
// 給 context 添加自定義屬性
bot.use(async (ctx, next) => {
  ctx.config = {
    botName: 'MyBot',
    isDev: true,
  }
  await next()
})

// 使用
bot.command('info', async (ctx) => {
  if (ctx.config.isDev) {
    // 開發模式
  }
})
```

---

## 錯誤處理

### 全局錯誤處理

```typescript
bot.catch((err) => {
  const ctx = err.ctx
  const error = err.error

  if (error instanceof GrammyError) {
    console.error('API Error:', error.description)
  } else if (error instanceof HttpError) {
    console.error('Network Error:', error)
  } else {
    console.error('Unknown Error:', error)
  }
})
```

### 錯誤邊界

```typescript
const composer = new Composer()

composer
  .errorBoundary((err, next) => {
    console.error('Error in composer:', err)
    // 可選：調用 next 繼續執行
    // await next();
  })
  .use(middleware)

bot.use(composer)
```

---

## 文件處理

### 接收文件

```typescript
bot.on('message:photo', async (ctx) => {
  const photo = ctx.msg.photo
  const fileId = photo[photo.length - 1].file_id

  // 獲取文件信息
  const file = await ctx.getFile()
  const filePath = file.file_path
})

bot.on('message:document', async (ctx) => {
  const doc = ctx.msg.document
  const file = await ctx.getFile()
})
```

### 發送文件

```typescript
// 通過 file_id
await ctx.replyWithPhoto(fileId)

// 通過 URL
await ctx.replyWithPhoto('https://example.com/photo.jpg')

// 上傳本地文件
import { InputFile } from 'grammy'
await ctx.replyWithPhoto(new InputFile('/path/to/file.jpg'))
```

---

## 常用過濾器（Filter Queries）

```typescript
// 文本訊息
bot.on(':text', async (ctx) => {})

// 照片
bot.on(':photo', async (ctx) => {})

// 視頻
bot.on(':video', async (ctx) => {})

// 語音
bot.on(':voice', async (ctx) => {})

// 文件
bot.on(':document', async (ctx) => {})

// 多個條件
bot.on([':text', ':photo'], async (ctx) => {})

// 使用正則匹配
bot.hears(/hello/i, async (ctx) => {})
```

---

## 類型定義

### 自定義 Context Type

```typescript
import { Context } from 'grammy'

interface MyConfig {
  botName: string
  adminId: number
}

// 擴展 Context
type MyContext = Context & {
  config: MyConfig
}

// 使用
const bot = new Bot<MyContext>('TOKEN')
```

### Session 類型

```typescript
import { SessionFlavor } from 'grammy'

interface SessionData {
  counter: number
  name?: string
}

type MyContext = Context & SessionFlavor<SessionData>
```

---

## 觀念速記

| 概念              | 說明                                   |
| ----------------- | -------------------------------------- |
| **ctx**           | Context 對象，包含訊息和操作方法       |
| **Middleware**    | 處理管道，`next()` 傳遞給下一層        |
| **bot.use()**     | 安裝中間件                             |
| **bot.on()**      | 監聽特定事件類型                       |
| **bot.command()** | 監聽命令（/start 等）                  |
| **bot.hears()**   | 根據文本內容匹配                       |
| **GrammyError**   | API 請求失敗（bot api 返回 ok: false） |
| **HttpError**     | 網絡错誤（無法連接 Telegram）          |
| **ctx.match**     | 命令參數或 hears 匹配結果              |
