# 命令（Commands）

## 基本命令處理

### 單個命令

```typescript
bot.command('start', async (ctx) => {
  await ctx.reply('Welcome!')
})

bot.command('help', async (ctx) => {
  await ctx.reply('Help text')
})

bot.command('settings', async (ctx) => {
  await ctx.reply('Settings')
})
```

### 多個命令同時監聽

```typescript
bot.command(['start', 'begin', 'init'], async (ctx) => {
  await ctx.reply('Starting...')
})
```

---

## 命令參數

### 提取命令參數

```typescript
bot.command('add', async (ctx) => {
  // ctx.match 包含命令之後的文本
  const item = ctx.match // "/add apple" -> "apple"

  if (!item) {
    await ctx.reply('Please specify an item')
    return
  }

  await ctx.reply(`Added: ${item}`)
})

// 帶多個參數
bot.command('set', async (ctx) => {
  const args = (ctx.match || '').split(' ')
  const [key, ...value] = args

  if (!key) {
    await ctx.reply('Usage: /set key value')
    return
  }
})
```

### 解析複雜參數

```typescript
bot.command('calc', async (ctx) => {
  // "/calc 5 + 3"
  const expression = ctx.match

  try {
    // 注意：eval 只用於演示，實際應該用正規表達式或解析器
    const result = eval(expression)
    await ctx.reply(`Result: ${result}`)
  } catch (error) {
    await ctx.reply('Invalid expression')
  }
})
```

---

## 指向特定 Bot 的命令

### 針對性命令

```typescript
// 只響應 /start@mybot，不響應 /start@otherbot
bot.command('start@mybot', async (ctx) => {
  // ...
})

// 同時響應 /start 和 /start@mybot
bot.command('start', async (ctx) => {
  // ...
})
```

---

## 深層連結（Deep Linking）

### 解析啟動參數

```typescript
bot.command('start', async (ctx) => {
  const payload = ctx.match // "/start abc123" -> "abc123"

  if (payload) {
    // 用戶從深層連結進入
    // payload 可以包含邀請碼、推薦者 ID 等
    await ctx.reply(`Welcome with payload: ${payload}`)
  } else {
    // 正常啟動
    await ctx.reply('Welcome!')
  }
})
```

### 深層連結格式

```
// 基本格式
https://t.me/botname?start=payload

// 在群組中添加 Bot
https://t.me/botname?startgroup=payload

// 在頻道中添加 Bot
https://t.me/botname?startchannel=payload
```

---

## Bot 命令列表

### 設置 Bot 命令提示

```typescript
await bot.api.setMyCommands([
  { command: 'start', description: 'Start the bot' },
  { command: 'help', description: 'Show help message' },
  { command: 'settings', description: 'Configure settings' },
  { command: 'about', description: 'About this bot' },
])
```

### 獲取當前命令列表

```typescript
const commands = await bot.api.getMyCommands()
```

### 刪除命令列表

```typescript
await bot.api.deleteMyCommands()
```

### 為特定作用域設置命令

```typescript
// 為所有用戶設置
await bot.api.setMyCommands(commands, { scope: { type: 'default' } })

// 為特定用戶設置
await bot.api.setMyCommands(commands, {
  scope: { type: 'all_private_chats' },
})

// 為特定群組設置
await bot.api.setMyCommands(commands, {
  scope: { type: 'all_group_chats' },
})

// 為特定 chat
await bot.api.setMyCommands(commands, {
  scope: { type: 'chat', chat_id: chatId },
})

// 為特定用戶
await bot.api.setMyCommands(commands, {
  scope: { type: 'chat_member', chat_id: chatId, user_id: userId },
})
```

---

## 使用 Composer 組織命令

```typescript
import { Composer } from 'grammy'

// 創建命令組
const admin = new Composer()

admin.command('ban', async (ctx) => {
  // 只有管理員會到達這裡
  await ctx.reply('Banning user...')
})

admin.command('kick', async (ctx) => {
  await ctx.reply('Kicking user...')
})

// 在主 bot 中使用
bot.use(async (ctx, next) => {
  // 檢查是否為管理員
  if (ctx.from?.id === ADMIN_ID) {
    return admin.handle(ctx)
  }
  await next()
})
```

---

## 命令檢測

### 檢查訊息是否包含命令

```typescript
if (ctx.hasCommand('start')) {
  // 訊息是 /start 命令
}

// 檢查多個命令
if (ctx.hasCommand(['start', 'help'])) {
  // 訊息是 /start 或 /help
}

// 檢查命令是否匹配正則
if (ctx.hasCommand(/^[a-z]+$/)) {
  // 命令名稱全是小寫字母
}
```

---

## 實際範例

### 簡單計算機

```typescript
bot.command('calc', async (ctx) => {
  const expr = ctx.match?.trim()

  if (!expr) {
    await ctx.reply('Usage: /calc 2+2')
    return
  }

  try {
    // 驗證表達式安全性
    if (!/^[\d+\-*/().\s]+$/.test(expr)) {
      await ctx.reply('Invalid characters')
      return
    }

    const result = eval(expr)
    await ctx.reply(`${expr} = ${result}`)
  } catch (error) {
    await ctx.reply('Calculation error')
  }
})
```

### 搜索命令

```typescript
bot.command('search', async (ctx) => {
  const query = ctx.match?.trim()

  if (!query || query.length < 2) {
    await ctx.reply('Please provide a search term (minimum 2 chars)')
    return
  }

  // 執行搜索
  const results = await searchFunction(query)

  if (results.length === 0) {
    await ctx.reply('No results found')
    return
  }

  const message = results
    .slice(0, 5)
    .map((r, i) => `${i + 1}. ${r}`)
    .join('\n')

  await ctx.reply(message)
})
```

### 提醒命令

```typescript
bot.command('remind', async (ctx) => {
  const [text, timeStr] = (ctx.match || '').split('|')

  if (!text || !timeStr) {
    await ctx.reply('Usage: /remind text|time\nExample: /remind buy milk|10m')
    return
  }

  // 解析時間
  const delay = parseTime(timeStr.trim())

  if (!delay) {
    await ctx.reply('Invalid time format (use 5m, 1h, etc.)')
    return
  }

  setTimeout(() => {
    ctx.reply(`Reminder: ${text}`).catch(() => {
      // 用戶可能已刪除聊天
    })
  }, delay)

  await ctx.reply(`Reminder set for ${timeStr}`)
})

function parseTime(str: string): number | null {
  const match = str.match(/(\d+)([mhd])/)
  if (!match) return null

  const [, value, unit] = match
  const total = parseInt(value)

  const multipliers = { m: 60, h: 3600, d: 86400 }
  return total * (multipliers[unit as keyof typeof multipliers] || 1) * 1000
}
```
