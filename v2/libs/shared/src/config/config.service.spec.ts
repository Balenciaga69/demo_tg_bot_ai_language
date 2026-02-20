import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService as NestConfigService } from '@nestjs/config'
import { SharedConfigService } from './config.service'
describe('ConfigService', () => {
  let service: SharedConfigService
  let configService: NestConfigService
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SharedConfigService,
        {
          provide: NestConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              const mockEnv: Record<string, string> = {
                TELEGRAM_BOT_TOKEN: 'test-token',
                REDIS_HOST: 'localhost',
                REDIS_PORT: '6379',
              }
              return mockEnv[key] ?? null
            }),
          },
        },
      ],
    }).compile()
    service = module.get<SharedConfigService>(SharedConfigService)
    configService = module.get<NestConfigService>(NestConfigService)
  })
  it('should be defined', () => {
    expect(service).toBeDefined()
  })
  it('should get string config', () => {
    const token = service.getOrThrow('TELEGRAM_BOT_TOKEN')
    expect(token).toBe('test-token')
  })
  it('should return value from NestConfigService', () => {
    const port = service.getOrThrow('REDIS_PORT')
    expect(port).toBe('6379')
  })
})
