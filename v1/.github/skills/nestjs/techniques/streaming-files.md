# NestJS 文件流

使用 StreamableFile 發送大文件和流式內容。

---

## 安裝

```bash
npm install --save @nestjs/common
# StreamableFile 內置於 @nestjs/common
```

---

## 基本文件下載

### 簡單文件服務

```typescript
import { Controller, Get, Res } from '@nestjs/common';
import { createReadStream } from 'fs';
import { join } from 'path';
import { Response } from 'express';

@Controller('files')
export class FilesController {
  @Get('download')
  downloadFile(@Res() res: Response) {
    const file = createReadStream(join(__dirname, '..', 'data', 'file.txt'));
    
    res.set({
      'Content-Type': 'text/plain',
      'Content-Disposition': 'attachment; filename="file.txt"',
    });
    
    return res.send(file);
  }
}
```

---

## StreamableFile 返回

### 直接返回 StreamableFile

```typescript
import { StreamableFile } from '@nestjs/common';

@Get('stream')
getStream(): StreamableFile {
  const file = createReadStream(join(__dirname, '..', 'data', 'file.txt'));
  return new StreamableFile(file);
}
```

### 設置 Response 頭

```typescript
@Get('download-pdf')
downloadPdf(@Res({ passthrough: true }) res: Response): StreamableFile {
  const file = createReadStream(join(__dirname, '..', 'data', 'document.pdf'));
  
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': 'attachment; filename="document.pdf"',
  });
  
  return new StreamableFile(file);
}
```

---

## 各種文件類型

### 圖片下載

```typescript
@Get('image/:id')
downloadImage(@Param('id') id: string): StreamableFile {
  const file = createReadStream(
    join(__dirname, '..', 'images', `${id}.jpg`)
  );
  
  return new StreamableFile(file, {
    type: 'image/jpeg',
    disposition: 'inline',  // 在瀏覽器中顯示
  });
}
```

### ZIP 包下載

```typescript
@Get('export')
exportData(): StreamableFile {
  const file = createReadStream(
    join(__dirname, '..', 'exports', 'data.zip')
  );
  
  return new StreamableFile(file, {
    type: 'application/zip',
    disposition: 'attachment; filename="export.zip"',
  });
}
```

### 視頻流

```typescript
@Get('video/:id')
streamVideo(@Param('id') id: string, @Req() req: Request): StreamableFile {
  const file = createReadStream(
    join(__dirname, '..', 'videos', `${id}.mp4`)
  );
  
  return new StreamableFile(file, {
    type: 'video/mp4',
  });
}
```

---

## 範圍請求（部分文件下載）

```typescript
import { stat } from 'fs/promises';

@Get('large-file/:id')
async streamLargeFile(
  @Param('id') id: string,
  @Req() req: Request,
  @Res({ passthrough: true }) res: Response,
): Promise<StreamableFile> {
  const filePath = join(__dirname, '..', 'files', `${id}.bin`);
  const fileStats = await stat(filePath);
  const fileSize = fileStats.size;

  // 檢查範圍請求
  const range = req.headers.range;
  
  if (range) {
    const [start, end] = range.replace(/bytes=/, '').split('-');
    const startPos = parseInt(start, 10);
    const endPos = end ? parseInt(end, 10) : fileSize - 1;
    const chunksize = endPos - startPos + 1;

    res.statusCode = 206;  // Partial Content
    res.setHeader('Content-Range', `bytes ${startPos}-${endPos}/${fileSize}`);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Length', chunksize);
    res.setHeader('Content-Type', 'application/octet-stream');

    return new StreamableFile(
      createReadStream(filePath, { start: startPos, end: endPos }),
    );
  }

  res.setHeader('Content-Length', fileSize);
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', 'application/octet-stream');

  const file = createReadStream(filePath);
  return new StreamableFile(file);
}
```

---

## 動態內容流

### 生成 CSV 流

```typescript
import { Readable } from 'stream';

@Get('export-csv')
exportCsv(@Res({ passthrough: true }) res: Response): StreamableFile {
  const headers = ['id', 'name', 'email'];
  const data = [
    [1, 'John', 'john@example.com'],
    [2, 'Jane', 'jane@example.com'],
  ];

  const readable = Readable.from([
    headers.join(',') + '\n',
    ...data.map(row => row.join(',') + '\n'),
  ]);

  res.set({
    'Content-Type': 'text/csv',
    'Content-Disposition': 'attachment; filename="data.csv"',
  });

  return new StreamableFile(readable);
}
```

### 流式 JSON 數據

```typescript
import { Readable } from 'stream';

@Get('stream-json')
streamJson(): StreamableFile {
  const items = Array.from({ length: 1000 }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
  }));

  const readable = Readable.from([
    '[\n',
    ...items.map((item, i) => 
      JSON.stringify(item) + (i < items.length - 1 ? ',\n' : '\n')
    ),
    ']\n',
  ]);

  return new StreamableFile(readable, {
    type: 'application/json',
  });
}
```

---

## 錯誤處理

```typescript
@Get('safe-download/:id')
async safeDownload(
  @Param('id') id: string,
): Promise<StreamableFile> {
  try {
    const filePath = join(__dirname, '..', 'data', `${id}.txt`);
    
    // 檢查文件是否存在
    await access(filePath);
    
    const file = createReadStream(filePath);
    return new StreamableFile(file);
  } catch (error) {
    throw new NotFoundException('File not found');
  }
}
```

---

## Fastify 支持

```typescript
@Get('fastify-stream')
getStreamFastify(): StreamableFile {
  const file = createReadStream(join(__dirname, '..', 'data', 'file.txt'));
  return new StreamableFile(file);
}
```

---

## 參考資源

- https://docs.nestjs.com/techniques/streaming-files
- https://nodejs.org/api/stream.html
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Range
