# Context 對象

## Context 結構

```typescript
// Context 包含以下主要屬性
ctx.update // 原始 Update 對象
ctx.message // 訊息對象
ctx.callbackQuery // 按鈕點擊
ctx.inlineQuery // 內聯查詢
ctx.chosenInlineResult
ctx.editedMessage
ctx.channelPost
ctx.editedChannelPost
ctx.businessConnection
ctx.businessMessagesDeleted
ctx.messageReaction
ctx.messageReactionCount
ctx.pollAnswer
ctx.poll
ctx.preChi / outQuery
ctx.shippingQuery
ctx.successfulPayment
ctx.userShared
ctx.chatShared
ctx.connectWebApp
ctx.webAppInfo
```

---

## 快捷屬性（Shortcuts）

| 屬性名                     | 功能                         |
| -------------------------- | ---------------------------- |
| `ctx.msg`                  | 獲取訊息對象（任何訊息類型） |
| `ctx.msgId`                | 取得訊息 ID                  |
| `ctx.chat`                 | 取得聊天對象                 |
| `ctx.chatId`               | 取得聊天 ID                  |
| `ctx.from`                 | 取得發送者信息               |
| `ctx.me`                   | 取得 Bot 自身信息            |
| `ctx.inlineMessageId`      | 取得內聯訊息 ID（若適用）    |
| `ctx.senderChat`           | 取得匿名發送者聊天           |
| `ctx.businessConnectionId` | 商業連接 ID                  |
| `ctx.entities()`           | 取得訊息實體（鏈接、提及等） |
| `ctx.reactions()`          | 解析反應更新                 |

---

## 信息訪問

### 訪問發送者

```typescript
const userId = ctx.from.id
const firstName = ctx.from.first_name
const username = ctx.from.username
const isPremium = ctx.from.is_premium
```

### 訪問聊天信息

```typescript
const chatId = ctx.chat.id
const chatType = ctx.chat.type // 'private', 'group', 'supergroup', 'channel'
const chatTitle = ctx.chat.title

// 檢查聊天類型
if (ctx.chat.type === 'private') {
  // 私聊
}

if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
  // 群組
}

if (ctx.chat.type === 'channel') {
  // 頻道
}
```

### 訪問訊息內容

```typescript
const text = ctx.msg.text
const caption = ctx.msg.caption
const date = ctx.msg.date // Unix timestamp
const messageId = ctx.msg.message_id

// 編輯信息
const editedDate = ctx.editedMessage?.edit_date

// 回覆信息
const repliedTo = ctx.msg.reply_to_message
if (repliedTo) {
  const originalText = repliedTo.text
}
```

---

## Has Checks（狀態檢查）

```typescript
// 檢查是否有特定內容
if (ctx.hasCommand('start')) {
  // 訊息第一個詞是 /start
}

if (ctx.hasCallbackQuery(/data:\d+/)) {
  // 有匹配的回調數據
}

if (ctx.hasText()) {
  // 訊息有文本
}

if (ctx.hasMedia()) {
  // 訊息有媒體（photo, video, document 等）
}

if (ctx.hasInlineQuery()) {
  // 有內聯查詢
}

if (ctx.hasChosenInlineResult()) {
  // 用戶選擇了內聯結果
}

if (ctx.hasShippingQuery()) {
  // 有本地查詢
}

if (ctx.hasPreCheckoutQuery()) {
  // 支付前檢查
}

if (ctx.hasSuccessfulPayment()) {
  // 成功支付
}

if (ctx.hasMessageReaction()) {
  // 訊息反應更新
}

if (ctx.hasMessageReactionCount()) {
  // 反應計數更新
}

// 用於型別守衛
if (ctx.hasCommand('start')) {
  const cmd = ctx.msg.text // TS 知道 text 存在
}
```

---

## 操作方法

### 回覆訊息

```typescript
// 簡單回覆
await ctx.reply('Hello!')

// 帶格式
await ctx.reply('<b>Bold</b>', { parse_mode: 'HTML' })

// 帶鍵盤
await ctx.reply('Choose:', {
  reply_markup: {
    inline_keyboard: [[{ text: 'Button', callback_data: 'btn' }]],
  },
})

// 不通知（靜默回覆）
await ctx.reply('Silent', { disable_notification: true })

// 不預覽連結
await ctx.reply('Check link', { link_preview_options: { is_disabled: true } })

// 保護內容
await ctx.reply('Protected content', { protect_content: true })
```

### 發送其他類型

```typescript
await ctx.replyWithPhoto(fileId)
await ctx.replyWithVideo(fileId)
await ctx.replyWithAudio(fileId)
await ctx.replyWithDocument(fileId)
await ctx.replyWithVoice(fileId)
await ctx.replyWithAnimation(fileId)
await ctx.replyWithLocation(latitude, longitude)
await ctx.replyWithContact(phoneNumber, firstName)
```

### 編輯訊息

```typescript
await ctx.editMessageText('New text')
await ctx.editMessageCaption('New caption')
await ctx.editMessageMedia({
  type: 'photo',
  media: newFileId,
})
await ctx.editMessageReplyMarkup({
  reply_markup: {
    inline_keyboard: [[{ text: 'Updated', callback_data: 'upd' }]],
  },
})
```

### 刪除訊息

```typescript
await ctx.deleteMessage()
await ctx.deleteMessages([messageId1, messageId2])
```

### 反應

```typescript
// 添加反應
await ctx.react('👍')
await ctx.react('❤️')

// 自定義 emoji
await ctx.react({ type: 'emoji', emoji: '🎉' }, { is_big: true })

// 移除反應
await ctx.react('👍', { is_big: false }) // 設為 false 以移除
```

### 轉發

```typescript
await ctx.forwardMessage('targetChatId')
```

### 複製

```typescript
const copied = await ctx.copyMessage('targetChatId')
```

### 回答回調查詢

```typescript
bot.on('callback_query:data', async (ctx) => {
  // 顯示無通知提示
  await ctx.answerCallbackQuery()

  // 顯示通知
  await ctx.answerCallbackQuery({ text: 'Done!', show_alert: false })

  // 顯示警告
  await ctx.answerCallbackQuery({
    text: 'Warning!',
    show_alert: true,
  })
})
```

### 釘選訊息

```typescript
await ctx.pinMessage()
await ctx.unpinMessage()
await ctx.unpinAllMessages()
```

---

## 文件操作

### 獲取文件信息

```typescript
const file = await ctx.getFile()
// 返回：{ file_id, file_unique_id, file_size, file_path }

// file_path 可用於下載
const downloadUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`
```

### 提取文件 ID

```typescript
// 從各種訊息類型提取
const photoFileId = ctx.msg.photo?.at(-1)?.file_id
const videoFileId = ctx.msg.video?.file_id
const documentFileId = ctx.msg.document?.file_id
const voiceFileId = ctx.msg.voice?.file_id
```

---

## 實體解析

### 獲取實體

```typescript
// 獲取所有實體
const entities = ctx.entities()
// 返回 [{ type, offset, length, text }...]

// 過濾特定類型
const urls = ctx.entities('url')
const mentions = ctx.entities('mention')
const emails = ctx.entities('email')
const phone = ctx.entities('phone_number')

// 多個類型
const mentions_and_hashtags = ctx.entities(['mention', 'hashtag'])

// 實體類型列表
// "url", "email", "phone_number", "bold", "italic", "underline",
// "strikethrough", "spoiler", "blockquote", "code", "pre",
// "text_link", "text_mention", "custom_emoji", "mention",
// "hashtag", "cashtag"
```

---

## 型別定義

### 擴展 Context 類型

```typescript
import { Context } from 'grammy'

interface MyBotConfig {
  botName: string
  adminId: number
}

type MyContext = Context & {
  config: MyBotConfig
}

const bot = new Bot<MyContext>('TOKEN')

// 在中間件中設置
bot.use(async (ctx, next) => {
  ctx.config = {
    botName: 'MyBot',
    adminId: 12345,
  }
  await next()
})
```

### 使用 Session Flavor

```typescript
import { SessionFlavor } from 'grammy'

interface SessionData {
  counter: number
  isAdmin: boolean
  userData?: { name: string; age: number }
}

type MyContext = Context & SessionFlavor<SessionData>

// ctx.session 現在可用且有正確的型別
bot.on('message', async (ctx) => {
  ctx.session.counter++
})
```
