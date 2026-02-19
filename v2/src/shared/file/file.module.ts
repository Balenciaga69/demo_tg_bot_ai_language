import { Module } from '@nestjs/common'
import { FileService } from './file.service'
import { SharedRedisModule } from '../redis/redis.module'
@Module({
  imports: [SharedRedisModule],
  providers: [FileService],
  exports: [FileService],
})
export class FileModule {}
