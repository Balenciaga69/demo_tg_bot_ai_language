import { Injectable } from '@nestjs/common'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { v4 as uuid } from 'uuid'
@Injectable()
export class FileService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads', 'audio')
  async init(): Promise<void> {
    await mkdir(this.uploadDir, { recursive: true })
  }
  // 保存 Telegram 下載的 Buffer
  async saveAudio(buffer: Buffer, userId: string): Promise<string> {
    const filename = `${userId}_${uuid()}.ogg`
    const filepath = path.join(this.uploadDir, filename)
    await writeFile(filepath, buffer)
    return filename
  }
  // 讀取文件
  async getAudio(filename: string): Promise<Buffer> {
    return readFile(path.join(this.uploadDir, filename))
  }
  // 刪除文件
  async deleteAudio(filename: string): Promise<void> {
    await unlink(path.join(this.uploadDir, filename))
  }
}
