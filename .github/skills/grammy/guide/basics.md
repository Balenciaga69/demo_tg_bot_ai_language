# 發送和接收訊息（Basics）

## 接收訊息

### 監聽所有訊息

```typescript
bot.on('message', async (ctx) => {
  const message = ctx.message // 訊息對象
  const text = ctx.message.text // 文字內容
})
```

### 特定類型訊息

```typescript
bot.on('message:text', async (ctx) => {
  const txt = ctx.msg.text
})

bot.on('message:photo', async (ctx) => {
  const photos = ctx.msg.photo // Photo[] 陣列
})

bot.on('message:video', async (ctx) => {
  const video = ctx.msg.video
})

bot.on('message:voice', async (ctx) => {
  const voice = ctx.msg.voice
})

bot.on('message:document', async (ctx) => {
  const doc = ctx.msg.document
})

bot.on('message:location', async (ctx) => {
  const location = ctx.msg.location
})

bot.on('message:contact', async (ctx) => {
  const contact = ctx.msg.contact
})
```

### 使用 hears 匹配文本

```typescript
// 完全匹配
bot.hears('hello', async (ctx) => {})

// 正則匹配
bot.hears(/hello/i, async (ctx) => {})

// 提取參數
bot.hears(/echo (.+)/, async (ctx) => {
  const text = ctx.match[1] // 捕獲組
})
```

### 使用 filter queries

```typescript
// 只接收媒體
bot.on(':photo', async (ctx) => {})
bot.on(':video', async (ctx) => {})
bot.on(':file', async (ctx) => {}) // 任何文件

// 組合條件
bot.on([':text', ':photo'], async (ctx) => {})

// 別名
bot.on(':media', async (ctx) => {}) // photo, video, document 等
```

---

## 發送訊息

### 基本發送

```typescript
// 發送到特定 chat id
await bot.api.sendMessage(123456, 'Hello!')

// 帶選項
await bot.api.sendMessage(123456, 'Hello!', {
  parse_mode: 'HTML',
})
```

### Context 快捷方法

```typescript
// reply 自動使用當前 chat id
await ctx.reply('Text')

// 發送帶格式
await ctx.reply('<b>Bold</b> text', {
  parse_mode: 'HTML',
})

await ctx.reply('*Bold* _italic_', {
  parse_mode: 'MarkdownV2',
})
```

### 發送特定媒體

```typescript
// 發送照片
await ctx.replyWithPhoto(fileId)
await ctx.replyWithPhoto('https://example.com/photo.jpg')

// 發送視頻
await ctx.replyWithVideo(fileId)

// 發送文檔
await ctx.replyWithDocument(fileId)

// 發送音聲
await ctx.replyWithAudio(fileId)

// 發送語音
await ctx.replyWithVoice(fileId)
```

### 發送上傳的文件

```typescript
import { InputFile } from "grammy";

// 從文件路徑
await ctx.replyWithPhoto(new InputFile("/path/to/photo.jpg"));

// 從 Buffer
const buffer = Buffer.from([...]);
await ctx.replyWithPhoto(new InputFile(buffer));

// 從 Stream
import { createReadStream } from "fs";
await ctx.replyWithPhoto(new InputFile(createReadStream("path")));
```

---

## 訊息格式化

### HTML 格式

```typescript
await ctx.reply('<b>Bold</b> <i>Italic</i> <u>Underline</u> <s>Strikethrough</s>', { parse_mode: 'HTML' })

// URL
await ctx.reply('<a href="https://example.com">Link</a>', {
  parse_mode: 'HTML',
})

// Emoji
await ctx.reply('Hello 👋 <emoji id="5368324170671202286">👍</emoji>', {
  parse_mode: 'HTML',
})
```

### Markdown V2 格式

```typescript
// 需要轉義特殊字符
await ctx.reply('*Bold* _Italic_ ~Strikethrough~ `Code`', { parse_mode: 'MarkdownV2' })

// 連結
await ctx.reply('[Link](https://example.com)', {
  parse_mode: 'MarkdownV2',
})
```

---

## 回覆到訊息

### 使用 Telegram 回覆功能

```typescript
await ctx.reply('Comment', {
  reply_parameters: {
    message_id: ctx.msg.message_id,
  },
})
```

### 強制回覆

```typescript
await ctx.reply('Reply to this!', {
  reply_markup: {
    force_reply: true,
  },
})
```

---

## 鍵盤

### 內聯鍵盤（Inline Keyboard）

```typescript
await ctx.reply('Choose:', {
  reply_markup: {
    inline_keyboard: [
      [
        { text: 'Button 1', callback_data: 'btn1' },
        { text: 'Button 2', callback_data: 'btn2' },
      ],
      [{ text: 'URL', url: 'https://example.com' }],
    ],
  },
})
```

### 回覆鍵盤（Reply Keyboard）

```typescript
await ctx.reply('Select:', {
  reply_markup: {
    keyboard: [[{ text: 'Option 1' }, { text: 'Option 2' }], [{ text: 'Cancel' }]],
    resize_keyboard: true,
  },
})
```

### 移除鍵盤

```typescript
await ctx.reply('Done', {
  reply_markup: {
    remove_keyboard: true,
  },
})
```

---

## 編輯訊息

### 編輯文本

```typescript
const sent = await ctx.reply('Original')

await ctx.api.editMessageText(ctx.chat.id, sent.message_id, 'Updated')
```

### 編輯鍵盤

```typescript
await ctx.api.editMessageReplyMarkup(ctx.chat.id, ctx.msg.message_id, {
  reply_markup: {
    inline_keyboard: [[{ text: 'New Button', callback_data: 'new' }]],
  },
})
```

---

## 刪除訊息

```typescript
// 刪除當前訊息
await ctx.deleteMessage()

// 刪除特定訊息
await ctx.api.deleteMessage(chatId, messageId)
```

---

## 批量操作

### 訊息推送

```typescript
const chatIds = [123, 456, 789]
for (const chatId of chatIds) {
  await bot.api.sendMessage(chatId, 'Broadcast message')
}
```

### 檢查訊息存在性

```typescript
try {
  await ctx.api.forwardMessage(targetChatId, ctx.chat.id, ctx.msg.message_id)
} catch (error) {
  // 訊息可能已被刪除
}
```
