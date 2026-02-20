/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable unicorn/no-useless-undefined */
/* eslint-disable max-lines-per-function */
// toHaveBeenCalledWith: 用來斷言 mock 函式是否以指定參數被呼叫（Jest matcher）
// mockImplementation: 給予 mock 函式自訂實作或回傳值以模擬行為
// createTestingModule: 建立 Nest 測試模組並注入 provider，方便在測試中取得服務
import { Test, TestingModule } from '@nestjs/testing'
import { Bot } from 'grammy'
import { TelegramBotService } from './telegram-bot.service'
describe('TelegramBotService 服務', () => {
  let service: TelegramBotService
  let mockBot: jest.Mocked<Bot>
  beforeEach(async () => {
    mockBot = {
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      use: jest.fn(),
      command: jest.fn(),
    } as unknown as jest.Mocked<Bot>
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramBotService,
        {
          provide: Bot,
          useValue: mockBot,
        },
      ],
    }).compile()
    service = module.get<TelegramBotService>(TelegramBotService)
  })
  afterEach(() => {
    jest.clearAllMocks()
  })
  describe('onModuleInit（模組初始化）', () => {
    it('應註冊指令、套用節流中介軟體並啟動 bot', async () => {
      await service.onModuleInit()
      expect(mockBot.command).toHaveBeenCalledWith('start', expect.any(Function))
      expect(mockBot.use).toHaveBeenCalled()
      expect(mockBot.start).toHaveBeenCalled()
    })
    it('應以正確順序呼叫方法', async () => {
      const callOrder: string[] = []
      mockBot.command.mockImplementation(() => {
        callOrder.push('command')
        return mockBot
      })
      mockBot.use.mockImplementation(() => {
        callOrder.push('use')
        return mockBot
      })
      mockBot.start.mockImplementation(() => {
        callOrder.push('start')
        return Promise.resolve()
      })
      await service.onModuleInit()
      expect(callOrder).toEqual(['command', 'use', 'start'])
    })
  })
  describe('onModuleDestroy（模組銷毀）', () => {
    it('應停止 bot', async () => {
      await service.onModuleDestroy()
      expect(mockBot.stop).toHaveBeenCalled()
    })
  })
  describe('applyThrottleMiddleware（套用節流中介軟體）', () => {
    it('應以正確設定套用速率限制中介軟體', async () => {
      await service.onModuleInit()
      expect(mockBot.use).toHaveBeenCalledWith(expect.any(Function))
    })
  })
  describe('registerCommands（註冊指令）', () => {
    it('應註冊 /start 指令', async () => {
      await service.onModuleInit()
      expect(mockBot.command).toHaveBeenCalledWith('start', expect.any(Function))
    })
  })
})
