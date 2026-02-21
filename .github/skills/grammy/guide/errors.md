# 錯誤處理（Error Handling）

## 基本錯誤捕捉

### Global Error Handler

```typescript
import { GrammyError, HttpError } from 'grammy'

bot.catch((err) => {
  const ctx = err.ctx
  const error = err.error

  console.error('Error while handling update', ctx.update.update_id)

  if (error instanceof GrammyError) {
    console.error('Error in request:', error.description)
    console.error('Status code:', error.status)
  } else if (error instanceof HttpError) {
    console.error('Could not contact Telegram:', error)
  } else {
    console.error('Unknown error:', error)
  }
})
```

---

## 三種錯誤類型

### GrammyError

```typescript
// API 請求失敗
// 原因：Bot API 返回 ok: false

try {
  await ctx.reply('Message')
} catch (error) {
  if (error instanceof GrammyError) {
    console.error('API Error:', error.description)
    // error.status - HTTP 狀態碼
    // error.ok - API ok 值
    // error.parameters - API 返回的參數
  }
}
```

### HttpError

```typescript
// 網絡錯誤
// 原因：無法連接到 Telegram Bot API

try {
  await ctx.reply('Message')
} catch (error) {
  if (error instanceof HttpError) {
    console.error('Network error:', error.message)
    console.error('Original error:', error.error)
  }
}
```

### BotError

```typescript
// 所有其他錯誤

bot.catch((err) => {
  // err 是 BotError
  const ctx = err.ctx // Context 對象
  const error = err.error // 原始錯誤

  // 訪問更新信息
  console.log('Update ID:', ctx.update.update_id)

  // 區分錯誤類型
  if (error instanceof GrammyError) {
    // 處理 API 錯誤
  } else if (error instanceof HttpError) {
    // 處理網絡錯誤
  } else {
    // 處理應用錯誤
    console.error('Application error:', error)
  }
})
```

---

## 中間件中的錯誤處理

### Try-Catch

```typescript
bot.on('message:text', async (ctx) => {
  try {
    const result = await someAsyncOperation()
    await ctx.reply(`Result: ${result}`)
  } catch (error) {
    if (error instanceof GrammyError) {
      console.error('API error:', error.description)
    } else {
      console.error('Operation failed:', error)
    }

    // 通知用戶
    await ctx.reply('Something went wrong')
  }
})
```

### 手動處理 API 錯誤

```typescript
async function safeReply(ctx: Context, message: string): Promise<boolean> {
  try {
    await ctx.reply(message)
    return true
  } catch (error) {
    if (error instanceof GrammyError) {
      // 聊天已被刪除或 bot 被移除
      if (error.status === 400 && error.description.includes('chat not found')) {
        console.log("Chat doesn't exist anymore")
        return false
      }

      // Bot 沒有權限
      if (error.status === 403) {
        console.log('Bot was blocked')
        return false
      }

      // 訊息過長
      if (error.description.includes('message too long')) {
        await ctx.reply(message.substring(0, 1000) + '...')
        return true
      }
    }

    throw error // 重新拋出未知錯誤
  }
}
```

---

## 錯誤邊界

### 基本錯誤邊界

```typescript
import { Composer } from 'grammy'

const protected = new Composer()

protected.errorBoundary((err, next) => {
  console.error('Error in protected middleware:', err.error.message)
  // 不調用 next 以停止執行
  // 或調用 next 以繼續執行
  // (取決於您想要的行為)
})

protected.use(someMiddleware)
protected.on('message', handleMessage)

bot.use(protected)
```

### 多層錯誤邊界

```typescript
const outer = new Composer()
const inner = new Composer()

// 內部邊界
inner.errorBoundary((err) => {
  console.error('Inner error:', err.error.message)
  // 被捕捉，不傳播
})

inner.on('message', async (ctx) => {
  throw new Error('Inner error')
})

// 外部邊界
outer.errorBoundary((err) => {
  console.error('Outer error:', err.error.message)
})

outer.use(inner)

bot.use(outer)

// 只會列出 "Inner error"
```

### 錯誤邊界加恢復

```typescript
const composer = new Composer()

composer.errorBoundary(async (err, next) => {
  console.error('Error occurred:', err.error.message)

  // 嘗試通知用戶
  try {
    await err.ctx.reply('An error occurred, trying to recover...')
  } catch {
    // 無法回覆，繼續
  }

  // 調用 next 以繼續執行後續中間件
  await next()
})
```

---

## 常見 API 錯誤

| 錯誤代碼 | 描述                         |
| -------- | ---------------------------- |
| 400      | 請求格式錯誤或聊天不存在     |
| 401      | 未授權（token 無效）         |
| 403      | 禁止（bot 被移除或沒有權限） |
| 404      | 訊息或聊天不存在             |
| 409      | 衝突（通常是長輪詢超時）     |
| 429      | 過多請求（速率限制）         |
| 500      | Telegram 伺服器錯誤          |

---

## 實際錯誤處理示例

### 批量訊息發送

```typescript
async function broadcastMessage(chatIds: number[], message: string): Promise<{ successful: number; failed: number }> {
  let successful = 0
  let failed = 0

  for (const chatId of chatIds) {
    try {
      await bot.api.sendMessage(chatId, message)
      successful++
    } catch (error) {
      failed++

      if (error instanceof GrammyError) {
        if (error.status === 403) {
          console.log(`Bot blocked by chat ${chatId}`)
        } else if (error.status === 400 && error.description.includes('not found')) {
          console.log(`Chat ${chatId} not found`)
        } else {
          console.error(`Error sending to ${chatId}:`, error.description)
        }
      } else if (error instanceof HttpError) {
        console.error(`Network error:`, error.message)
      }
    }
  }

  return { successful, failed }
}

bot.command('broadcast', async (ctx) => {
  const result = await broadcastMessage([user1, user2, user3], 'Broadcast message')
  await ctx.reply(`Sent to ${result.successful}, failed: ${result.failed}`)
})
```

### 重試邏輯

```typescript
async function retryRequest<T>(fn: () => Promise<T>, maxRetries: number = 3, delay: number = 1000): Promise<T> {
  let lastError: Error | undefined

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      // 只重試網絡錯誤
      if (!(error instanceof HttpError)) {
        throw error
      }

      console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms`)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

// 使用
const message = await retryRequest(() => ctx.reply('Hello'), 3, 2000)
```

### 優雅降級

```typescript
async function sendNotification(ctx: Context, title: string, description: string) {
  try {
    // 嘗試發送格式化訊息
    await ctx.reply(`<b>${title}</b>\n${description}`, { parse_mode: 'HTML' })
  } catch (error) {
    if (error instanceof GrammyError && error.description.includes('parse_mode')) {
      // HTML 解析失敗，使用純文本
      await ctx.reply(`${title}\n${description}`)
    } else {
      throw error
    }
  }
}
```
