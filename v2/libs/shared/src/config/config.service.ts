import { Injectable } from '@nestjs/common'
import { ConfigService as NestConfigService } from '@nestjs/config'
import { EnvironmentKey } from './environment.keys'
@Injectable()
export class SharedConfigService {
  constructor(private nestConfig: NestConfigService) {}
  getOrThrow<T>(key: EnvironmentKey): Exclude<T, undefined> {
    return this.nestConfig.getOrThrow<T>(key)
  }
}
