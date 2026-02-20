/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable unicorn/no-useless-undefined */
/* eslint-disable max-lines-per-function */
import { Test, TestingModule } from '@nestjs/testing'
import { ClientProxy } from '@nestjs/microservices'
import { of } from 'rxjs'
import { Bot } from 'grammy'
import { STT_SERVICE_TOKEN } from '@shared/contracts'
import { TelegramBotService } from './telegram-bot.service'

describe('TelegramBotService 服務 (telegram-bot)', () => {
  let service: TelegramBotService
  let mockBot: jest.Mocked<Bot>
  let mockSttClient: jest.Mocked<ClientProxy>

  beforeEach(async () => {
    mockBot = {
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      use: jest.fn(),
      command: jest.fn(),
      on: jest.fn(),
      token: 'test-token',
    } as unknown as jest.Mocked<Bot>

    mockSttClient = {
      send: jest.fn().mockReturnValue(of({ success: true, text: '測試轉錄結果' })),
      emit: jest.fn(),
    } as unknown as jest.Mocked<ClientProxy>

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramBotService,
        { provide: Bot, useValue: mockBot },
        { provide: STT_SERVICE_TOKEN, useValue: mockSttClient },
      ],
    }).compile()

    service = module.get<TelegramBotService>(TelegramBotService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('onModuleInit（模組初始化）', () => {
    it('應註冊指令、語音處理器、套用節流中介並啟動 bot', async () => {
      await service.onModuleInit()
      expect(mockBot.command).toHaveBeenCalledWith('start', expect.any(Function))
      expect(mockBot.on).toHaveBeenCalledWith(['message:voice', 'message:audio'], expect.any(Function))
      expect(mockBot.use).toHaveBeenCalled()
      expect(mockBot.start).toHaveBeenCalled()
    })
  })

  describe('onModuleDestroy（模組銷毀）', () => {
    it('應停止 bot', async () => {
      await service.onModuleDestroy()
      expect(mockBot.stop).toHaveBeenCalled()
    })
  })
})
