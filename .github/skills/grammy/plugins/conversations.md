# 對話插件（Conversations）

## 基本概念

```typescript
// 對話是重放引擎 - 在每次更新到達時從頭開始執行，直到 wait 調用

import { Bot, Context } from 'grammy'
import { Conversation, ConversationFlavor, conversations, createConversation } from '@grammyjs/conversations'

type MyContext = ConversationFlavor<Context>

const bot = new Bot<MyContext>('')
bot.use(conversations())
```

---

## 定義對話

### 基本對話

```typescript
async function hello(conversation: Conversation, ctx: Context) {
  await ctx.reply('Hi there! What is your name?')
  const { message } = await conversation.waitFor('message:text')

  await ctx.reply(`Welcome to the chat, ${message.text}!`)
}

bot.use(createConversation(hello))

bot.command('enter', async (ctx) => {
  await ctx.conversation.enter('hello')
})
```

---

## 等待更新

### 基本 Wait 調用

```typescript
async function greeting(conversation: Conversation, ctx: Context) {
  await ctx.reply('Send me something')

  // 等待任何更新
  const ctx1 = await conversation.wait()

  // 等待特定類型
  const { message } = await conversation.waitFor('message:text')
  const { message: photo } = await conversation.waitFor('message:photo')

  // 等待命令
  const cmd = await conversation.waitForCommand('start')

  // 等待正則匹配
  const text = await conversation.waitForHears(/hello/i)
}
```

### 過濾 Wait 調用

```typescript
// 等待文本
const { message } = await conversation.waitFor('message:text')

// 等待特定內容
const photo = await conversation.waitFor(':photo')
const video = await conversation.waitFor(':video')

// 鏈接條件
const photoWithCaption = await conversation.waitFor(':photo').andForHears('confirm')

// 自訂 otherwise 處理
const text = await conversation.waitFor('message:text', {
  otherwise: (ctx) => ctx.reply('Please send text'),
})
```

---

## 黃金規則（Golden Rule）

### 外部操作需要包裝

```typescript
// ❌ 不能直接訪問數據庫或外部 API
const user = await database.getUser(userId)

// ✅ 必須使用 conversation.external
const user = await conversation.external(() => database.getUser(userId))
```

### conversation.external 用途

```typescript
// 讀取數據庫
const user = await conversation.external((ctx) => getUserFromDB(ctx.from.id))

// 寫入數據庫
await conversation.external((ctx) => {
  saveUserChoice(ctx.from.id, choice)
})

// 隨機數和時間戳
const random = await conversation.random()
const now = await conversation.now()

// 日誌
await conversation.log('User chose option X')

// 訪問會話
const session = await conversation.external((ctx) => ctx.session)
```

### 何時NOT使用 conversation.external

```typescript
// ✅ 發送訊息 - 不需要 external
await ctx.reply('Hello')

// ✅ 編輯訊息 - 不需要 external
await ctx.editMessageText('Updated')

// ✅ 回應回調 - 不需要 external
await ctx.answerCallbackQuery()
```

---

## 進入和退出對話

### 進入對話

```typescript
bot.command('start', async (ctx) => {
  // 進入預設命名的對話
  await ctx.conversation.enter('hello')
})

// 可選：帶參數進入
async function parameterized(conversation: Conversation, ctx: Context, name: string, age: number) {
  // ...
}

bot.use(createConversation(parameterized))

bot.command('user', async (ctx) => {
  await ctx.conversation.enter('parameterized', 'John', 25)
})
```

### 退出對話

```typescript
async function convo(conversation: Conversation, ctx: Context) {
  // 方法 1：返回
  if (error) return

  // 方法 2：拋出錯誤
  if (invalid) throw new Error('Invalid')

  // 方法 3：手動停止
  if (cancelled) await conversation.halt()
}

// 從外部退出
bot.command('cancel', async (ctx) => {
  await ctx.conversation.exit('convo')
})
```

---

## 對話中的表單

### Form 字段

```typescript
async function userForm(conversation: Conversation, ctx: Context) {
  await ctx.reply('Please send a photo')
  const photo = await conversation.form.photo()

  await ctx.reply('Enter your age')
  const age = await conversation.form.int()

  await ctx.reply('Choose a color')
  const color = await conversation.form.select(['red', 'blue', 'green'])

  await ctx.reply('Enter your email')
  const email = await conversation.form.text()
}
```

### Available Form Fields

```typescript
// 基本字段
await conversation.form.text() // 文本
await conversation.form.number() // 數字
await conversation.form.int() // 整數
await conversation.form.float() // 浮點數

// 媒體字段
await conversation.form.photo()
await conversation.form.video()
await conversation.form.audio()
await conversation.form.voice()
await conversation.form.document()

// 選擇字段
await conversation.form.select(['a', 'b', 'c'])
await conversation.form.multiSelect(['a', 'b', 'c'])

// 帶驗證
const num = await conversation.form.int({
  action: (ctx) => ctx.deleteMessage(),
  otherwise: (ctx) => ctx.reply('Invalid'),
})
```

---

## 變量和控制流

### 基本 JavaScript

```typescript
async function counter(conversation: Conversation, ctx: Context) {
  let sum = 0

  await ctx.reply('Send numbers')

  for (let i = 0; i < 3; i++) {
    const { message } = await conversation.waitFor('message:text')
    sum += parseInt(message.text)
  }

  await ctx.reply(`Sum: ${sum}`)
}
```

### 條件分支

```typescript
async function conditional(conversation: Conversation, ctx: Context) {
  await ctx.reply("Type 'yes' or 'no'")
  const { message } = await conversation.waitFor('message:text')

  if (message.text.toLowerCase() === 'yes') {
    await ctx.reply('You said yes!')
  } else {
    await ctx.reply('You said no!')
  }
}
```

---

## 對話菜單

### ConversationalMenu

```typescript
async function menuConvo(conversation: Conversation, ctx: Context) {
  let choice = ''

  const menu = conversation
    .menu('my-menu')
    .text('Option A', (ctx) => {
      choice = 'A'
      ctx.menu.update()
    })
    .text('Option B', (ctx) => {
      choice = 'B'
      ctx.menu.update()
    })
    .row()
    .text('Done', (ctx) => {
      ctx.menu.close()
    })

  await ctx.reply('Choose:', { reply_markup: menu })

  // 等待菜單完成
  await conversation.waitUntil(() => !choice, { otherwise: (ctx) => ctx.reply('Use the menu') })

  await ctx.reply(`You chose: ${choice}`)
}
```

---

## 超時和檢查點

### 超時設置

```typescript
// 單個 wait
const ctx1 = await conversation.wait({
  maxMilliseconds: 60 * 1000, // 1 分鐘
})

// 全局超時
bot.use(
  createConversation(convo, {
    maxMillisecondsToWait: 5 * 60 * 1000, // 5 分鐘
  })
)
```

### 檢查點和回誰

```typescript
async function withCheckpoint(conversation: Conversation, ctx: Context) {
  const start = conversation.checkpoint()

  await ctx.reply('Step 1')
  const ctx1 = await conversation.wait()

  await ctx.reply('Step 2')
  const ctx2 = await conversation.wait()

  // 返回上一步
  if (ctx2.hasCommand('back')) {
    await conversation.rewind(start)
    // 對話重新開始
  }
}
```

---

## 並行對話

### 啟用並行

```typescript
bot.use(createConversation(convo, { parallel: true }))
```

### 並行對話的工作原理

```typescript
// -  不同對話可以在同一聊天中並行運行
// - 可以有多個相同對話的實例
// - 先進入的對話優先處理更新

async function captcha(conversation: Conversation, ctx: Context) {
  await ctx.reply('What is the answer?')
  // ...
}

async function settings(conversation: Conversation, ctx: Context) {
  await ctx.reply('Configure settings')
  // ...
}

bot.use(createConversation(captcha))
bot.use(createConversation(settings))

// 兩個對話可以同時活躍
```

---

## Session 集成

### 在對話中訪問 Session

```typescript
type MyContext = ConversationFlavor<Context> & SessionFlavor<SessionData>

async function saveData(conversation: Conversation, ctx: MyContext) {
  // 讀取會話
  const session = await conversation.external((ctx) => ctx.session)

  // 修改會話
  session.counter++

  // 保存會話
  await conversation.external((ctx) => {
    ctx.session = session
  })
}
```

---

## 實際範例

### 註冊流程

```typescript
interface UserData {
  name: string
  age: number
  email: string
}

async function register(conversation: Conversation, ctx: Context): Promise<UserData> {
  await ctx.reply("Welcome! Let's register.")

  await ctx.reply("What's your name?")
  const { message: nameMsg } = await conversation.waitFor('message:text')
  const name = nameMsg.text

  await ctx.reply('How old are you?')
  const age = await conversation.form.int()

  await ctx.reply('Your email?')
  const { message: emailMsg } = await conversation.waitFor('message:text')
  const email = emailMsg.text

  await ctx.reply(`Registered: ${name}, ${age} years, ${email}`)

  return { name, age, email }
}

bot.use(createConversation(register))

bot.command('register', async (ctx) => {
  const userData = await ctx.conversation.enter('register')
})
```

### 習題流程

```typescript
async function quiz(conversation: Conversation, ctx: Context) {
  const questions = [
    { q: '2+2?', a: '4' },
    { q: '3+5?', a: '8' },
  ]

  let score = 0

  for (const { q, a } of questions) {
    await ctx.reply(q)
    const { message } = await conversation.waitFor('message:text')

    if (message.text === a) {
      await ctx.reply('✅ Correct!')
      score++
    } else {
      await ctx.reply(`❌ Wrong! Answer: ${a}`)
    }
  }

  await ctx.reply(`Final score: ${score}/${questions.length}`)
}
```
