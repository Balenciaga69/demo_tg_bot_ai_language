# 文件處理（File Handling）

## 文件 ID 與唯一 ID

### 文件 ID 特性

```typescript
// file_id - Bot 特定的文件識別符
// - 只對當前 bot 有效
// - 每個 bot 對相同文件有不同的 file_id
// - 有有效期限制

const fileId = ctx.msg.photo[0].file_id

// file_unique_id - 文件的唯一標識符
// - 對所有 bot 相同
// - 不能用於下載
// - 比較兩個文件是否相同

const uniqueId = ctx.msg.photo[0].file_unique_id

// 檢查是否為相同文件
if (file1.file_unique_id === file2.file_unique_id) {
  console.log('Same file')
}
```

---

## 接收文件

### 基本文件接收

```typescript
// 監聽照片
bot.on('message:photo', async (ctx) => {
  const photo = ctx.msg.photo
  const largestPhoto = photo[photo.length - 1] // 最高解析度
  const fileId = largestPhoto.file_id
  const fileSize = largestPhoto.file_size // 位元組

  await ctx.reply(`Photo received! Size: ${fileSize} bytes, ID: ${fileId}`)
})

// 監聽視頻
bot.on('message:video', async (ctx) => {
  const video = ctx.msg.video
  const fileId = video.file_id
  const duration = video.duration // 秒
  const width = video.width
  const height = video.height
})

// 監聽文檔
bot.on('message:document', async (ctx) => {
  const doc = ctx.msg.document
  const fileName = doc.file_name
  const mimeType = doc.mime_type
  const fileId = doc.file_id
})

// 監聽語音
bot.on('message:voice', async (ctx) => {
  const voice = ctx.msg.voice
  const duration = voice.duration
  const mimeType = voice.mime_type
})

// 監聽音頻
bot.on('message:audio', async (ctx) => {
  const audio = ctx.msg.audio
  const performer = audio.performer
  const title = audio.title
  const duration = audio.duration
})
```

### 使用過濾查詢

```typescript
// 接收任何媒體
bot.on(':media', async (ctx) => {
  const fileId = ctx.msg.photo?.[0].file_id ?? ctx.msg.video?.file_id ?? ctx.msg.document?.file_id
})

// 接收文件（不含照片）
bot.on(':file', async (ctx) => {
  // document, video, audio, voice, animation 等
})
```

---

## 獲取文件信息

### 獲取文件路徑

```typescript
bot.on('message:photo', async (ctx) => {
  const fileId = ctx.msg.photo[ctx.msg.photo.length - 1].file_id

  // 使用 getFile
  const file = await ctx.getFile()
  // 或
  const file = await bot.api.getFile(fileId)

  // file 包含：
  // - file_id
  // - file_unique_id
  // - file_size
  // - file_path

  console.log('File path:', file.file_path)
})
```

### 構建下載 URL

```typescript
const file = await ctx.getFile()
const downloadUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`

// 使用 fetch 下載
const response = await fetch(downloadUrl)
const buffer = await response.arrayBuffer()
```

---

## 發送文件

### 通過 file_id 發送

```typescript
// 最高效 - 不需要重新上傳
await ctx.replyWithPhoto(existingFileId)
await ctx.replyWithVideo(existingFileId)
await ctx.replyWithDocument(existingFileId)
await ctx.replyWithAudio(existingFileId)
await ctx.replyWithVoice(existingFileId)
await ctx.replyWithAnimation(existingFileId)
```

### 通過 URL 發送

```typescript
// Telegram 會自動下載並發送
await ctx.replyWithPhoto('https://example.com/photo.jpg')
await ctx.replyWithVideo('https://example.com/video.mp4')
await ctx.replyWithDocument('https://example.com/file.pdf')

// 指定文件名稱
await ctx.replyWithDocument('https://example.com/file.pdf', {
  parse_mode: 'HTML',
  caption: '<b>Important Document</b>',
})
```

### 上傳本地文件

```typescript
import { InputFile } from "grammy";

// 從路徑
await ctx.replyWithPhoto(new InputFile("/path/to/photo.jpg"));

// 從 Buffer
const buffer = Buffer.from([...]);
await ctx.replyWithPhoto(new InputFile(buffer));

// 從 Stream
import { createReadStream } from "fs";
const stream = createReadStream("photo.jpg");
await ctx.replyWithPhoto(new InputFile(stream));

// 從 URL（流式傳輸）
await ctx.replyWithPhoto(new InputFile(new URL("https://example.com/photo.jpg")));
```

---

## 文件大小限制

### Telegram 限制

```typescript
// 接收限制
// - 普通文件：20 MB
// - Premium 文件：4000 MB

// 發送限制
// - MRL (Web URL)：5 MB（部分）
// - 普通文件：50 MB
// - Premium 文件：2000 MB

// 檢查文件大小
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

bot.on('message:document', async (ctx) => {
  if ((ctx.msg.document.file_size ?? 0) > MAX_FILE_SIZE) {
    await ctx.reply('File too large')
    return
  }
  // 處理文件
})
```

---

## 實際文件處理示例

### 轉發文件

```typescript
bot.on('message:photo', async (ctx) => {
  const photoId = ctx.msg.photo[ctx.msg.photo.length - 1].file_id

  // 保存到資料庫
  const savedFile = {
    fileId: photoId,
    fileUniqueId: ctx.msg.photo[ctx.msg.photo.length - 1].file_unique_id,
    uploadedAt: new Date(),
    uploadedBy: ctx.from?.id,
  }

  // 轉發到另一個聊天
  await bot.api.sendPhoto(targetChatId, photoId, {
    caption: `Forwarded from ${ctx.from?.first_name}`,
  })
})
```

### 文件驗證

```typescript
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

bot.on('message:document', async (ctx) => {
  const doc = ctx.msg.document

  // 檢查 MIME 類型
  if (doc.mime_type && !ALLOWED_TYPES.includes(doc.mime_type)) {
    await ctx.reply(`File type not allowed. Allowed: ${ALLOWED_TYPES.join(', ')}`)
    return
  }

  // 檢查大小
  if ((doc.file_size ?? 0) > MAX_SIZE) {
    await ctx.reply(`File too large (max ${MAX_SIZE / 1024 / 1024} MB)`)
    return
  }

  // 文件有效
  await ctx.reply('File accepted')
})
```

### 文件轉換示例

```typescript
// 下載文件並轉換
bot.on('message:photo', async (ctx) => {
  const file = await ctx.getFile()

  // 使用 files 插件時
  // const path = await file.download();

  // 或手動下載
  const downloadUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`
  const response = await fetch(downloadUrl)
  const buffer = await response.arrayBuffer()

  // 處理 buffer（e.g., 調整大小、轉換格式等）

  // 重新上傳
  await ctx.replyWithPhoto(new InputFile(Buffer.from(buffer)), { caption: 'Processed photo' })
})
```

### 批量下載

```typescript
import { createWriteStream } from 'fs'
import { mkdir } from 'fs/promises'

async function downloadFile(fileId: string, outputPath: string): Promise<void> {
  const file = await bot.api.getFile(fileId)
  const downloadUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`

  const response = await fetch(downloadUrl)
  const buffer = await response.arrayBuffer()

  // 確保目錄存在
  await mkdir('downloads', { recursive: true })

  // 寫入文件
  const stream = createWriteStream(outputPath)
  stream.write(Buffer.from(buffer))
  stream.end()
}

bot.command('backup', async (ctx) => {
  const files = [
    { fileId: '...', name: 'photo1.jpg' },
    { fileId: '...', name: 'photo2.jpg' },
  ]

  for (const file of files) {
    try {
      await downloadFile(file.fileId, `downloads/${file.name}`)
      console.log(`Downloaded: ${file.name}`)
    } catch (error) {
      console.error(`Failed to download ${file.name}:`, error)
    }
  }

  await ctx.reply('Backup complete')
})
```
