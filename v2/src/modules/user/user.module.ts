import { Module } from '@nestjs/common'
import {
  I_REGISTRATION_REQUEST_STORE,
  I_USER_STATE_STORE,
  I_USAGE_LOG_STORE,
  RedisRegistrationRequestStore,
  RedisUserStateStore,
  RedisUsageLogStore,
} from './stores'
import { UserAdminController } from './controllers'
@Module({
  providers: [
    {
      provide: I_USER_STATE_STORE,
      useClass: RedisUserStateStore, // 未來可根據 env 切換為 RedisUserStateStore
    },
    {
      provide: I_REGISTRATION_REQUEST_STORE,
      useClass: RedisRegistrationRequestStore, // 未來可根據 env 切換為 RedisRegistrationRequestStore
    },
    {
      provide: I_USAGE_LOG_STORE,
      useClass: RedisUsageLogStore,
    },
  ],
  controllers: [UserAdminController],
  exports: [I_USER_STATE_STORE, I_REGISTRATION_REQUEST_STORE, I_USAGE_LOG_STORE],
})
export class UserModule {}
