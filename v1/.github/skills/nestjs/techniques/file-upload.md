# NestJS 文件上傳

使用 Multer 中間件處理文件上傳。

---

## 安裝

```bash
npm install --save @nestjs/platform-express
npm install -D @types/multer
```

---

## 基本文件上傳

### 單文件上傳

```typescript
import { Controller, Post, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';

@Controller('upload')
export class UploadController {
  @Post('single')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    console.log(file);
    return {
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
    };
  }
}
```

### 多文件上傳

```typescript
@Post('multiple')
@UseInterceptors(FilesInterceptor('files', 10))  // 最多 10 個文件
uploadFiles(@UploadedFiles() files: Array<Express.Multer.File>) {
  return files.map(file => ({
    filename: file.filename,
    size: file.size,
  }));
}
```

### 多個不同欄位

```typescript
@Post('multi-field')
@UseInterceptors(
  FileFieldsInterceptor([
    { name: 'avatar', maxCount: 1 },
    { name: 'background', maxCount: 1 },
  ]),
)
uploadMultiple(
  @UploadedFiles() files: {
    avatar?: Express.Multer.File[];
    background?: Express.Multer.File[];
  },
) {
  return files;
}
```

---

## 文件驗證

### 檔案大小驗證

```bash
npm install --save-dev @nestjs/common
```

```typescript
import { ParseFilePipe, MaxFileSizeValidator, FileTypeValidator } from '@nestjs/common';

@Post('upload')
@UseInterceptors(FileInterceptor('file'))
uploadFile(
  @UploadedFile(
    new ParseFilePipe({
      validators: [
        new MaxFileSizeValidator({ maxSize: 1000000 }),  // 1MB
        new FileTypeValidator({ fileType: 'image/jpeg' }),
      ],
    }),
  )
  file: Express.Multer.File,
) {
  return { success: true };
}
```

### 使用 Builder

```typescript
@UploadedFile(
  new ParseFilePipeBuilder()
    .addFileTypeValidator({
      fileType: 'image/jpeg',
    })
    .addMaxSizeValidator({
      maxSize: 1000000,
    })
    .build({
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      fileIsRequired: false,  // 文件可選
    }),
)
file: Express.Multer.File,
```

---

## 自訂文件驗證

```typescript
import { FileValidator } from '@nestjs/common';

export class CustomFileValidator extends FileValidator {
  isValid(file?: Express.Multer.File): boolean {
    return file && file.size < 1000000;  // 1MB 限制
  }

  buildErrorMessage(): string {
    return 'File size must be less than 1MB';
  }
}

// 使用
@UploadedFile(
  new ParseFilePipe({
    validators: [new CustomFileValidator()],
  }),
)
file: Express.Multer.File,
```

---

## Multer 配置

### 導入 MulterModule

```typescript
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 5242880,  // 5MB
      },
    }),
  ],
})
export class AppModule {}
```

### 異步配置

```typescript
MulterModule.registerAsync({
  useFactory: () => ({
    dest: './upload',
    limits: { fileSize: 1000000 },
  }),
});
```

---

## 提供靜態文件服務

```typescript
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(join(__dirname, '..', 'uploads'));
  await app.listen(3000);
}
```

---

## 參考資源

- https://docs.nestjs.com/techniques/file-upload
- https://github.com/expressjs/multer
