import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { ConfigModule } from '@nestjs/config'
import { OllamaService } from './ollama.service'
@Module({
  imports: [HttpModule, ConfigModule],
  providers: [OllamaService],
  exports: [OllamaService],
})
export class OllamaModule {}
