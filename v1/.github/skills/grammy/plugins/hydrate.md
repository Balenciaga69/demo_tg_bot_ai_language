# 水合插件（Hydrate）

## 基本使用

### 簡單安裝

```typescript
import { hydrate, HydrateFlavor } from '@grammyjs/hydrate'

type MyContext = HydrateFlavor<Context>

const bot = new Bot<MyContext>('')
bot.use(hydrate())
```

### 高級安裝

```typescript
import { Api, Bot, Context } from 'grammy'
import { hydrateApi, HydrateApiFlavor, hydrateContext, HydrateFlavor } from '@grammyjs/hydrate'

type MyContext = HydrateFlavor<Context>
type MyApi = HydrateApiFlavor<Api>

const bot = new Bot<MyContext, MyApi>('')

bot.use(hydrateContext())
bot.api.config.use(hydrateApi())
```

---

## 水合方法

### 訊息方法

```typescript
const message = await ctx.reply('Hello')

// 編輯訊息
await message.editText('Updated')
await message.editCaption('New caption')
await message.editMedia({
  type: 'photo',
  media: fileId,
})
await message.editReplyMarkup({
  reply_markup: {
    inline_keyboard: [[{ text: 'Button', callback_data: 'btn' }]],
  },
})

// 刪除訊息
await message.delete()

// 釘選
await message.pin()
await message.unpin()

// 轉發
await message.forward(targetChatId)

// 複製
await message.copy(targetChatId)
```

### 使用者方法

```typescript
const user = ctx.from

// 訪問使用者 ID
const id = user.id

// 檢查是否為機器人
if (user.is_bot) {
  // ...
}

// 檢查是否為 Premium
if (user.is_premium) {
  // ...
}
```

### 聊天方法

```typescript
const chat = ctx.chat

// 聊天管理
await chat.leave() // Bot 離開聊天

// 獲取成員情況
const memberCount = chat.is_forum ? 'Forum' : `${chat.member_count} members`

// 設置主題
if (chat.is_topic) {
  // 是論壇聊天
}
```

---

## 被水合的對象

### 訊息和頻道貼文

```typescript
const message = ctx.msg

// 快速操作
await message.delete()
await message.edit('text', 'Updated')
await message.editCaption('New caption')
await message.forward(chatId)

// 反應
await message.react('👍')
```

### 編輯過的訊息

```typescript
if (ctx.editedMessage) {
  const edited = ctx.editedMessage
  await edited.delete()
}
```

### 回調查詢

```typescript
const query = ctx.callbackQuery

// 回應
await query.answer()
await query.answer({ text: 'Done', show_alert: true })

// 編輯原訊息
await query.message.editText('Updated')
```

### 內聯查詢

```typescript
const inline = ctx.inlineQuery

// 訪問查詢文本
const query = inline.query
```

---

## 實際範例

### 快速回覆編輯

```typescript
// 不使用 hydrate
const msg = await ctx.reply('Loading...')
await ctx.api.editMessageText(ctx.chat.id, msg.message_id, 'Done!')

// 使用 hydrate
const msg = await ctx.reply('Loading...')
await msg.editText('Done!') // 簡潔！
```

### 自動刪除訊息

```typescript
const msg = await ctx.reply('Temporary message')

setTimeout(() => {
  msg.delete().catch(() => {
    // 訊息可能已被刪除
  })
}, 5000)
```

### 訊息編輯鏈

```typescript
let msg = await ctx.reply('Step 1')

await new Promise((resolve) => setTimeout(resolve, 1000))
await msg.editText('Step 2')

await new Promise((resolve) => setTimeout(resolve, 1000))
await msg.editText('Step 3')

await new Promise((resolve) => setTimeout(resolve, 1000))
await msg.editText('Complete!')
```

### 互動式按鈕

```typescript
const msg = await ctx.reply('Choose:', {
  reply_markup: {
    inline_keyboard: [[{ text: 'Click me', callback_data: 'btn' }]],
  },
})

bot.on('callback_query:data', async (ctx) => {
  // 更新訊息
  await ctx.callbackQuery.message.editText('You clicked!')

  // 回應查詢
  await ctx.answerCallbackQuery({ text: 'Done', show_alert: false })
})
```

---

## 效能考慮

### 減少 API 調用

```typescript
// 優化：使用單一方法
const msg = await ctx.reply('Initial')
await msg.editText('Updated text')

// 而不是
const msg = await ctx.reply('Initial')
await ctx.api.editMessageText(ctx.chat.id, msg.message_id, 'Updated')
```

### 批量操作

```typescript
const messages = await Promise.all([ctx.reply('Message 1'), ctx.reply('Message 2'), ctx.reply('Message 3')])

// 稍後編輯
await Promise.all(messages.map((msg, i) => msg.editText(`Updated ${i + 1}`)))
```

### 錯誤恢復

```typescript
async function safeEdit(message: any, text: string): Promise<boolean> {
  try {
    await message.editText(text)
    return true
  } catch (error) {
    if (error instanceof GrammyError && error.status === 400) {
      // 訊息不存在或無法編輯
      return false
    }
    throw error
  }
}
```

---

## 與其他插件結合

### 與菜單插件結合

```typescript
import { Menu } from '@grammyjs/menu'
import { hydrate, HydrateFlavor } from '@grammyjs/hydrate'

type MyContext = HydrateFlavor<Context>

const bot = new Bot<MyContext>('')
bot.use(hydrate())

const menu = new Menu('interactive').text('Edit', async (ctx) => {
  // 使用水合的方法編輯
  await ctx.callbackQuery.message.editText('Updated by menu')
})

bot.use(menu)
```

### 與對話插件結合

```typescript
import { hydrate, HydrateFlavor } from '@grammyjs/hydrate'
import { ConversationFlavor } from '@grammyjs/conversations'

type MyContext = HydrateFlavor<ConversationFlavor<Context>>

const bot = new Bot<MyContext>('')
bot.use(hydrate())

async function convo(conversation: Conversation, ctx: MyContext) {
  const msg = await ctx.reply('Processing...')

  // 在對話中使用水合方法
  await msg.editText('Done!')
}
```
