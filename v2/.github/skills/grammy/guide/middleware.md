# 中間件（Middleware）

## 中間件結構

### 基本中間件

```typescript
// 中間件函數簽名
type Middleware = (ctx: Context, next: NextFunction) => Promise<void>

// 實現
const myMiddleware = async (ctx, next) => {
  console.log('Before')
  await next() // 傳遞給下一層
  console.log('After')
}

// 安裝
bot.use(myMiddleware)
```

### 中間件執行順序

```typescript
bot.use(async (ctx, next) => {
  console.log('1. First')
  await next()
  console.log('6. First (after)')
})

bot.use(async (ctx, next) => {
  console.log('2. Second')
  await next()
  console.log('5. Second (after)')
})

bot.on('message', async (ctx) => {
  console.log('3. Handler')
  // 不調用 next，因為這已是最後一層
})

// 執行順序：1 -> 2 -> 3 -> 5 -> 6
```

---

## 常見中間件模式

### 記錄日誌中間件

```typescript
bot.use(async (ctx, next) => {
  const start = Date.now()

  console.log(`[${new Date().toISOString()}] Update from ${ctx.from?.id}`)

  await next()

  const duration = Date.now() - start
  console.log(`Response time: ${duration}ms`)
})
```

### 速率限制中間件

```typescript
const userLimits = new Map<number, { count: number; resetTime: number }>()

bot.use(async (ctx, next) => {
  const userId = ctx.from?.id
  if (!userId) return next()

  const now = Date.now()
  const limit = userLimits.get(userId) || { count: 0, resetTime: now + 60000 }

  if (now > limit.resetTime) {
    limit.count = 0
    limit.resetTime = now + 60000
  }

  if (limit.count >= 10) {
    return ctx.reply('Rate limited: max 10 messages/minute')
  }

  limit.count++
  userLimits.set(userId, limit)

  await next()
})
```

### 權限檢查中間件

```typescript
const ADMIN_ID = 123456

bot.use(async (ctx, next) => {
  // 附加權限信息
  const isAdmin = ctx.from?.id === ADMIN_ID
  ;(ctx as any).isAdmin = isAdmin
  await next()
})

// 使用
bot.command('ban', async (ctx) => {
  if (!(ctx as any).isAdmin) {
    return ctx.reply('Admin only')
  }
  // 執行禁止操作
})
```

### 會話中間件

```typescript
interface SessionData {
  counter: number
  userName?: string
  state?: 'idle' | 'waiting_input'
}

bot.use(async (ctx, next) => {
  if (!ctx.session) {
    ctx.session = { counter: 0 }
  }
  await next()
})

// 使用會話
bot.command('count', async (ctx) => {
  ctx.session.counter++
  await ctx.reply(`Count: ${ctx.session.counter}`)
})
```

---

## 條件中間件

### 基於訊息類型的中間件

```typescript
// 只對文本訊息執行
bot.use(async (ctx, next) => {
  if (ctx.msg?.text) {
    console.log('Text message:', ctx.msg.text)
  }
  await next()
})

// 只對特定用戶執行
bot.use(async (ctx, next) => {
  if (ctx.from?.id === ADMIN_ID) {
    console.log('Admin action')
  }
  await next()
})

// 基於聊天類型
bot.use(async (ctx, next) => {
  if (ctx.chat?.type === 'private') {
    console.log('Private chat')
  } else if (ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup') {
    console.log('Group chat')
  }
  await next()
})
```

### 提前終止

```typescript
bot.use(async (ctx, next) => {
  // 不調用 next，停止傳遞
  if (ctx.from?.is_bot) {
    return // 忽略其他 bot 的訊息
  }
  await next()
})
```

---

## 修改 Context

```typescript
// 在中間件中擴展 context
bot.use(async (ctx, next) => {
  // 添加自訂屬性
  ctx.config = {
    botName: 'MyBot',
    version: '1.0.0',
  }

  // 添加自訂方法
  ctx.logMessage = () => {
    console.log(`[${ctx.from?.id}] ${ctx.msg?.text}`)
  }

  await next()
})

// 在訊息處理器中使用
bot.on('message:text', async (ctx) => {
  ctx.logMessage()
  await ctx.reply(`Bot: ${ctx.config.botName}`)
})
```

---

## Composer 和中間件組織

### 使用 Composer

```typescript
import { Composer } from 'grammy'

// 為特定功能創建中間件組
const adminCommands = new Composer()

adminCommands.command('ban', async (ctx) => {
  await ctx.reply('Banning user...')
})

adminCommands.command('kick', async (ctx) => {
  await ctx.reply('Kicking user...')
})

// 受保護的中間件
const protected = new Composer()
protected.use(async (ctx, next) => {
  if (ctx.from?.id !== ADMIN_ID) {
    return ctx.reply('Admin only')
  }
  await next()
})

// 組裝
protected.use(adminCommands)
bot.use(protected)
```

### 條件性使用 Composer

```typescript
// 按用戶角色分發
bot.use(async (ctx, next) => {
  const isAdmin = ctx.from?.id === ADMIN_ID

  if (isAdmin) {
    return adminCommands.handle(ctx)
  }

  // 用戶命令
  await next()
})
```

---

## 錯誤處理在中間件中

```typescript
bot.use(async (ctx, next) => {
  try {
    await next()
  } catch (error) {
    console.error('Middleware error:', error)

    // 嘗試通知用戶
    try {
      await ctx.reply('An error occurred')
    } catch {
      // 訊息發送失敗
    }
  }
})
```

---

## 實際中間件示例

### 監測訊息統計

```typescript
interface Stats {
  totalMessages: number
  userMessages: Map<number, number>
  messageTypes: Map<string, number>
}

const stats: Stats = {
  totalMessages: 0,
  userMessages: new Map(),
  messageTypes: new Map(),
}

bot.use(async (ctx, next) => {
  // 記錄統計
  stats.totalMessages++

  const userId = ctx.from?.id
  if (userId) {
    stats.userMessages.set(userId, (stats.userMessages.get(userId) || 0) + 1)
  }

  // 記錄訊息類型
  if (ctx.msg?.text) {
    stats.messageTypes.set('text', (stats.messageTypes.get('text') || 0) + 1)
  } else if (ctx.msg?.photo) {
    stats.messageTypes.set('photo', (stats.messageTypes.get('photo') || 0) + 1)
  }

  await next()
})

bot.command('stats', async (ctx) => {
  const topUsers = Array.from(stats.userMessages.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const message = `
Stats:
- Total: ${stats.totalMessages}
- Types: ${Array.from(stats.messageTypes.entries())
    .map(([type, count]) => `${type}: ${count}`)
    .join(', ')}
- Top users: ${topUsers.map(([id, count]) => `${id}: ${count}`).join(', ')}
  `.trim()

  await ctx.reply(message)
})
```

### 自動回覆中間件

```typescript
const autoReplies = {
  hello: 'Hi there! 👋',
  bye: 'Goodbye! 👋',
  thanks: "You're welcome! 😊",
}

bot.use(async (ctx, next) => {
  const text = ctx.msg?.text?.toLowerCase()

  if (text && autoReplies[text as keyof typeof autoReplies]) {
    await ctx.reply(autoReplies[text as keyof typeof autoReplies])
    return // 不執行其他訊息處理
  }

  await next()
})
```

### 打字指示中間件

```typescript
bot.use(async (ctx, next) => {
  // 顯示正在輸入
  ctx.api.sendChatAction(ctx.chat!.id, 'typing').catch(() => {})

  const start = Date.now()
  await next()
  const duration = Date.now() - start

  // 長時間操作才顯示輸入狀態
  if (duration > 1000) {
    console.log(`Slow handler: ${duration}ms`)
  }
})
```
