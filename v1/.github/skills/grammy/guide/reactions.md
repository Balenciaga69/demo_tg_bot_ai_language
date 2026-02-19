# 反應（Reactions）

## 發送反應

### 添加 Emoji 反應

```typescript
// 添加反應到當前訊息
await ctx.react('👍')
await ctx.react('❤️')
await ctx.react('🎉')

// 添加反應到特定訊息
await ctx.api.setMessageReaction(chatId, messageId, [{ type: 'emoji', emoji: '👍' }])
```

### 使用自訂 Emoji

```typescript
// 需要知道自訂 emoji 的 ID
await ctx.react({
  type: 'custom_emoji',
  custom_emoji_id: 'custom_emoji_id_string',
})
```

### 付費反應

```typescript
// 添加付費反應（星形）
await ctx.react({ type: 'paid' })

// 用選項
await ctx.react(
  { type: 'emoji', emoji: '👍' },
  {
    is_big: true, // 大反應
  }
)
```

---

## 接收反應更新

### 監聽反應變化

```typescript
// 訊息反應更新（私聊和群組）
bot.on('message_reaction', async (ctx) => {
  const { message_id, user_id, actor_chat_id, old_reaction, new_reaction } = ctx.messageReaction

  // 解析反應變化
  const reactions = ctx.reactions()

  if (reactions.emojiAdded.includes('👍')) {
    console.log('User added 👍')
  }

  if (reactions.emojiRemoved.includes('❤️')) {
    console.log('User removed ❤️')
  }
})

// 反應計數更新（頻道和自動轉發的群組貼文）
bot.on('message_reaction_count', async (ctx) => {
  const { message_id, reactions } = ctx.messageReactionCount

  // reactions 是 ReactionCount[] 陣列
  reactions.forEach((reaction) => {
    console.log(`${reaction.type}: ${reaction.count}`)
  })
})
```

---

## 反應解析助手

### ctx.reactions() 方法

```typescript
const {
  // Emoji 反應
  emoji, // 當前所有 emoji
  emojiAdded, // 新添加的 emoji
  emojiRemoved, // 移除的 emoji
  emojiKept, // 保留的 emoji

  // 自訂 emoji
  customEmoji, // 當前所有自訂 emoji
  customEmojiAdded, // 新添加的自訂 emoji
  customEmojiRemoved, // 移除的自訂 emoji
  customEmojiKept, // 保留的自訂 emoji

  // 付費反應
  paid, // 是否有付費反應
  paidAdded, // 付費反應是否被添加
} = ctx.reactions()
```

### 實際範例

```typescript
bot.on('message_reaction', async (ctx) => {
  const { emoji, emojiAdded, emojiRemoved, customEmojiAdded } = ctx.reactions()

  // 檢查特定反應
  if (emojiAdded.includes('👍')) {
    console.log('User gave thumbs up')
  }

  // 檢查是否有自訂 emoji
  if (customEmojiAdded.length > 0) {
    console.log('Custom emoji added:', customEmojiAdded)
  }

  // 列出當前的所有反應
  console.log('Current reactions:', emoji)
})
```

---

## 過濾反應

### 監聽特定反應

```typescript
// 監聽特定 emoji
bot.reaction('👍', async (ctx) => {
  await ctx.reply('Thanks for the thumbs up!')
})

// 監聽多個 emoji
bot.reaction(['👍', '❤️', '🎉'], async (ctx) => {
  await ctx.reply('Thanks!')
})

// 監聽自訂 emoji
bot.reaction({ type: 'custom_emoji', custom_emoji_id: 'id_string' }, async (ctx) => {
  await ctx.reply('Thanks for the custom emoji!')
})

// 監聽付費反應
bot.reaction({ type: 'paid' }, async (ctx) => {
  await ctx.reply('Thanks for the star!')
})
```

---

## 設置允許的反應

### 配置聊天反應

```typescript
// 允許所有反應
await ctx.api.setAllowedReactions({
  allowed_reactions: [
    { type: 'emoji', emoji: '👍' },
    { type: 'emoji', emoji: '❤️' },
    { type: 'emoji', emoji: '😂' },
    // ...
  ],
  allow_user_custom_emoji: true,
})

// 允許用戶添加自訂 emoji
await ctx.api.setAllowedReactions({
  allow_user_custom_emoji: true,
})

// 不允許任何反應
await ctx.api.setAllowedReactions({
  allowed_reactions: [],
})
```

### 獲取允許的反應

```typescript
const reactions = await ctx.api.getAvailableReactions()
// 返回支持的所有 emoji 反應列表
```

---

## 移除反應

### 刪除反應

```typescript
// 移除特定 emoji
await ctx.api.setMessageReaction(chatId, messageId, [], {
  is_big: false,
})

// 清除所有反應（需要管理員權限）
await ctx.api.setMessageReaction(chatId, messageId, [])
```

---

## 高級用法

### 反應計數更新（頻道）

```typescript
// 由於隱私原因，個別反應在頻道中不可見
bot.on('message_reaction_count', async (ctx) => {
  const totalReactions = ctx.messageReactionCount.reactions.reduce((sum, r) => sum + r.count, 0)

  console.log(`Total reactions: ${totalReactions}`)

  // 統計各種反應類型
  ctx.messageReactionCount.reactions.forEach((reaction) => {
    if (reaction.type === 'emoji') {
      console.log(`${reaction.emoji}: ${reaction.count}`)
    }
  })
})
```

### 反應監測機制實現

```typescript
interface UserReaction {
  userId: number
  emoji: string
  timestamp: number
}

const reactions: Map<number, UserReaction[]> = new Map()

bot.on('message_reaction', async (ctx) => {
  const { user_id, message_id } = ctx.messageReaction
  const { emoji, emojiAdded, emojiRemoved } = ctx.reactions()

  if (!reactions.has(message_id)) {
    reactions.set(message_id, [])
  }

  const msgReactions = reactions.get(message_id)!

  // 移除舊的反應
  const idx = msgReactions.findIndex((r) => r.userId === user_id)
  if (idx !== -1) {
    msgReactions.splice(idx, 1)
  }

  // 添加新反應
  emojiAdded.forEach((emoji) => {
    msgReactions.push({
      userId: user_id,
      emoji,
      timestamp: Date.now(),
    })
  })

  console.log(`Message ${message_id} reactions:`, msgReactions)
})
```

### 反應熱度檢測

```typescript
bot.on('message_reaction_count', async (ctx) => {
  const { reactions } = ctx.messageReactionCount

  // 計算熱度分數
  const heat = reactions.reduce((score, r) => {
    const baseScore = r.count
    // 自訂 emoji 計分更高
    const multiplier = r.type === 'custom_emoji' ? 2 : 1
    // 付費反應計分最高
    if (r.type === 'paid') return score + baseScore * 3
    return score + baseScore * multiplier
  }, 0)

  console.log(`Message heat: ${heat}`)

  // 如果熱度高，可觸發特殊操作
  if (heat > 100) {
    console.log('This message is viral!')
  }
})
```
