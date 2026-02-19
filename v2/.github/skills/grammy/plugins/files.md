# 文件插件（Files）

## 文件下載

### 基本安裝

```typescript
import { FileFlavor, hydrateFiles } from '@grammyjs/files'

type MyContext = FileFlavor<Context>

const bot = new Bot<MyContext>('')

// 使用 API transformer
bot.api.config.use(hydrateFiles(bot.token))
```

### 下載文件

```typescript
bot.on('message:photo', async (ctx) => {
  const file = await ctx.getFile()

  // 下載到臨時位置
  const path = await file.download()

  console.log(`File saved at: ${path}`)

  // 稍後刪除
  // deleteFile(path);
})

bot.on('message:document', async (ctx) => {
  const file = await ctx.getFile()

  // 下載到特定位置
  const path = await file.download('./downloads/document.pdf')

  // 處理文件
  processFile(path)
})
```

---

## 獲取下載 URL

### 生成下載 URL

```typescript
bot.on('message:video', async (ctx) => {
  const file = await ctx.getFile()

  // 獲取 HTTPS URL
  const url = file.getUrl()

  // URL 有效期：至少 1 小時
  await ctx.reply(`Download: ${url}`)
})
```

### 使用 URL

```typescript
const file = await ctx.getFile()
const url = file.getUrl()

// 在 HTML 中使用
const html = `<a href="${url}">Download File</a>`

// 轉發給另一個 bot
await bot.api.sendDocument(otherChatId, url)
```

---

## 支持 bot.api 調用

### 類型定義

```typescript
import { Api, Bot, Context } from 'grammy'
import { FileApiFlavor, FileFlavor, hydrateFiles } from '@grammyjs/files'

type MyContext = FileFlavor<Context>
type MyApi = FileApiFlavor<Api>

const bot = new Bot<MyContext, MyApi>('')
bot.api.config.use(hydrateFiles(bot.token))

// 現在 bot.api.getFile() 結果也有 download() 和 getUrl()
```

### 使用 bot.api

```typescript
// 從外部訊息處理程序下載
const message = await bot.api.sendDocument(chatId, new InputFile('/path/to/file'))

// 現在可以使用水合方法
const file = await bot.api.getFile(message.document.file_id)
const path = await file.download()
```

---

## 本地 Bot API 伺服器

### 配置本地伺服器

```typescript
// 如果使用本地 Bot API 伺服器
const bot = new Bot('TOKEN', {
  client: {
    apiRoot: 'http://localhost:8081', // 本地 Bot API 伺服器地址
  },
})

bot.api.config.use(hydrateFiles(bot.token))
```

### 本地伺服器工作流

```typescript
// 本地伺服器上，getFile() 返回磁盤上的本地路徑
const file = await ctx.getFile()

// file.file_path 是絕對路徑，例如 "/var/lib/telegram-bot-api/files/..."

// download() 會複製文件到臨時位置
const tempPath = await file.download()

// getUrl() 返回本地文件路徑
const localPath = file.getUrl()

// 直接讀取文件
const fs = require('fs')
const content = fs.readFileSync(localPath)
```

---

## 實際範例

### 批量下載

```typescript
import * as fs from 'fs/promises'

async function downloadPhotos(fileIds: string[]): Promise<string[]> {
  const paths: string[] = []

  for (const fileId of fileIds) {
    try {
      const file = await bot.api.getFile(fileId)
      const path = await file.download(`./photos/photo_${Date.now()}.jpg`)
      paths.push(path)
    } catch (error) {
      console.error(`Failed to download ${fileId}:`, error)
    }
  }

  return paths
}

bot.command('backup_photos', async (ctx) => {
  const fileIds = [
    /*...*/
  ]
  const paths = await downloadPhotos(fileIds)
  await ctx.reply(`Downloaded ${paths.length} files`)
})
```

### 文件處理流程

```typescript
bot.on('message:document', async (ctx) => {
  const file = await ctx.getFile()
  const fileName = ctx.msg.document.file_name

  // 下載
  const downloadPath = await file.download(`./uploads/${fileName}`)

  try {
    // 處理文件
    const result = await processDocument(downloadPath)

    // 上傳結果
    const resultFile = new InputFile(result.outputPath)
    await ctx.replyWithDocument(resultFile, {
      caption: `Processed: ${fileName}`,
    })
  } finally {
    // 清理臨時文件
    await fs.unlink(downloadPath)
  }
})
```

### 條件下載

```typescript
bot.on('message:photo', async (ctx) => {
  const photo = ctx.msg.photo[ctx.msg.photo.length - 1]

  // 只下載超過某大小的照片
  if ((photo.file_size || 0) < 1024 * 100) {
    // 小於 100KB，跳過
    return
  }

  const file = await ctx.getFile()
  const path = await file.download()

  // 分析或處理高分辨率照片
  analyzeImage(path)
})
```

### 代理下載

```typescript
// 允許用戶通過 URL 下載 Bot 接收的文件
bot.command('get_file', async (ctx) => {
  const targetMessageId = ctx.match // "/get_file 123"

  if (!targetMessageId) {
    await ctx.reply('Usage: /get_file <message_id>')
    return
  }

  try {
    const message = await bot.api.getMessage(ctx.chat.id, parseInt(targetMessageId))

    if (!message.document && !message.photo && !message.video) {
      await ctx.reply('Message has no downloadable content')
      return
    }

    const fileId =
      message.document?.file_id || message.photo?.[message.photo.length - 1].file_id || message.video?.file_id

    const file = await bot.api.getFile(fileId)
    const url = file.getUrl()

    await ctx.reply(`Download: ${url}`)
  } catch (error) {
    await ctx.reply('Message not found or access denied')
  }
})
```

### 文件驗證和轉換

```typescript
import * as path from 'path'

async function validateAndConvertPDF(filePath: string): Promise<boolean> {
  const ext = path.extname(filePath).toLowerCase()

  if (ext !== '.pdf') {
    return false
  }

  // 驗證 PDF 簽名
  const header = await readFirstBytes(filePath, 4)
  return header.toString() === '%PDF'
}

bot.on('message:document', async (ctx) => {
  const file = await ctx.getFile()
  const tempPath = await file.download()

  if (!(await validateAndConvertPDF(tempPath))) {
    await ctx.reply('Invalid PDF file')
    return
  }

  // 處理有效 PDF
  const result = await processPDF(tempPath)
  await ctx.replyWithDocument(new InputFile(result))
})
```
